import type { CSSProperties } from "react";
import type { Chess } from "chess.js";

const WHITE_ARROW_COLOR = "#e91e63";
/** Cover knight gold/orange — reads clear on lavender dark squares, distinct from white magenta. */
const BLACK_ARROW_COLOR = "#ff8a3d";

const WHITE_FROM_TINT = "rgba(233, 30, 99, 0.18)";
const WHITE_TO_TINT = "rgba(233, 30, 99, 0.32)";
const WHITE_FROM_RING = "inset 0 0 0 3px rgba(233, 30, 99, 0.55)";
const WHITE_TO_RING = "inset 0 0 0 3px #e91e63";

const BLACK_FROM_TINT = "rgba(255, 138, 61, 0.22)";
const BLACK_TO_TINT = "rgba(255, 138, 61, 0.38)";
const BLACK_FROM_RING = "inset 0 0 0 3px rgba(255, 138, 61, 0.65)";
const BLACK_TO_RING = "inset 0 0 0 3px #ff8a3d";

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
