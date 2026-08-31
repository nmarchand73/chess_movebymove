import { useEffect, useMemo, useState } from "react";
import type { Lang } from "../lib/lang";
import { LANDING_QUOTES, landingQuoteBookLabel } from "../lib/landingQuotes";
import { getGameProgress, loadProgress } from "../lib/progress";
import { ui } from "../lib/uiCopy";

type Props = {
  lang: Lang;
  onEnterLibrary: () => void;
  onContinueLesson?: () => void;
};

const BASE = import.meta.env.BASE_URL;
const KNIGHT_SRC = `${BASE}images/move-by-move-knight.png`;

const SLIDE_DEFS = [
  { id: "knight", kind: "knight" as const, labelKey: "slideCover" as const },
  {
    id: "lesson",
    kind: "shot" as const,
    labelKey: "slideLesson" as const,
    src: `${BASE}images/landing-lesson.jpg`,
    alt: "Lesson view: board with knight path arrow, evaluation, best line, and move controls on 12.Nd2",
  },
  {
    id: "commentary",
    kind: "shot" as const,
    labelKey: "slideCommentary" as const,
    src: `${BASE}images/landing-commentary.jpg`,
    alt: "Commentary panel for 12.Nd2 with takeaway, Listen and Follow controls, and Chernev’s annotation",
  },
] as const;

const SLIDE_MS = 5200;
const QUOTE_MS = 6200;

export function Landing({ lang, onEnterLibrary, onContinueLesson }: Props) {
  const t = ui(lang);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quotePaused, setQuotePaused] = useState(false);
  const [narrow, setNarrow] = useState(false);

  const continueAction = useMemo(() => {
    const progress = loadProgress();
    if (!progress.lastLessonId) return null;
    const pct = getGameProgress(progress.lastLessonId);
    if (pct >= 100) return { label: t.reviewLastGame, pct: null as number | null };
    if (pct <= 0) return { label: t.continueStudying, pct: null as number | null };
    return { label: t.continue, pct };
  }, [lang, t.continue, t.continueStudying, t.reviewLastGame]);

  const slides = useMemo(() => {
    const labeled = SLIDE_DEFS.map((item) => ({
      ...item,
      label: t[item.labelKey],
    }));
    return narrow ? labeled.filter((item) => item.id !== "commentary") : labeled;
  }, [narrow, t]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 960px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setSlide(0);
  }, [narrow]);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setSlide((i) => (i + 1) % slides.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [paused, slides.length]);

  useEffect(() => {
    if (quotePaused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setQuoteIndex((i) => (i + 1) % LANDING_QUOTES.length);
    }, QUOTE_MS);
    return () => window.clearInterval(id);
  }, [quotePaused]);

  const active = slides[slide] ?? slides[0];

  return (
    <div className="landing">
      <section className="landing-hero" aria-label={t.brand}>
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
            <p className="landing-brand">{t.brand}</p>
            <h1 className="landing-headline">{t.headline}</h1>
            <p className="landing-lead landing-lead-full">{t.landingLead}</p>
            <p className="landing-lead landing-lead-short">{t.landingLeadShort}</p>
          </div>

          <ul className="landing-points">
            <li>
              <strong>{t.pointChernevTitle}</strong>
              {t.pointChernevBody}
            </li>
            <li>
              <strong>{t.pointNunnTitle}</strong>
              {t.pointNunnBody}
            </li>
            <li>
              <strong>{t.pointBoardTitle}</strong>
              {t.pointBoardBody}
            </li>
          </ul>

          <div className="landing-cta-group">
            <button type="button" className="landing-cta-primary" onClick={onEnterLibrary}>
              {t.openLibrary}
            </button>
            {continueAction && onContinueLesson ? (
              <button
                type="button"
                className="landing-cta-secondary"
                onClick={onContinueLesson}
                aria-label={
                  continueAction.pct != null
                    ? `${t.continueStudying}, ${continueAction.pct}% ${t.complete}`
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

          <div className="landing-slides" aria-roledescription="carousel" aria-label={t.productPreview}>
            {slides.map((item, index) => {
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

          <div className="landing-slide-dots" role="tablist" aria-label={t.choosePreview}>
            {slides.map((item, index) => (
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
