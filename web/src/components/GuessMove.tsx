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

function HandMovingPieceIcon({ physical }: { physical: boolean }) {
  return (
    <svg
      className="guess-cue-icon"
      viewBox="0 0 72 56"
      width="72"
      height="56"
      aria-hidden="true"
      focusable="false"
    >
      {/* Board surface */}
      <rect
        x="4"
        y="30"
        width="44"
        height="22"
        rx="3"
        fill={physical ? "#4f3389" : "#faf4ea"}
        stroke="#4f3389"
        strokeWidth="1.5"
      />
      {/* Squares hint */}
      <path
        d="M15 30v22M26 30v22M37 30v22M4 37h44M4 44h44"
        stroke={physical ? "#c9b8de" : "#c9b8de"}
        strokeWidth="1"
        opacity="0.85"
      />
      {physical ? (
        <>
          {/* LED dots on physical board */}
          <circle cx="20.5" cy="40.5" r="1.6" fill="#ff8a3d" />
          <circle cx="31.5" cy="40.5" r="1.6" fill="#e91e63" />
        </>
      ) : (
        <>
          {/* Screen bezel glow */}
          <rect x="4" y="30" width="44" height="3" rx="1" fill="#e91e63" opacity="0.35" />
        </>
      )}
      {/* Pawn being moved */}
      <g className="guess-cue-piece">
        <ellipse cx="48" cy="28" rx="7" ry="3" fill="#4f3389" opacity="0.18" />
        <path
          d="M48 8c-3.2 0-5.5 2.2-5.5 5 0 1.5.7 2.8 1.8 3.6-2.2 1-3.8 3.2-3.8 5.7v1.2h15V22.3c0-2.5-1.6-4.7-3.8-5.7 1.1-.8 1.8-2.1 1.8-3.6 0-2.8-2.3-5-5.5-5z"
          fill="#fff9f0"
          stroke="#4f3389"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle cx="48" cy="10.5" r="3.2" fill="#fff9f0" stroke="#4f3389" strokeWidth="1.4" />
      </g>
      {/* Hand / fingers */}
      <g className="guess-cue-hand">
        <path
          d="M56 6c2.5 1.2 4.2 4 4.5 7.2.4 3.8-1.2 7.5-3.8 9.8l-2.2 1.8c-.6.5-1.5.4-2-.2-.4-.5-.3-1.3.3-1.7l1.6-1.2c1.6-1.3 2.6-3.5 2.4-5.8-.3-2.5-1.7-4.5-3.6-5.3-.6-.3-.9-1-.7-1.6.3-.7 1.1-1 1.8-.7z"
          fill="#f3c6a8"
          stroke="#4f3389"
          strokeWidth="1.1"
        />
        <path
          d="M54.5 14.5c1.8.4 3.2 2.2 3.4 4.3.2 1.8-.5 3.5-1.7 4.6"
          fill="none"
          stroke="#4f3389"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.45"
        />
      </g>
      {/* Motion arcs */}
      <path
        className="guess-cue-motion"
        d="M40 18c4 2 7 6 8 11"
        fill="none"
        stroke="#e91e63"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />
    </svg>
  );
}

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
  const [showTyped, setShowTyped] = useState(false);
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

  const title = physicalBoard ? "Your move" : "Your move";
  const hint = physicalBoard ? "On the Chessnut" : "On the screen board";

  return (
    <div
      className={`guess-cue${physicalBoard ? " is-physical" : " is-screen"}${shownFeedback ? " has-feedback" : ""}`}
      role="status"
      aria-live="polite"
    >
      <HandMovingPieceIcon physical={physicalBoard} />
      <div className="guess-cue-copy">
        <strong className="guess-cue-title">{title}</strong>
        <span className="guess-cue-hint">{hint}</span>
        {shownFeedback ? (
          <span className={`guess-cue-feedback${shownFeedback.startsWith("Correct") ? " is-ok" : ""}`}>
            {shownFeedback}
          </span>
        ) : null}
      </div>
      <div className="guess-cue-actions">
        {!physicalBoard && showTyped ? (
          <div className="guess-cue-typed">
            <input
              list="legal-moves"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Nf3"
              aria-label="Your move guess"
              autoFocus
            />
            <datalist id="legal-moves">{legal.map((m) => <option key={m} value={m} />)}</datalist>
            <button type="button" className="guess-cue-check" onClick={submit}>
              Check
            </button>
          </div>
        ) : null}
        {!physicalBoard && !showTyped ? (
          <button type="button" className="secondary guess-cue-btn" onClick={() => setShowTyped(true)}>
            Type
          </button>
        ) : null}
        <button type="button" className="secondary guess-cue-btn" onClick={onReveal}>
          Show
        </button>
      </div>
    </div>
  );
}
