import { Chess } from "chess.js";
import { useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import type { Chess as ChessType } from "chess.js";
import type { PieceDropHandlerArgs, SquareHandlerArgs } from "react-chessboard";
import { BOARD_THEME } from "../lib/boardTheme";
import { getLastMoveHighlight, MOVE_ARROW_OPTIONS } from "../lib/lastMoveHighlight";
import type { Lang } from "../lib/lang";
import { fill, ui } from "../lib/uiCopy";
import { BoardFrame } from "./BoardFrame";

const BOARD_ID = "chernov-board";

type Props = {
  chess: ChessType;
  orientation?: "white" | "black";
  previewLabel?: string | null;
  onClearPreview?: () => void;
  lang: Lang;
  /** Allow dragging / click-to-move to propose a reply. */
  allowMove?: boolean;
  /**
   * Called with from/to squares when the player tries a move.
   * Return true to keep the piece on the target (parent should update FEN);
   * false to snap back.
   */
  onPlayerMove?: (from: string, to: string) => boolean;
};

function sideToMove(fen: string): "w" | "b" {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

export function BoardPanel({
  chess,
  orientation = "white",
  previewLabel,
  onClearPreview,
  lang,
  allowMove = false,
  onPlayerMove,
}: Props) {
  const t = ui(lang);
  const highlight = useMemo(() => getLastMoveHighlight(chess), [chess]);
  const isPreview = Boolean(previewLabel);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const turn = sideToMove(chess.fen());

  const squareStyles = useMemo(() => {
    const styles = { ...highlight.squareStyles };
    if (selectedSquare) {
      styles[selectedSquare] = {
        ...(styles[selectedSquare] ?? {}),
        backgroundColor: "rgba(233, 30, 99, 0.35)",
      };
    }
    return styles;
  }, [highlight.squareStyles, selectedSquare]);

  function tryMove(from: string, to: string): boolean {
    if (!onPlayerMove || from === to) return false;
    const ok = onPlayerMove(from, to);
    setSelectedSquare(null);
    return ok;
  }

  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!allowMove || !onPlayerMove || !targetSquare) return false;
    return tryMove(sourceSquare, targetSquare);
  }

  function onSquareClick({ square, piece }: SquareHandlerArgs) {
    if (!allowMove || !onPlayerMove) return;
    if (!selectedSquare) {
      if (!piece) return;
      const color = piece.pieceType.startsWith("w") ? "w" : "b";
      if (color !== turn) return;
      setSelectedSquare(square);
      return;
    }
    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }
    if (piece) {
      const color = piece.pieceType.startsWith("w") ? "w" : "b";
      if (color === turn) {
        setSelectedSquare(square);
        return;
      }
    }
    tryMove(selectedSquare, square);
  }

  return (
    <div className={`board-panel${isPreview ? " is-preview" : ""}${allowMove ? " is-interactive" : ""}`}>
      {isPreview ? (
        <div className="board-preview-banner">
          <span>
            {fill(t.preview, { label: previewLabel ?? "" })}
          </span>
          {onClearPreview ? (
            <button type="button" className="text-btn" onClick={onClearPreview}>
              {t.backToPosition}
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
            allowDragging: allowMove,
            allowDrawingArrows: false,
            showNotation: false,
            showAnimations: false,
            arrows: highlight.arrows,
            arrowOptions: MOVE_ARROW_OPTIONS,
            squareStyles,
            onPieceDrop: allowMove ? onPieceDrop : undefined,
            onSquareClick: allowMove ? onSquareClick : undefined,
            canDragPiece: allowMove
              ? ({ piece }) => {
                  const color = piece.pieceType.startsWith("w") ? "w" : "b";
                  return color === turn;
                }
              : undefined,
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
