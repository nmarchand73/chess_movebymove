import { Chess } from "chess.js";

export type PhysicalGuessMove = {
  san: string;
  from: string;
  to: string;
};

/**
 * If `boardPlacement` is exactly the result of one legal move from `fen`,
 * return that move. Incomplete lifts / illegal positions → null.
 */
export function legalMoveMatchingPlacement(
  fen: string,
  boardPlacement: string,
): PhysicalGuessMove | null {
  const chess = new Chess(fen);
  const currentPlacement = chess.fen().split(" ")[0];
  if (boardPlacement === currentPlacement) return null;

  let match: PhysicalGuessMove | null = null;
  for (const move of chess.moves({ verbose: true })) {
    const copy = new Chess(fen);
    const played = copy.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    });
    if (!played) continue;
    if (copy.fen().split(" ")[0] !== boardPlacement) continue;
    if (match) return null; // ambiguous — more than one legal move reaches this placement
    match = { san: played.san, from: played.from, to: played.to };
  }
  return match;
}
