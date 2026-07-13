import type { CSSProperties } from "react";
import type { Chess } from "chess.js";

const WHITE_ARROW_COLOR = "#c45c1a";
const BLACK_ARROW_COLOR = "#2b5278";

const WHITE_FROM_TINT = "rgba(196, 92, 26, 0.18)";
const WHITE_TO_TINT = "rgba(196, 92, 26, 0.32)";
const WHITE_FROM_RING = "inset 0 0 0 3px rgba(196, 92, 26, 0.55)";
const WHITE_TO_RING = "inset 0 0 0 3px #c45c1a";

const BLACK_FROM_TINT = "rgba(43, 82, 120, 0.18)";
const BLACK_TO_TINT = "rgba(43, 82, 120, 0.32)";
const BLACK_FROM_RING = "inset 0 0 0 3px rgba(43, 82, 120, 0.55)";
const BLACK_TO_RING = "inset 0 0 0 3px #2b5278";

export function arrowColorForSide(color: "w" | "b"): string {
  return color === "w" ? WHITE_ARROW_COLOR : BLACK_ARROW_COLOR;
}

export type MoveHighlight = {
  arrows: { startSquare: string; endSquare: string; color: string }[];
  squareStyles: Record<string, CSSProperties>;
};

/** Square rings plus path arrow for every move. */
export function getLastMoveHighlight(chess: Chess): MoveHighlight {
  const last = chess.history({ verbose: true }).at(-1);
  if (!last) {
    return { arrows: [], squareStyles: {} };
  }

  const isWhite = last.color === "w";
  const fromTint = isWhite ? WHITE_FROM_TINT : BLACK_FROM_TINT;
  const toTint = isWhite ? WHITE_TO_TINT : BLACK_TO_TINT;
  const fromRing = isWhite ? WHITE_FROM_RING : BLACK_FROM_RING;
  const toRing = isWhite ? WHITE_TO_RING : BLACK_TO_RING;

  return {
    arrows: [
      {
        startSquare: last.from,
        endSquare: last.to,
        color: arrowColorForSide(last.color),
      },
    ],
    squareStyles: {
      [last.from]: {
        backgroundColor: fromTint,
        boxShadow: fromRing,
      },
      [last.to]: {
        backgroundColor: toTint,
        boxShadow: toRing,
      },
    },
  };
}

export const MOVE_ARROW_OPTIONS = {
  color: WHITE_ARROW_COLOR,
  secondaryColor: BLACK_ARROW_COLOR,
  tertiaryColor: WHITE_ARROW_COLOR,
  arrowLengthReducerDenominator: 8,
  sameTargetArrowLengthReducerDenominator: 6,
  arrowWidthDenominator: 10,
  activeArrowWidthMultiplier: 1,
  opacity: 0.58,
  activeOpacity: 0.58,
  arrowStartOffset: 0.35,
} as const;
