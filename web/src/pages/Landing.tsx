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
        <div className="landing-hero-visual" aria-hidden="true">
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
        <div className="landing-hero-scrim" aria-hidden="true" />

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
            Study Chernev and Nunn with a synced board, author commentary, and optional Chessnut guidance.
          </p>
          <div className="landing-cta-group">
            <button type="button" className="landing-cta-primary" onClick={onEnterLibrary}>
              Start studying
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
        </div>
      </section>

      <section className="landing-band" aria-label="What you will study">
        <div className="landing-band-inner">
          <p className="landing-band-line">
            <span>Chernev</span>
            <span className="landing-band-dot" aria-hidden="true" />
            <span>Nunn</span>
            <span className="landing-band-dot" aria-hidden="true" />
            <span>Chessnut</span>
          </p>
          <p className="landing-band-sub">
            Classic games, move by move — commentary on screen, pieces on the board.
          </p>
        </div>
        <div className="landing-checker" aria-hidden="true" />
      </section>
    </div>
  );
}
