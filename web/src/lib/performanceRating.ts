import { Chess } from "chess.js";
import type { PositionEval } from "./formatEval";
import type { AnnotationNode } from "../types";
import { buildPositionAtPly } from "./chess.ts";

/** Default Lucas Chess analysis thresholds (lucaschessR6 Configuration.py). */
export const LUCAS_EVAL = {
  limitScore: 2000,
  curveDegree: 30,
  difmateInaccuracy: 3,
  difmateMistake: 12,
  difmateBlunder: 20,
  mateHuman: 15,
  blunder: 15.5,
  mistake: 7.5,
  inaccuracy: 3.3,
  maxElo: 3300,
  minElo: 200,
  eloBlunderFactor: 12,
  eloMistakeFactor: 6,
  eloInaccuracyFactor: 2,
} as const;

export type SidePerformance = {
  elo: number | null;
  acpl: number | null;
  moves: number;
};

export type GamePerformance = {
  white: SidePerformance;
  black: SidePerformance;
};

export type MovePerformanceResult = {
  cpLoss: number;
  elo: number;
  weight: number;
};

/** Engine score for one candidate move from the mover's perspective (mate 0 = none). */
export type MoveScore = {
  cp: number;
  mate: number;
};

export function hasMoveAlternatives(fen: string): boolean {
  const chess = new Chess(fen);
  return chess.moves().length > 1;
}

/** Lichess win-probability curve used by Lucas Chess (AnalysisEval._lv). */
function lv(cp: number, factor = LUCAS_EVAL.curveDegree): number {
  const isNeg = cp < 0;
  const absCp = isNeg ? -cp : cp;

  const base = (xcp: number) => 200 / (1 + Math.exp((-factor * xcp) / 10_000)) - 100;
  const xr = Math.min(Math.max((base(absCp) * 50) / base(LUCAS_EVAL.limitScore), 0), 50);
  return 50 + (isNeg ? -xr : xr);
}

function lvDif(cpBest: number, cpPlayed: number): number {
  return lv(cpBest) - lv(cpPlayed);
}

export function centipawnsAbs(score: MoveScore): number {
  if (score.mate !== 0) {
    if (score.mate < 0) {
      return -30_000 - (score.mate + 1) * 10;
    }
    return 30_000 - (score.mate - 1) * 10;
  }
  return score.cp;
}

/** Convert a post-move eval to the mover's candidate score (Lucas rm.puntos / rm.mate). */
export function moveScoreFromAfter(after: PositionEval, side: "white" | "black"): MoveScore {
  if (after.mate !== null && after.mate !== 0) {
    return { cp: 0, mate: side === "white" ? after.mate : -after.mate };
  }
  const cp = cpValueWhitePerspective(after);
  return { cp: side === "white" ? cp : -cp, mate: 0 };
}

export function evaluateDif(best: MoveScore, played: MoveScore): number {
  const c = LUCAS_EVAL;

  if (best.mate === 0 && played.mate === 0) {
    return lvDif(best.cp, played.cp);
  }

  if (played.mate === 0) {
    let xadd: number;
    if (best.mate > c.mateHuman) {
      xadd = c.inaccuracy;
    } else {
      const difMate = c.mateHuman - best.mate;
      if (difMate >= c.difmateBlunder) xadd = c.blunder;
      else if (difMate >= c.difmateMistake) xadd = c.mistake;
      else if (difMate >= c.difmateInaccuracy) xadd = c.inaccuracy;
      else xadd = 0;
    }
    return lvDif(c.limitScore, played.cp) + xadd;
  }

  if (best.mate === 0 && played.mate < 0) {
    return Math.max(lvDif(centipawnsAbs(best), centipawnsAbs(played)), c.mistake);
  }

  const difMate = Math.abs(best.mate - played.mate);
  if (difMate >= c.difmateBlunder) return c.blunder;
  if (difMate >= c.difmateMistake) return c.mistake;
  if (difMate >= c.difmateInaccuracy) return c.inaccuracy;
  return 0;
}

export type MoveQuality = "none" | "inaccuracy" | "mistake" | "blunder";

export function classifyMoveQuality(dif: number): MoveQuality {
  const c = LUCAS_EVAL;
  if (dif >= c.blunder) return "blunder";
  if (dif >= c.mistake) return "mistake";
  if (dif >= c.inaccuracy) return "inaccuracy";
  return "none";
}

/** Per-move Lucas Chess Elo (AnalysisEval.elo). */
export function lucasMoveElo(dif: number): number {
  const c = LUCAS_EVAL;
  const mx = c.maxElo;
  const mn = c.minElo;
  const bl2 = c.blunder * 1.5;

  if (dif > bl2) return mn;
  if (dif === 0) return mx;

  let cappedMx = mx;
  if (dif >= c.blunder) cappedMx *= 0.1;
  else if (dif >= c.mistake) cappedMx *= 0.3;
  else if (dif >= c.inaccuracy) cappedMx *= 0.6;

  const range = Math.max(cappedMx - mn, 0);
  return Math.floor(((bl2 - dif / 10) * range) / bl2 + mn);
}

