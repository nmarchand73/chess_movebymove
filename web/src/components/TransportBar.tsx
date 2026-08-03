type Props = {
  ply: number;
  maxPly: number;
  currentSan?: string;
  sideToMove: "white" | "black" | "none";
  nextAnnotatedPly: number | null;
  nextAnnotatedLabel?: string | null;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onNextAnnotated: () => void;
  onLast: () => void;
  guessEnabled: boolean;
  onToggleGuess: () => void;
  nextBlocked?: boolean;
  /** Chessnut connected — quiz uses the physical board. */
  physicalBoard?: boolean;
};

export function TransportBar({
  ply,
  maxPly,
  currentSan,
  sideToMove,
  nextAnnotatedPly,
  nextAnnotatedLabel,
  onFirst,
  onPrev,
  onNext,
  onNextAnnotated,
  onLast,
  guessEnabled,
  onToggleGuess,
  nextBlocked = false,
  physicalBoard = false,
}: Props) {
  const positionLabel = ply === 0
    ? "Starting position"
    : `${formatMoveNumber(ply)} ${currentSan ?? ""}`.trim();

  const showNextNote = nextAnnotatedPly !== null && nextAnnotatedPly > ply + 1;

  return (
    <div className="transport-bar">
      <div className="position-display">
        <span className="position-label">
          {positionLabel}
          <span className="position-meta">
            {" · "}
            {sideToMove === "none" ? "Introduction" : `${capitalize(sideToMove)} to move`}
            {" · "}
            {ply}/{maxPly}
          </span>
        </span>
      </div>

      <div className="transport-buttons">
        <button type="button" className="secondary icon-btn" onClick={onFirst} disabled={ply === 0} aria-label="First move" title="First (Home)">
          <FirstIcon />
        </button>
        <button type="button" className="secondary icon-btn" onClick={onPrev} disabled={ply === 0} aria-label="Previous move" title="Previous (←)">
          <PrevIcon />
        </button>
        <button
          type="button"
          className="transport-next"
          onClick={onNext}
          disabled={ply >= maxPly || nextBlocked}
          aria-label="Next move"
          title="Next move (→ or Space)"
        >
          <span>Next</span>
          <PlayIcon />
        </button>
        <button type="button" className="secondary icon-btn" onClick={onLast} disabled={ply >= maxPly} aria-label="Last move" title="Last (End)">
          <LastIcon />
        </button>
      </div>

      {showNextNote ? (
        <button
          type="button"
          className="secondary transport-next-note"
          onClick={onNextAnnotated}
          disabled={nextBlocked}
        >
          Next note → {nextAnnotatedLabel}
        </button>
      ) : null}

      <div className="transport-footer">
        <label className="guess-toggle">
          <input type="checkbox" checked={guessEnabled} onChange={onToggleGuess} />
          <span className="guess-toggle-full">
            {physicalBoard
              ? "Quiz on the board (hide next move)"
              : "Guess-the-move before advancing"}
          </span>
          <span className="guess-toggle-short">
            {physicalBoard ? "Quiz on board" : "Guess mode"}
          </span>
        </label>
        <span className="keyboard-hint">← → navigate · Space next</span>
      </div>
    </div>
  );
}

function formatMoveNumber(ply: number): string {
  const moveNum = Math.ceil(ply / 2);
  return ply % 2 === 1 ? `${moveNum}.` : `${moveNum}...`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Inline SVGs — Unicode media glyphs render as emoji on iOS Safari. */
function FirstIcon() {
  return (
    <svg className="transport-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M6 6h2.2v12H6V6zm3.8 6 8.2 5.5V6.5L9.8 12z" />
    </svg>
  );
}

function PrevIcon() {
  return (
    <svg className="transport-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M15.8 6.5v11L7.6 12l8.2-5.5z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="transport-icon transport-icon-next" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M8 5.5v13l11-6.5L8 5.5z" />
    </svg>
  );
}

function LastIcon() {
  return (
    <svg className="transport-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M15.8 6h2.2v12h-2.2V6zM6 6.5v11L14.2 12 6 6.5z" />
    </svg>
  );
}
