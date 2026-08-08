import type { Chess } from "chess.js";
import {
  assistanceColoursForHighlight,
  type ChessUpAssistanceColour,
} from "eboard-connect-js";

/** Map a book from→to onto ChessUp assistance colours (green target, red others). */
export function chessUpAssistanceForMove(
  chess: Chess,
  from: string,
  to: string,
): ChessUpAssistanceColour[] {
  const legal = chess.moves({ verbose: true }).map((m) => ({ from: m.from, to: m.to }));
  return assistanceColoursForHighlight(legal, { from, to });
}

export function chessUpAssistanceClear(): ChessUpAssistanceColour[] {
  return [];
}