export function lucasEloWeight(quality: MoveQuality): number {
  const c = LUCAS_EVAL;
  if (quality === "blunder") return c.eloBlunderFactor;
  if (quality === "mistake") return c.eloMistakeFactor;
  if (quality === "inaccuracy") return c.eloInaccuracyFactor;
  return 1;
}

export function moveLucasPerformance(
  best: MoveScore,
  played: MoveScore,
): Pick<MovePerformanceResult, "elo" | "weight"> {
  const dif = evaluateDif(best, played);
  const quality = classifyMoveQuality(dif);
  return { elo: lucasMoveElo(dif), weight: lucasEloWeight(quality) };
}

export function weightedLucasElo(moves: MovePerformanceResult[]): number | null {
  if (!moves.length) return null;
  const sumElo = moves.reduce((total, move) => total + move.elo * move.weight, 0);
  const sumWeight = moves.reduce((total, move) => total + move.weight, 0);
  return sumWeight ? Math.round(sumElo / sumWeight) : null;
}

export type EloSparkPoint = { ply: number; elo: number };

export type EloSparklines = {
  white: EloSparkPoint[];
  black: EloSparkPoint[];
};

/** Running weighted Lucas Elo after each counted move (for sparkline charts). */
export function buildEloSparklines(
  movePlies: number[],
  resultsByPly: Map<number, MovePerformanceResult>,
): EloSparklines {
  const white: EloSparkPoint[] = [];
  const black: EloSparkPoint[] = [];
  const whiteMoves: MovePerformanceResult[] = [];
  const blackMoves: MovePerformanceResult[] = [];

  for (const movePly of movePlies) {
    const result = resultsByPly.get(movePly);
    if (!result) continue;

    if (sideForPly(movePly) === "white") {
      whiteMoves.push(result);
      const elo = weightedLucasElo(whiteMoves);
      if (elo !== null) white.push({ ply: movePly, elo });
    } else {
      blackMoves.push(result);
      const elo = weightedLucasElo(blackMoves);
      if (elo !== null) black.push({ ply: movePly, elo });
    }
  }

  return { white, black };
}

/** Map mate scores to a cp-like scale so comparisons work in won/lost positions. */
export function cpValueWhitePerspective(evalData: PositionEval): number {
  if (evalData.mate !== null) {
    if (evalData.mate === 0) return 0;
    const sign = evalData.mate > 0 ? 1 : -1;
    return sign * (10_000 - Math.min(Math.abs(evalData.mate), 50) * 200);
  }
  return evalData.cp ?? 0;
}

export function sanToUci(fen: string, san: string): string | null {
  const chess = new Chess(fen);
  try {
    const move = chess.move(san);
    if (!move) return null;
    return `${move.from}${move.to}${move.promotion ?? ""}`;
  } catch {
    return null;
  }
}

export function applyUci(fen: string, uci: string): string | null {
  const chess = new Chess(fen);
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci[4] as "q" | "r" | "b" | "n" | undefined;
  try {
    const move = chess.move({ from, to, promotion });
    return move ? chess.fen() : null;
  } catch {
    return null;
  }
}

export function pickBestMoveUci(evalData: PositionEval): string | null {
  if (evalData.bestMoveUci) return evalData.bestMoveUci;
  if (evalData.pvUci[0]) return evalData.pvUci[0];
  return evalData.lines[0]?.pvUci[0] ?? null;
}

export function isTopEngineMove(evalData: PositionEval, playedUci: string): boolean {
  return pickBestMoveUci(evalData) === playedUci;
}

/** True if played move appears anywhere in the engine's top PV lines (UI hint only). */
export function isPlayedBestMove(evalData: PositionEval, playedUci: string): boolean {
  if (isTopEngineMove(evalData, playedUci)) return true;
  return evalData.lines.some((line) => line.pvUci[0] === playedUci);
}

/**
 * Fallback: raw eval drop before vs after the played move (white POV).
 * Can over-penalize good moves because side-to-move changes between samples.
 */
export function cpLossFromEvalDrop(
  before: PositionEval,
  after: PositionEval,
  side: "white" | "black",
): number {
  const beforeCp = cpValueWhitePerspective(before);
  const afterCp = cpValueWhitePerspective(after);
  const raw = side === "white" ? beforeCp - afterCp : afterCp - beforeCp;
  return Math.max(0, Math.round(raw));
}

/**
 * Preferred: compare the position after the played move to the position after
 * Stockfish's best move. Both have the opponent on move, so tempo bias cancels.
 */
export function cpLossFromBestComparison(
  playedAfter: PositionEval,
  bestAfter: PositionEval,
  side: "white" | "black",
): number {
  const bestCp = cpValueWhitePerspective(bestAfter);
  const playedCp = cpValueWhitePerspective(playedAfter);
  const raw = side === "white" ? bestCp - playedCp : playedCp - bestCp;
  return Math.max(0, Math.round(raw));
}

