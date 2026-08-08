import type { Chess } from "chess.js";

export type ResolvedMoveSquares = {
  from: string;
  to: string;
  san: string;
};

/** Find the unique legal move matching SAN and return its from/to squares. */
export function squaresForSan(chess: Chess, san: string): ResolvedMoveSquares | null {
  const moves = chess.moves({ verbose: true });
  const match = moves.find((m) => m.san.toLowerCase() === san.toLowerCase());
  if (!match) return null;
  return { from: match.from, to: match.to, san: match.san };
}

/** True when a physical ChessUp move matches the expected lesson SAN. */
export function chessUpMoveMatchesSan(
  chess: Chess,
  expectedSan: string,
  move: { from: string; to: string },
): boolean {
  const expected = squaresForSan(chess, expectedSan);
  if (!expected) return false;
  return (
    expected.from === move.from.toLowerCase() &&
    expected.to === move.to.toLowerCase()
  );
}
