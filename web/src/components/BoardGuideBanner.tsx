import { formatSanWithSymbols } from "../lib/sanSymbols";
import type { BoardGuide } from "../lib/boardGuide";

type Props = {
  guide: BoardGuide;
};

export function BoardGuideBanner({ guide }: Props) {
  switch (guide.kind) {
    case "waiting_signal":
      return (
        <div className="board-guide is-waiting" role="status">
          <strong>Waiting for the board</strong>
          <p>Make sure pieces are on the squares — the board will report the position shortly.</p>
        </div>
      );
    case "setup":
      return (
        <div className="board-guide is-setup" role="status">
          <strong>Match the screen position</strong>
          <p>
            {guide.mismatchCount === 0
              ? "Adjust the pieces on the board until they match the diagram."
              : `${guide.mismatchCount} square${guide.mismatchCount === 1 ? "" : "s"} differ — lit on your Chessnut. Fix those pieces to continue.`}
          </p>
        </div>
      );
    case "play_move":
      return (
        <div className="board-guide is-play" role="status">
          <strong>
            Play {formatSanWithSymbols(guide.san)}
            <span className="board-guide-side"> · {guide.side}</span>
          </strong>
          <p>
            Move the piece <span className="board-guide-sq">{guide.from}</span>
            {" → "}
            <span className="board-guide-sq">{guide.to}</span>
            {" "}(LEDs). When it matches, the lesson advances.
          </p>
        </div>
      );
    case "lesson_complete":
      return (
        <div className="board-guide is-done" role="status">
          <strong>End of the game</strong>
          <p>Board tracking is idle — browse the commentary or pick another game.</p>
        </div>
      );
    default: {
      const _exhaustive: never = guide;
      return _exhaustive;
    }
  }
}
