/** One engine principal variation, normalized to White's perspective. */
export type EnginePvLine = {
  cp: number | null;
  mate: number | null;
  pvUci: string[];
};

/** Eval normalized to White's perspective (+ = White better). */
export type PositionEval = {
  cp: number | null;
  mate: number | null;
  depth: number;
  bestMoveUci: string | null;
  pvUci: string[];
  lines: EnginePvLine[];
};

export function hasDisplayableEval(evalData: PositionEval | null | undefined): boolean {
  if (!evalData) return false;
  if (evalData.lines.some((line) => (line?.pvUci.length ?? 0) > 0)) return true;
  if (evalData.pvUci.length > 0) return true;
  return evalData.bestMoveUci !== null;
}

export function normalizeEvalFromSideToMove(
  cp: number | null,
  mate: number | null,
  sideToMove: "w" | "b",
): Pick<PositionEval, "cp" | "mate"> {
  if (sideToMove === "w") {
    return { cp, mate };
  }
  return {
    cp: cp === null ? null : -cp,
    mate: mate === null ? null : mate === 0 ? 0 : -mate,
  };
}

export function formatLineEval(cp: number | null, mate: number | null): string {
  return formatEval({ cp, mate, depth: 0, bestMoveUci: null, pvUci: [], lines: [] });
}

export function formatEval(evalData: PositionEval | null | undefined): string {
  if (!evalData) return "—";

  if (evalData.mate !== null) {
    if (evalData.mate === 0) return "0.0";
    if (evalData.mate > 0) return `+#${evalData.mate}`;
    return `-#${Math.abs(evalData.mate)}`;
  }

  if (evalData.cp === null) return "—";

  const pawns = evalData.cp / 100;
  const sign = pawns > 0 ? "+" : "";
  if (Math.abs(pawns) >= 10) return `${sign}${pawns.toFixed(1)}`;
  return `${sign}${pawns.toFixed(2)}`;
}

export function evalBarPercent(evalData: PositionEval | null | undefined): number {
  if (!evalData) return 50;

  if (evalData.mate !== null) {
    if (evalData.mate === 0) return 50;
    return evalData.mate > 0 ? 100 : 0;
  }

  if (evalData.cp === null) return 50;

  const clamped = Math.max(-800, Math.min(800, evalData.cp));
  return 50 + (clamped / 800) * 50;
}
