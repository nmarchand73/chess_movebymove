import { useEffect, useState } from "react";
import type { PositionEval } from "../lib/formatEval";
import type { AnnotationNode } from "../types";
import { analyzeFen } from "../lib/stockfishEngine";
import {
  buildEloSparklines,
  collectMovePlies,
  computeMovePerformanceAtPly,
  performanceFromMoveResults,
  sideForPly,
  type EloSparklines,
  type GamePerformance,
  type MovePerformanceResult,
} from "../lib/performanceRating";

export type PerformanceStatus = "idle" | "loading" | "ready" | "error";

const EMPTY: GamePerformance = {
  white: { elo: null, acpl: null, moves: 0 },
  black: { elo: null, acpl: null, moves: 0 },
};

const EMPTY_SPARKLINES: EloSparklines = { white: [], black: [] };

const PERFORMANCE_CACHE_VERSION = 2;

const moveResultCache = new Map<string, { version: number; moves: Map<number, MovePerformanceResult> }>();

function getLessonResultCache(lessonId: string): Map<number, MovePerformanceResult> {
  let entry = moveResultCache.get(lessonId);
  if (!entry || entry.version !== PERFORMANCE_CACHE_VERSION) {
    entry = { version: PERFORMANCE_CACHE_VERSION, moves: new Map() };
    moveResultCache.set(lessonId, entry);
  }
  return entry.moves;
}

/** Always run a full-depth search — performance rating must not reuse partial UI eval cache. */
async function evalForPerformance(fen: string): Promise<PositionEval> {
  return analyzeFen(fen, "normal", { skipCache: true });
}

function splitCachedResults(
  movePlies: number[],
  resultCache: Map<number, MovePerformanceResult>,
): {
  whiteMoves: MovePerformanceResult[];
  blackMoves: MovePerformanceResult[];
  pending: number[];
} {
  const whiteMoves: MovePerformanceResult[] = [];
  const blackMoves: MovePerformanceResult[] = [];
  const pending: number[] = [];

  for (const movePly of movePlies) {
    const result = resultCache.get(movePly);
    if (result === undefined) {
      pending.push(movePly);
      continue;
    }
    if (sideForPly(movePly) === "white") whiteMoves.push(result);
    else blackMoves.push(result);
  }

  return { whiteMoves, blackMoves, pending };
}

async function evalForFen(fen: string): Promise<PositionEval> {
  return evalForPerformance(fen);
}

export function usePerformanceRating(
  lessonId: string,
  nodes: AnnotationNode[],
  ply: number,
  enabled = true,
): { performance: GamePerformance; sparklines: EloSparklines; status: PerformanceStatus } {
  const [performance, setPerformance] = useState<GamePerformance>(EMPTY);
  const [sparklines, setSparklines] = useState<EloSparklines>(EMPTY_SPARKLINES);
  const [status, setStatus] = useState<PerformanceStatus>("idle");

  useEffect(() => {
    if (!enabled || ply <= 0 || !lessonId) {
      setPerformance(EMPTY);
      setSparklines(EMPTY_SPARKLINES);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    const movePlies = collectMovePlies(nodes, ply);
    const resultCache = getLessonResultCache(lessonId);
    const { whiteMoves, blackMoves, pending } = splitCachedResults(movePlies, resultCache);

    const publish = (white: MovePerformanceResult[], black: MovePerformanceResult[]) => {
      if (!cancelled) {
        setPerformance(performanceFromMoveResults(white, black));
        setSparklines(buildEloSparklines(movePlies, resultCache));
      }
    };

    publish(whiteMoves, blackMoves);
    setStatus(pending.length > 0 ? "loading" : "ready");

    if (pending.length === 0) {
      return;
    }

    async function analyzePending() {
      const white = [...whiteMoves];
      const black = [...blackMoves];

      try {
        for (const movePly of pending) {
          if (cancelled) return;

          const result = await computeMovePerformanceAtPly(nodes, movePly, evalForFen);
          if (result === null) continue;

          resultCache.set(movePly, result);
          if (sideForPly(movePly) === "white") white.push(result);
          else black.push(result);

          publish(white, black);
        }

        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void analyzePending();

    return () => {
      cancelled = true;
    };
  }, [lessonId, nodes, ply, enabled]);

  return { performance, sparklines, status };
}
