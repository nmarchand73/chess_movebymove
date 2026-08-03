import { useEffect, useMemo, useState } from "react";
import { getGameProgress, loadProgress } from "../lib/progress";
import { LANDING_QUOTES, landingQuoteBookLabel } from "../lib/landingQuotes";

type Props = {
  onEnterLibrary: () => void;
  onContinueLesson?: () => void;
};

const BASE = import.meta.env.BASE_URL;
const KNIGHT_SRC = `${BASE}images/move-by-move-knight.png`;

const SLIDES = [
  { id: "knight", kind: "knight" as const, label: "Cover art" },
  {
    id: "lesson",
    kind: "shot" as const,
    label: "Study a game",
    src: `${BASE}images/landing-lesson.jpg`,
    alt: "Lesson view: board with knight path arrow, evaluation, best line, and move controls on 12.Nd2",
  },
  {
    id: "commentary",
    kind: "shot" as const,
    label: "Chernev explains",
    src: `${BASE}images/landing-commentary.jpg`,
    alt: "Commentary panel for 12.Nd2 with takeaway, Listen and Follow controls, and Chernev’s annotation",
  },
] as const;

const SLIDE_MS = 5200;
const QUOTE_MS = 6200;

export function Landing({ onEnterLibrary, onContinueLesson }: Props) {
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quotePaused, setQuotePaused] = useState(false);

  const continueAction = useMemo(() => {
    const progress = loadProgress();
    if (!progress.lastLessonId) return null;
    const pct = getGameProgress(progress.lastLessonId);
    if (pct >= 100) return { label: "Review last game", pct: null as number | null };
    if (pct <= 0) return { label: "Continue studying", pct: null as number | null };
    return { label: "Continue", pct };
  }, []);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setSlide((i) => (i + 1) % SLIDES.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  useEffect(() => {
    if (quotePaused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setQuoteIndex((i) => (i + 1) % LANDING_QUOTES.length);
    }, QUOTE_MS);
    return () => window.clearInterval(id);
  }, [quotePaused]);

  const active = SLIDES[slide] ?? SLIDES[0];

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
              where each move gets a reason, not a variation dump. Read the author’s note —
              or listen to it — see the position on the board, then try the next move yourself.
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
              Step through commentary with a live diagram, tap Listen for chess-aware speech,
              and optionally quiz yourself on a Chessnut board with no LED spoilers.
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
            <div
              className="landing-quote-carousel"
              aria-live="polite"
              aria-atomic="true"
              onMouseEnter={() => setQuotePaused(true)}
              onMouseLeave={() => setQuotePaused(false)}
              onFocusCapture={() => setQuotePaused(true)}
              onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setQuotePaused(false);
              }}
            >
              {LANDING_QUOTES.map((quote, index) => {
                const isActive = index === quoteIndex;
                return (
                  <blockquote
                    key={quote.id}
                    className={`landing-quote${isActive ? " is-active" : ""}`}
                    aria-hidden={!isActive}
                  >
                    <p className="landing-quote-text">“{quote.text}”</p>
                    <footer className="landing-quote-meta">
                      <cite> — {quote.attribution}</cite>
                      <span className="landing-quote-book">{landingQuoteBookLabel(quote.book)}</span>
                    </footer>
                  </blockquote>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className={`landing-hero-visual is-${active.kind}`}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
          }}
        >
          <div className="landing-hero-floor" aria-hidden="true" />

          <div className="landing-slides" aria-roledescription="carousel" aria-label="Product preview">
            {SLIDES.map((item, index) => {
              const isActive = index === slide;
              if (item.kind === "knight") {
                return (
                  <div
                    key={item.id}
                    className={`landing-slide is-knight${isActive ? " is-active" : ""}`}
                    aria-hidden={!isActive}
                  >
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
                );
              }

              return (
                <div
                  key={item.id}
                  className={`landing-slide is-shot${isActive ? " is-active" : ""}`}
                  aria-hidden={!isActive}
                >
                  <img
                    className="landing-lesson-shot"
                    src={item.src}
                    alt={item.alt}
                    width={1170}
                    height={2532}
                    decoding="async"
                    loading="lazy"
                  />
                </div>
              );
            })}
          </div>

          <div className="landing-slide-dots" role="tablist" aria-label="Choose preview">
            {SLIDES.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={index === slide}
                aria-label={item.label}
                className={`landing-slide-dot${index === slide ? " is-active" : ""}`}
                onClick={() => setSlide(index)}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
