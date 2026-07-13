import {
  hasDisplayableEval,
  normalizeEvalFromSideToMove,
  type EnginePvLine,
  type PositionEval,
} from "./formatEval";

const ENGINE_URL = `${import.meta.env.BASE_URL}stockfish/stockfish.js`;
const ANALYSIS_DEPTH = 14;
const MULTIPV = 3;

export type SearchPriority = "high" | "normal";

type ParsedInfo = {
  depth: number;
  multipv: number;
  cp: number | null;
  mate: number | null;
  pvUci: string[];
};

type SearchSession = {
  id: number;
  fen: string;
  depth: number;
  resolve: (value: PositionEval) => void;
  reject: (error: Error) => void;
};

type SearchWaiter = {
  resolve: (value: PositionEval) => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
let workerReady: Promise<void> | null = null;
let uciOk = false;
let multipvConfigured = false;

let activeSearch: SearchSession | null = null;
let nextSearchId = 0;
let draining = false;

const cache = new Map<string, PositionEval>();
const waitersByFen = new Map<string, SearchWaiter[]>();
const queuedFens = new Set<string>();
const searchQueue: Array<{ fen: string; priority: SearchPriority }> = [];

function emptyAnalysis(depth = 0): PositionEval {
  return {
    cp: null,
    mate: null,
    depth,
    bestMoveUci: null,
    pvUci: [],
    lines: [],
  };
}

function sideToMoveFromFen(fen: string): "w" | "b" {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

function parseUciMove(token: string): boolean {
  return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(token);
}

function parseInfoLine(line: string): ParsedInfo | null {
  if (!line.startsWith("info ")) return null;

  const depthMatch = line.match(/\bdepth (\d+)\b/);
  if (!depthMatch) return null;

  const depth = Number.parseInt(depthMatch[1] ?? "0", 10);
  const multipvMatch = line.match(/\bmultipv (\d+)\b/);
  const multipv = multipvMatch ? Number.parseInt(multipvMatch[1] ?? "1", 10) : 1;
  const cpMatch = line.match(/\bscore cp (-?\d+)\b/);
  const mateMatch = line.match(/\bscore mate (-?\d+)\b/);
  const pvMatch = line.match(/\bpv (.+)$/);
  const pvUci = pvMatch
    ? pvMatch[1].trim().split(/\s+/).filter(parseUciMove)
    : [];

  if (cpMatch) {
    return {
      depth,
      multipv,
      cp: Number.parseInt(cpMatch[1] ?? "0", 10),
      mate: null,
      pvUci,
    };
  }

  if (mateMatch) {
    return {
      depth,
      multipv,
      cp: null,
      mate: Number.parseInt(mateMatch[1] ?? "0", 10),
      pvUci,
    };
  }

  return null;
}

function parseBestMove(line: string): string | null {
  const match = line.match(/^bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/);
  return match?.[1] ?? null;
}

function mergeAnalysis(fen: string, parsed: ParsedInfo): PositionEval {
  const existing = cache.get(fen) ?? emptyAnalysis();
  const sideToMove = sideToMoveFromFen(fen);
  const normalized = normalizeEvalFromSideToMove(parsed.cp, parsed.mate, sideToMove);

  const lines = [...existing.lines];
  const lineIndex = parsed.multipv - 1;
  const nextLine: EnginePvLine = {
    cp: normalized.cp,
    mate: normalized.mate,
    pvUci: parsed.pvUci,
  };

  if (lineIndex >= lines.length) {
    lines.length = lineIndex + 1;
  }
  lines[lineIndex] = nextLine;

  const primary = lines[0] ?? nextLine;
  const pvUci = primary.pvUci;

  return {
    cp: primary.cp,
    mate: primary.mate,
    depth: parsed.depth,
    bestMoveUci: pvUci[0] ?? existing.bestMoveUci,
    pvUci,
    lines: lines.slice(0, MULTIPV),
  };
}

function finishSearch(session: SearchSession, result: PositionEval): void {
  if (activeSearch?.id !== session.id) return;
  activeSearch = null;
  session.resolve(result);
}

function resolveWaiters(fen: string, result: PositionEval): void {
  const waiters = waitersByFen.get(fen);
  waitersByFen.delete(fen);
  waiters?.forEach((waiter) => waiter.resolve(result));
}

function rejectWaiters(fen: string, error: Error): void {
  const waiters = waitersByFen.get(fen);
  waitersByFen.delete(fen);
  waiters?.forEach((waiter) => waiter.reject(error));
}

function configureMultipv(): void {
  if (!worker || multipvConfigured) return;
  worker.postMessage(`setoption name MultiPV value ${MULTIPV}`);
  multipvConfigured = true;
}

function onWorkerMessage(line: string): void {
  if (line === "uciok") {
    uciOk = true;
    worker?.postMessage("isready");
    return;
  }

  if (line === "readyok") {
    configureMultipv();
    return;
  }

  const session = activeSearch;
  if (!session) return;

  const parsed = parseInfoLine(line);
  if (parsed && parsed.depth >= session.depth) {
    session.depth = parsed.depth;
    cache.set(session.fen, mergeAnalysis(session.fen, parsed));
  }

  if (line.startsWith("bestmove ")) {
    const bestMoveUci = parseBestMove(line);
    const existing = cache.get(session.fen) ?? emptyAnalysis(session.depth);
    const finalResult: PositionEval = {
      ...existing,
      bestMoveUci: bestMoveUci ?? existing.bestMoveUci ?? existing.pvUci[0] ?? null,
    };
    cache.set(session.fen, finalResult);
    finishSearch(session, finalResult);
  }
}

function ensureWorker(): Promise<void> {
  if (workerReady) return workerReady;

  workerReady = new Promise((resolve, reject) => {
    let settled = false;
    try {
      worker = new Worker(ENGINE_URL);
      worker.onmessage = (event) => {
        const line = typeof event.data === "string" ? event.data : String(event.data);
        onWorkerMessage(line);
        if (!settled && uciOk && line === "readyok") {
          settled = true;
          resolve();
        }
      };
      worker.onerror = () => {
        workerReady = null;
        reject(new Error("Stockfish worker failed to start"));
      };
      worker.postMessage("uci");
    } catch (error) {
      workerReady = null;
      reject(error instanceof Error ? error : new Error("Stockfish unavailable"));
    }
  });

  return workerReady;
}

function enqueueSearch(fen: string, priority: SearchPriority): void {
  if (queuedFens.has(fen)) {
    if (priority === "high") {
      const index = searchQueue.findIndex((entry) => entry.fen === fen);
      if (index > 0) {
        const [entry] = searchQueue.splice(index, 1);
        searchQueue.unshift(entry);
      }
    }
    return;
  }

  queuedFens.add(fen);
  if (priority === "high") {
    searchQueue.unshift({ fen, priority });
  } else {
    searchQueue.push({ fen, priority });
  }
}

function runSingleSearch(fen: string): Promise<PositionEval> {
  if (!worker) return Promise.reject(new Error("Stockfish unavailable"));

  configureMultipv();

  return new Promise((resolve, reject) => {
    nextSearchId += 1;
    activeSearch = {
      id: nextSearchId,
      fen,
      depth: 0,
      resolve,
      reject,
    };

    worker?.postMessage(`position fen ${fen}`);
    worker?.postMessage(`go depth ${ANALYSIS_DEPTH}`);
  });
}

async function drainQueue(): Promise<void> {
  if (draining) return;
  draining = true;

  try {
    await ensureWorker();

    while (searchQueue.length > 0) {
      const next = searchQueue.shift();
      if (!next) break;

      queuedFens.delete(next.fen);

      const cached = cache.get(next.fen);
      if (cached && cached.depth >= ANALYSIS_DEPTH && hasDisplayableEval(cached)) {
        resolveWaiters(next.fen, cached);
        continue;
      }

      try {
        const result = await runSingleSearch(next.fen);
        resolveWaiters(next.fen, result);
      } catch (error) {
        rejectWaiters(
          next.fen,
          error instanceof Error ? error : new Error("Stockfish analysis failed"),
        );
      }
    }
  } finally {
    draining = false;
    if (searchQueue.length > 0) {
      void drainQueue();
    }
  }
}

export async function analyzeFen(
  fen: string,
  priority: SearchPriority = "normal",
  options?: { skipCache?: boolean },
): Promise<PositionEval> {
  if (!options?.skipCache) {
    const cached = cache.get(fen);
    if (cached && cached.depth >= ANALYSIS_DEPTH && hasDisplayableEval(cached)) {
      return cached;
    }
  }

  return new Promise((resolve, reject) => {
    const waiters = waitersByFen.get(fen) ?? [];
    waiters.push({ resolve, reject });
    waitersByFen.set(fen, waiters);
    enqueueSearch(fen, priority);
    void drainQueue();
  });
}

export function getCachedEval(fen: string): PositionEval | undefined {
  return cache.get(fen);
}

export { ANALYSIS_DEPTH };
