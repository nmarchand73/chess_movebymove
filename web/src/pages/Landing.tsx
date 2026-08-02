import { useMemo } from "react";
import { getGameProgress, loadProgress } from "../lib/progress";

type Props = {
  onEnterLibrary: () => void;
  onContinueLesson?: () => void;
};

const KNIGHT_SRC = `${import.meta.env.BASE_URL}images/move-by-move-knight.png`;

export function Landing({ onEnterLibrary, onContinueLesson }: Props) {
  const continueAction = useMemo(() => {
    const progress = loadProgress();
    if (!progress.lastLessonId) return null;
    const pct = getGameProgress(progress.lastLessonId);
    if (pct >= 100) return { label: "Review last game", pct: null as number | null };
    if (pct <= 0) return { label: "Continue studying", pct: null as number | null };
    return { label: "Continue", pct };
  }, []);

  return (
    <div className="landing">
      <section className="landing-hero" aria-label="Move by Move">
        <div className="landing-hero-content">
          <img
            className="landing-brand-mark"
            src={KNIGHT_SRC}
            alt=""
            width={72}
            height={86}
            decoding="async"
          />
          <p className="landing-brand">Move by Move</p>
          <h1 className="landing-headline">Every move explained</h1>
          <p className="landing-lead">
            Chernev’s 1957 classic and Nunn’s modern grandmaster sequel — 63 complete games
            where each move gets a reason, not a variation dump. Read the author’s note, see
            the position on the board, then try the next move yourself.
          </p>
          <ul className="landing-points">
            <li>
              <strong>Chernev · 33 games</strong>
              Capablanca, Tarrasch, Rubinstein — development, king safety, and when to attack,
              told in plain English for players still building intuition.
            </li>
            <li>
              <strong>Nunn · 30 games</strong>
              Kasparov, Kramnik, Shirov, Polgar — the same move-by-move habit, updated for
              how strong players think now.
            </li>
            <li>
              <strong>Board in sync</strong>
              Step through commentary with a live diagram. Optional Chessnut quiz: hide the
              next move, play it on the physical board, no LED spoilers.
            </li>
          </ul>
          <div className="landing-cta-group">
            <button type="button" className="landing-cta-primary" onClick={onEnterLibrary}>
              Open the library
            </button>
            {continueAction && onContinueLesson ? (
              <button
                type="button"
                className="landing-cta-secondary"
                onClick={onContinueLesson}
                aria-label={
                  continueAction.pct != null
                    ? `Continue studying, ${continueAction.pct}% complete`
                    : continueAction.label
                }
              >
                <span>{continueAction.label}</span>
                {continueAction.pct != null ? (
                  <span className="landing-cta-pct" aria-hidden="true">
                    {continueAction.pct}%
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>
          <p className="landing-quote">
            “The novice who plays through Logical Chess can learn an ocean of basic chess wisdom.”
            <cite> — Leonard Barden</cite>
          </p>
        </div>

        <div className="landing-hero-visual" aria-hidden="true">
          <div className="landing-hero-floor" />
          <svg
            className="landing-ghost-move"
            viewBox="0 0 240 200"
            width="240"
            height="200"
            focusable="false"
          >
            <defs>
              <marker
                id="landing-arrowhead"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="#e91e63" />
              </marker>
            </defs>
            <rect className="landing-ghost-sq from" x="148" y="132" width="36" height="36" rx="3" />
            <rect className="landing-ghost-sq to" x="76" y="60" width="36" height="36" rx="3" />
            <path
              className="landing-ghost-path"
              d="M166 150 C 166 110, 130 78, 94 78"
              fill="none"
              stroke="#e91e63"
              strokeWidth="3.5"
              strokeLinecap="round"
              markerEnd="url(#landing-arrowhead)"
            />
          </svg>
          <div className="landing-hero-knight">
            <img
              className="landing-hero-logo"
              src={KNIGHT_SRC}
              alt=""
              width={854}
              height={1024}
              decoding="async"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
