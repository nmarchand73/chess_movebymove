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
          <div className="landing-intro">
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
          </div>

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

          <div className="landing-actions">
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
        </div>

        <div className="landing-hero-visual" aria-hidden="true">
          <div className="landing-hero-floor" />
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