export function performanceFromMoveResults(
  whiteMoves: MovePerformanceResult[],
  blackMoves: MovePerformanceResult[],
): GamePerformance {
  const whiteAcpl = average(whiteMoves.map((move) => move.cpLoss));
  const blackAcpl = average(blackMoves.map((move) => move.cpLoss));

  return {
    white: {
      moves: whiteMoves.length,
      acpl: whiteAcpl,
      elo: weightedLucasElo(whiteMoves),
    },
    black: {
      moves: blackMoves.length,
      acpl: blackAcpl,
      elo: weightedLucasElo(blackMoves),
    },
  };
}

/** Map batch-precomputed ratings onto the live performance display shape. */
export function gamePerformanceFromPrecomputed(elo: {
  white: number;
  black: number;
  whiteAcpl?: number;
  blackAcpl?: number;
}): GamePerformance {
  return {
    white: {
      elo: elo.white,
      acpl: elo.whiteAcpl ?? null,
      moves: 0,
    },
    black: {
      elo: elo.black,
      acpl: elo.blackAcpl ?? null,
      moves: 0,
    },
  };
}
export function collectMovePlies(nodes: AnnotationNode[], ply: number): number[] {
  return nodes
    .filter((node) => node.san && node.ply > 0 && node.ply <= ply)
    .map((node) => node.ply)
    .sort((a, b) => a - b);
}

export function sideForPly(ply: number): "white" | "black" {
  return ply % 2 === 1 ? "white" : "black";
}

export function moveEvalLoss(
  before: PositionEval,
  playedAfter: PositionEval,
  bestAfter: PositionEval | null,
  ply: number,
  playedUci: string | null,
): number {
  const side = sideForPly(ply);

  if (playedUci && isTopEngineMove(before, playedUci)) {
    return 0;
  }

  if (bestAfter) {
    return cpLossFromBestComparison(playedAfter, bestAfter, side);
  }

  return cpLossFromEvalDrop(before, playedAfter, side);
}

export function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function movePerformanceResult(
  before: PositionEval,
  playedAfter: PositionEval,
  bestAfter: PositionEval | null,
  ply: number,
  playedUci: string | null,
): MovePerformanceResult {
  const side = sideForPly(ply);
  const cpLoss = moveEvalLoss(before, playedAfter, bestAfter, ply, playedUci);

  if (playedUci && isTopEngineMove(before, playedUci)) {
    return { cpLoss: 0, elo: LUCAS_EVAL.maxElo, weight: 1 };
  }

  if (!bestAfter) {
    return { cpLoss, elo: LUCAS_EVAL.minElo, weight: 1 };
  }

  const bestScore = moveScoreFromAfter(bestAfter, side);
  const playedScore = moveScoreFromAfter(playedAfter, side);
  const lucas = moveLucasPerformance(bestScore, playedScore);
  return { cpLoss, ...lucas };
}

export async function computeMovePerformanceAtPly(
  nodes: AnnotationNode[],
  movePly: number,
  evalForFen: (fen: string) => Promise<PositionEval>,
): Promise<MovePerformanceResult | null> {
  const node = nodes.find((entry) => entry.ply === movePly);
  if (!node?.san) return null;

  const fenBefore = buildPositionAtPly(nodes, movePly - 1).fen();
  if (!hasMoveAlternatives(fenBefore)) return null;

  const fenAfter = buildPositionAtPly(nodes, movePly).fen();
  const playedUci = sanToUci(fenBefore, node.san);

  const beforeEval = await evalForFen(fenBefore);
  const bestUci = pickBestMoveUci(beforeEval);
  const playedAfterEval = await evalForFen(fenAfter);

  let bestAfterEval: PositionEval | null = null;
  if (bestUci) {
    const fenAfterBest = applyUci(fenBefore, bestUci);
    if (fenAfterBest) {
      bestAfterEval = await evalForFen(fenAfterBest);
    }
  }

  return movePerformanceResult(
    beforeEval,
    playedAfterEval,
    bestAfterEval,
    movePly,
    playedUci,
  );
}

export async function computeMoveLossAtPly(
  nodes: AnnotationNode[],
  movePly: number,
  evalForFen: (fen: string) => Promise<PositionEval>,
): Promise<number | null> {
  const result = await computeMovePerformanceAtPly(nodes, movePly, evalForFen);
  return result?.cpLoss ?? null;
}

export async function computeFullGamePerformance(
  nodes: AnnotationNode[],
  evalForFen: (fen: string) => Promise<PositionEval>,
): Promise<GamePerformance> {
  const movePlies = nodes
    .filter((node) => node.san && node.ply > 0)
    .map((node) => node.ply)
    .sort((a, b) => a - b);

  const whiteMoves: MovePerformanceResult[] = [];
  const blackMoves: MovePerformanceResult[] = [];

  for (const movePly of movePlies) {
    const result = await computeMovePerformanceAtPly(nodes, movePly, evalForFen);
    if (result === null) continue;
    if (sideForPly(movePly) === "white") whiteMoves.push(result);
    else blackMoves.push(result);
  }

  return performanceFromMoveResults(whiteMoves, blackMoves);
}
