type Props = {
  ply: number;
  maxPly: number;
  currentSan?: string;
  sideToMove: "white" | "black" | "none";
  nextAnnotatedPly: number | null;
  nextAnnotatedLabel?: string | null;
  hasMoreBeats: boolean;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onNextAnnotated: () => void;
  onLast: () => void;
  guessEnabled: boolean;
  onToggleGuess: () => void;
  nextBlocked?: boolean;
};

export function TransportBar({
  ply,
  maxPly,
  currentSan,
  sideToMove,
  nextAnnotatedPly,
  nextAnnotatedLabel,
  hasMoreBeats,
  onFirst,
  onPrev,
  onNext,
  onNextAnnotated,
  onLast,
  guessEnabled,
  onToggleGuess,
  nextBlocked = false,
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
          ⏮
        </button>
        <button type="button" className="secondary icon-btn" onClick={onPrev} disabled={ply === 0} aria-label="Previous move" title="Previous (←)">
          ◀
        </button>
        <button
          type="button"
          className="transport-next"
          onClick={onNext}
          disabled={ply >= maxPly || nextBlocked}
          aria-label={hasMoreBeats ? "Continue reading" : "Next move"}
          title={hasMoreBeats ? "Continue reading (→ or Space)" : "Next move (→ or Space)"}
        >
          {hasMoreBeats ? "Continue ▶" : "Next ▶"}
        </button>
        <button type="button" className="secondary icon-btn" onClick={onLast} disabled={ply >= maxPly} aria-label="Last move" title="Last (End)">
          ⏭
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
          Guess-the-move before advancing
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
