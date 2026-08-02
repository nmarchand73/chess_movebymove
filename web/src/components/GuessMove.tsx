import { useMemo, useState } from "react";
import { Chess } from "chess.js";

type Props = {
  chess: Chess;
  expectedSan: string;
  commentator: string;
  onReveal: () => void;
  onCorrect: () => void;
  onWrong: () => void;
  /** Chessnut connected — guess by playing on the board. */
  physicalBoard?: boolean;
  /** Feedback from a physical guess (parent-owned). */
  externalFeedback?: string | null;
};

export function GuessMove({
  chess,
  expectedSan,
  commentator,
  onReveal,
  onCorrect,
  onWrong,
  physicalBoard = false,
  externalFeedback = null,
}: Props) {
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const legal = useMemo(() => chess.moves(), [chess]);
  const shownFeedback = physicalBoard ? externalFeedback : feedback;

  function submit() {
    const trimmed = guess.trim();
    if (!trimmed) return;
    try {
      const copy = new Chess(chess.fen());
      const played = copy.move(trimmed);
      if (!played) {
        setFeedback("Illegal move — try again.");
        return;
      }
      if (played.san.toLowerCase() === expectedSan.toLowerCase()) {
        setFeedback(`Correct — same as ${commentator}!`);
        onCorrect();
        onReveal();
      } else {
        setFeedback(`${commentator} played ${expectedSan} here.`);
        onWrong();
      }
    } catch {
      setFeedback("Could not parse that move.");
    }
  }

  return (
    <div className="guess-panel">
      <h3>Your turn</h3>
      {physicalBoard ? (
        <p className="muted">
          Play your move on the Chessnut. Undo on the board to try again, or show the book move.
        </p>
      ) : (
        <p className="muted">What would you play? Enter a move in algebraic notation.</p>
      )}
      {physicalBoard ? (
        <div className="guess-row">
          <button type="button" className="secondary" onClick={onReveal}>
            Show move
          </button>
        </div>
      ) : (
        <div className="guess-row">
          <input
            list="legal-moves"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="e.g. Nf3"
            aria-label="Your move guess"
          />
          <datalist id="legal-moves">{legal.map((m) => <option key={m} value={m} />)}</datalist>
          <button type="button" onClick={submit}>Check</button>
          <button type="button" className="secondary" onClick={onReveal}>Show move</button>
        </div>
      )}
      {shownFeedback && (
        <p className={`feedback ${shownFeedback.startsWith("Correct") ? "ok" : ""}`}>
          {shownFeedback}
        </p>
      )}
    </div>
  );
}
