import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  hasDisplayableEval,
  normalizeEvalFromSideToMove,
  type EnginePvLine,
  type PositionEval,
} from "../src/lib/formatEval.ts";

const require = createRequire(import.meta.url);
const loadEngine = require("stockfish/examples/loadEngine.js") as (
  enginePath: string,
) => StockfishEngine;

type StockfishEngine = {
  send: (cmd: string, onDone?: (output: string) => void, stream?: (line: string) => void) => void;
  quit: () => void;
};

const ANALYSIS_DEPTH = 14;
const MULTIPV = 3;

type ParsedInfo = {
  depth: number;
  multipv: number;
  cp: number | null;
  mate: number | null;
  pvUci: string[];
};

const cache = new Map<string, PositionEval>();
let engine: StockfishEngine | null = null;
let ready: Promise<void> | null = null;
let multipvConfigured = false;
let queue: Promise<void> = Promise.resolve();

function enginePath(): string {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(dir, "../node_modules/stockfish/src/stockfish-18-single.js");
}

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

  return {
    cp: primary.cp,
    mate: primary.mate,
    depth: parsed.depth,
    bestMoveUci: primary.pvUci[0] ?? existing.bestMoveUci,
    pvUci: primary.pvUci,
    lines: lines.slice(0, MULTIPV),
  };
}

function ensureEngine(): Promise<void> {
  if (ready) return ready;

  ready = new Promise((resolve, reject) => {
    try {
      engine = loadEngine(enginePath());
      engine.send("uci", () => {
        engine?.send("isready", () => resolve());
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Stockfish init failed"));
    }
  });

  return ready;
}

function sendCommand(cmd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!engine) {
      reject(new Error("Stockfish not initialized"));
      return;
    }
    engine.send(cmd, (output) => {
      if (output && output.includes("error")) {
        reject(new Error(output));
        return;
      }
      resolve();
    });
  });
}

function analyzeFenOnce(fen: string): Promise<PositionEval> {
  const cached = cache.get(fen);
  if (cached && cached.depth >= ANALYSIS_DEPTH && hasDisplayableEval(cached)) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    if (!engine) {
      reject(new Error("Stockfish not initialized"));
      return;
    }

    let depth = 0;
    if (!multipvConfigured) {
      engine.send(`setoption name MultiPV value ${MULTIPV}`);
      multipvConfigured = true;
    }

    engine.send(`position fen ${fen}`);

    engine.send(
      `go depth ${ANALYSIS_DEPTH}`,
      (output) => {
        const bestMoveUci = parseBestMove(output ?? "");
        const existing = cache.get(fen) ?? emptyAnalysis(depth);
        const finalResult: PositionEval = {
          ...existing,
          bestMoveUci: bestMoveUci ?? existing.bestMoveUci ?? existing.pvUci[0] ?? null,
        };
        cache.set(fen, finalResult);
        resolve(finalResult);
      },
      (line) => {
        const parsed = parseInfoLine(line);
        if (parsed && parsed.depth >= depth) {
          depth = parsed.depth;
          cache.set(fen, mergeAnalysis(fen, parsed));
        }
      },
    );
  });
}

export async function initStockfishNode(): Promise<void> {
  await ensureEngine();
}

export function analyzeFenNode(fen: string): Promise<PositionEval> {
  const task = queue.then(() => analyzeFenOnce(fen));
  queue = task.then(() => undefined, () => undefined);
  return task;
}

export async function quitStockfishNode(): Promise<void> {
  if (engine) {
    engine.quit();
    engine = null;
    ready = null;
    multipvConfigured = false;
  }
}
