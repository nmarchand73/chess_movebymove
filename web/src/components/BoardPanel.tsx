import { Chess } from "chess.js";
import { useMemo } from "react";
import { Chessboard } from "react-chessboard";
import type { Chess as ChessType } from "chess.js";
import { BOARD_THEME } from "../lib/boardTheme";
import { getLastMoveHighlight, MOVE_ARROW_OPTIONS } from "../lib/lastMoveHighlight";
import { BoardFrame } from "./BoardFrame";

const BOARD_ID = "chernov-board";

type Props = {
  chess: ChessType;
  orientation?: "white" | "black";
  previewLabel?: string | null;
  onClearPreview?: () => void;
};

export function BoardPanel({ chess, orientation = "white", previewLabel, onClearPreview }: Props) {
  const highlight = useMemo(() => getLastMoveHighlight(chess), [chess]);
  const isPreview = Boolean(previewLabel);

  return (
    <div className={`board-panel${isPreview ? " is-preview" : ""}`}>
      {isPreview ? (
        <div className="board-preview-banner">
          <span>Preview: <strong>{previewLabel}</strong></span>
          {onClearPreview ? (
            <button type="button" className="text-btn" onClick={onClearPreview}>
              Back to position
            </button>
          ) : null}
        </div>
      ) : null}
      <BoardFrame orientation={orientation}>
        <Chessboard
          options={{
            id: BOARD_ID,
            position: chess.fen(),
            boardOrientation: orientation,
            allowDragging: false,
            allowDrawingArrows: false,
            showNotation: false,
            showAnimations: false,
            arrows: highlight.arrows,
            arrowOptions: MOVE_ARROW_OPTIONS,
            squareStyles: highlight.squareStyles,
            ...BOARD_THEME,
          }}
        />
      </BoardFrame>
    </div>
  );
}

export function chessFromFen(fen: string): Chess {
  return new Chess(fen);
}
