import { useEffect, useMemo, useState } from "react";
import type { BookId, BookMeta, LessonIndex, LessonSummary } from "../types";
import { OpeningLabel } from "../components/OpeningLabel";
import { GameResultBadge, gameWinner, resultWinnerClass } from "../components/GameResultBadge";
import { usePerformanceElos } from "../hooks/usePerformanceElos";
import { loadIndex } from "../lib/lessonLoader";
import { aggregatePlayerElos, formatPlayerWithElo } from "../lib/playerStats";
import { getGameProgress, loadProgress } from "../lib/progress";
import { getBookDetails } from "../lib/bookDetails";
import { sourceBookLabel } from "../lib/bookMeta";
import type { Lang } from "../lib/lang";
import { fill, ui, type UiCopy } from "../lib/uiCopy";

type Props = {
  lang: Lang;
  selectedBook: BookId | null;
  onSelectBook: (bookId: BookId | null) => void;
  onOpenLesson: (lesson: LessonSummary) => void;
  onOpenSettings: () => void;
  onBackToLanding?: () => void;
};

function sectionMeta(sections: BookMeta["sections"], title: string) {
  return sections?.find((s) => s.title === title);
}

function progressLabel(pct: number, t: UiCopy): string {
  if (pct >= 100) return t.complete;
  if (pct > 0) return `${pct}%`;
  return t.notStarted;
}

function bookProgress(lessons: LessonSummary[]) {
  const completedCount = lessons.filter((l) => getGameProgress(l.id) >= 100).length;
  const inProgressCount = lessons.filter((l) => {
    const pct = getGameProgress(l.id);
    return pct > 0 && pct < 100;
  }).length;
  return { completedCount, inProgressCount };
}

function libraryProgress(index: LessonIndex) {
  const byId = new Map<string, LessonSummary>();
  for (const book of index.books) {
    for (const lesson of index[book.id] ?? []) {
      if (!byId.has(lesson.id)) byId.set(lesson.id, lesson);
    }
  }
  const lessons = [...byId.values()];
  const { completedCount, inProgressCount } = bookProgress(lessons);
  return {
    totalGames: lessons.length,
    completedCount,
    inProgressCount,
  };
}


function LibraryView({
  index,
  lang,
  onSelectBook,
  onOpenLesson,
  onOpenSettings,
  onBackToLanding,
}: {
  index: LessonIndex;
  lang: Lang;
  onSelectBook: (bookId: BookId) => void;
  onOpenLesson: (lesson: LessonSummary) => void;
  onOpenSettings: () => void;
  onBackToLanding?: () => void;
}) {
  const t = ui(lang);
  const progress = loadProgress();
  const { totalGames, completedCount, inProgressCount } = libraryProgress(index);
  const continueLesson = progress.lastLessonId
    ? index.books
        .flatMap((book) => index[book.id] ?? [])
        .find((lesson) => lesson.id === progress.lastLessonId)
    : undefined;
  const continuePct = continueLesson ? getGameProgress(continueLesson.id) : 0;

  return (
    <div className="book-library">
      <header className="library-hero">
        <div className="library-hero-copy">
          <div className="library-hero-top">
            <div className="library-brand-row">
              <img
                className="library-brand-mark"
                src={`${import.meta.env.BASE_URL}images/move-by-move-knight.png`}
                alt=""
                width={40}
                height={48}
                decoding="async"
              />
              {onBackToLanding ? (
                <button type="button" className="text-btn landing-back-link" onClick={onBackToLanding}>
                  {t.about}
                </button>
              ) : (
                <p className="eyebrow">{t.coachEyebrow}</p>
              )}
            </div>
            <button type="button" className="text-btn settings-link" onClick={onOpenSettings}>
              {t.settings}
            </button>
          </div>
          <h1>{t.libraryHeadline}</h1>
          <p className="library-hero-lead">{fill(t.libraryLead, { n: totalGames })}</p>
        </div>

        <div className="library-stats" aria-label={t.books}>
          <div className="stat-card">
            <strong>{index.books.length}</strong>
            <span>{t.books}</span>
          </div>
          <div className="stat-card">
            <strong>{totalGames}</strong>
            <span>{t.games}</span>
          </div>
          <div className="stat-card">
            <strong>{completedCount}</strong>
            <span>{t.completed}</span>
          </div>
          <div className="stat-card">
            <strong>{inProgressCount}</strong>
            <span>{t.inProgress}</span>
          </div>
        </div>
      </header>

      {continueLesson ? (
        <button
          type="button"
          className="library-resume"
          onClick={() => onOpenLesson(continueLesson)}
        >
          <span className="library-resume-label">{t.continueWhereLeft}</span>
          <strong>
            {fill(t.gameN, { n: continueLesson.gameNum })}: {continueLesson.players.white}{" "}
            {t.vs} {continueLesson.players.black}
          </strong>
          <span className="library-resume-meta">
            {continueLesson.opening ?? continueLesson.section}
            {continuePct > 0 && continuePct < 100
              ? ` · ${continuePct}%`
              : continuePct >= 100
                ? ` · ${t.complete}`
                : ""}
          </span>
          <span className="library-resume-cta">{t.resume}</span>
        </button>
      ) : null}

      <div className="book-card-grid" role="list">
        {index.books.map((book) => {
          const lessons = index[book.id] ?? [];
          const details = getBookDetails(book.id);
          const { completedCount, inProgressCount } = bookProgress(lessons);
          const pctComplete = book.gameCount
            ? Math.round((completedCount / book.gameCount) * 100)
            : 0;
          const hasProgress = completedCount > 0 || inProgressCount > 0;
          const isResumeBook = lessons.some((l) => l.id === progress.lastLessonId);

          return (
            <button
              key={book.id}
              type="button"
              className={`book-card book-card-${book.id}${isResumeBook ? " is-resume" : ""}${hasProgress ? " has-progress" : ""}`}
              onClick={() => onSelectBook(book.id)}
              role="listitem"
            >
              <div className="book-card-top">
                <p className="book-card-author">
                  {book.author}
                  {book.publisher ? <span className="book-card-publisher"> · {book.publisher}</span> : null}
                </p>
                {isResumeBook ? <span className="book-card-pill">{t.inProgress}</span> : null}
              </div>
              <h2 className="book-card-title">{book.title}</h2>
              {details ? (
                <>
                  <p className="book-card-tagline">{details.tagline}</p>
                  <p className="book-card-meta">
                    <span>{details.published}</span>
                    <span className="book-card-meta-sep" aria-hidden="true">·</span>
                    <span>{details.audience}</span>
                  </p>
                  <p className="book-card-description">{details.description}</p>
                  <ul className="book-card-highlights">
                    {details.highlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {details.famousFor ? (
                    <blockquote className="book-card-quote">{details.famousFor}</blockquote>
                  ) : null}
                </>
              ) : null}
              <p className="book-card-stats">
                {book.id === "intentions"
                  ? fill(t.selectedFromBoth, { n: book.gameCount })
                  : fill(t.annotatedGames, { n: book.gameCount })}
              </p>
              {book.sections && book.sections.length > 0 ? (
                <ul className="book-card-sections" aria-label={t.books}>
                  {(book.id === "intentions" ? book.sections.slice(0, 6) : book.sections).map((section) => (
                    <li key={section.title} title={section.blurb}>
                      <span className="book-card-section-name">{section.title}</span>
                      <span className="book-card-section-range">
                        {fill(t.gamesRange, { range: section.range })}
                      </span>
                    </li>
                  ))}
                  {book.id === "intentions" && book.sections.length > 6 ? (
                    <li className="book-card-sections-more">
                      {fill(t.moreIntentions, { n: book.sections.length - 6 })}
                    </li>
                  ) : null}
                </ul>
              ) : null}
              <div className="book-card-footer">
                <div className="book-card-progress-wrap">
                  <div className="book-card-progress-bar" aria-hidden="true">
                    <span style={{ width: `${pctComplete}%` }} />
                  </div>
                  <span className="book-card-progress-label">
                    {inProgressCount > 0
                      ? fill(t.completeStarted, {
                          done: completedCount,
                          started: inProgressCount,
                        })
                      : `${completedCount} ${t.complete}`}
                  </span>
                </div>
                <span className="book-card-open">{t.browseGames}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BookHomeView({
  book,
  lessons,
  lang,
  onBack,
  onOpenLesson,
  onOpenSettings,
}: {
  book: BookMeta;
  lessons: LessonSummary[];
  lang: Lang;
  onBack: () => void;
  onOpenLesson: (lesson: LessonSummary) => void;
  onOpenSettings: () => void;
}) {
  const t = ui(lang);
  const [query, setQuery] = useState("");
  const progress = loadProgress();
  const { performanceByLesson, loading: elosLoading } = usePerformanceElos();
  const sections = book.sections ?? [];
  const details = getBookDetails(book.id);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lessons;
    return lessons.filter((l) =>
      l.title.toLowerCase().includes(q) ||
      l.players.white.toLowerCase().includes(q) ||
      l.players.black.toLowerCase().includes(q) ||
      l.section.toLowerCase().includes(q) ||
      (l.event?.toLowerCase().includes(q) ?? false) ||
      (l.opening?.toLowerCase().includes(q) ?? false) ||
      (l.eco?.toLowerCase().includes(q) ?? false) ||
      (l.why?.toLowerCase().includes(q) ?? false) ||
      (l.openingIdea?.toLowerCase().includes(q) ?? false) ||
      (l.openingName?.toLowerCase().includes(q) ?? false) ||
      (l.sourceBook?.toLowerCase().includes(q) ?? false)
    );
  }, [lessons, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, LessonSummary[]>();
    for (const lesson of filtered) {
      const list = map.get(lesson.section) ?? [];
      list.push(lesson);
      map.set(lesson.section, list);
    }
    const orderedSections = sections.length
      ? sections.map((s) => s.title)
      : [...map.keys()];
    return orderedSections
      .map((title) => [title, map.get(title) ?? []] as const)
      .filter(([, items]) => items.length > 0);
  }, [filtered, sections]);

  const openingCount = useMemo(
    () => new Set(lessons.map((l) => l.opening).filter(Boolean)).size,
    [lessons],
  );

  const playerStats = useMemo(() => {
    const rated = lessons.flatMap((lesson) => {
      const performanceElo = performanceByLesson.get(lesson.id);
      if (!performanceElo) return [];
      return [{ ...lesson, performanceElo }];
    });
    return aggregatePlayerElos(rated);
  }, [lessons, performanceByLesson]);

  const ratedGames = lessons.filter((l) => performanceByLesson.has(l.id)).length;
  const showEloColumn = elosLoading || ratedGames > 0;

  const continueLesson = lessons.find((l) => l.id === progress.lastLessonId);
  const continuePct = continueLesson ? getGameProgress(continueLesson.id) : 0;
  const { completedCount, inProgressCount } = bookProgress(lessons);
  const searchActive = query.trim().length > 0;

  return (
    <div className="home">
      <header className="home-hero">
        <div className="home-hero-copy">
          <div className="library-hero-top">
            <button type="button" className="text-btn landing-back-link" onClick={onBack}>
              {t.backLibrary}
            </button>
            <button type="button" className="text-btn settings-link" onClick={onOpenSettings}>
              {t.settings}
            </button>
          </div>
          <p className="eyebrow">{book.author}{book.publisher ? ` · ${book.publisher}` : ""}</p>
          <h1>{book.title}</h1>
          {details ? (
            <>
              <p className="hero-sub book-hero-tagline">{details.tagline}</p>
              <p className="book-hero-description">{details.description}</p>
              <p className="book-hero-meta">{details.published} · {details.audience}</p>
            </>
          ) : (
            <p className="hero-sub">
              {fill(t.annotatedGames, { n: book.gameCount })}
            </p>
          )}
        </div>

        {continueLesson && (
          <button type="button" className="continue-card" onClick={() => onOpenLesson(continueLesson)}>
            <div className="continue-card-top">
              <span className="continue-label">
                {continuePct >= 100 ? t.reviewLastGame : t.continueStudying}
              </span>
              <span className="continue-game-num">{fill(t.gameN, { n: continueLesson.gameNum })}</span>
            </div>
            <strong>
              {continueLesson.players.white} {t.vs} {continueLesson.players.black}
            </strong>
            <div className="continue-meta">
              {continueLesson.opening && (
                <OpeningLabel name={continueLesson.opening} eco={continueLesson.eco} showTip={false} />
              )}
              {continueLesson.event && <span className="continue-event">{continueLesson.event}</span>}
            </div>
            <span className="continue-progress-text">
              {continuePct >= 100
                ? t.finishedOpenReview
                : fill(t.moveOf, { x: progress.lastPly ?? 0, y: continueLesson.moveCount })}
            </span>
            <div className="card-progress">
              <div style={{ width: `${continuePct}%` }} />
            </div>
          </button>
        )}

        <div className="home-stats">
          <div className="stat-card">
            <strong>{lessons.length}</strong>
            <span>{t.games}</span>
          </div>
          <div className="stat-card">
            <strong>{openingCount}</strong>
            <span>{t.openings}</span>
          </div>
          <div className="stat-card">
            <strong>{completedCount}</strong>
            <span>{t.completed}</span>
          </div>
          <div className="stat-card">
            <strong>{inProgressCount}</strong>
            <span>{t.inProgress}</span>
          </div>
          {ratedGames > 0 && (
            <div className="stat-card" title={t.lucasElo}>
              <strong>{playerStats.length}</strong>
              <span>{t.ratedPlayers}</span>
            </div>
          )}
        </div>
      </header>

      <section className="home-library" aria-labelledby="library-heading">
        <div className="library-head">
          <div>
            <h2 id="library-heading">{t.gameIndex}</h2>
            <p className="library-sub">
              {searchActive
                ? `${filtered.length} / ${lessons.length}`
                : elosLoading
                  ? t.loadingLibrary
                  : fill(t.annotatedGames, { n: lessons.length })}
            </p>
          </div>
          <div className="toolbar">
            <input
              type="search"
              placeholder={t.searchGames}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t.searchGames}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="empty-search">{fill(t.noGamesMatch, { q: query.trim() })}</p>
        ) : (
          grouped.map(([section, items]) => {
            const meta = sectionMeta(sections, section);
            return (
              <section key={section} className="section-block">
                <div className="section-head">
                  <div>
                    <h3>{section}</h3>
                    {meta && (
                      <p className="section-blurb">
                        {fill(t.gamesRange, { range: meta.range })} · {meta.blurb}
                      </p>
                    )}
                    {meta?.openings && meta.openings.length > 0 ? (
                      <ul className="intention-openings" aria-label={t.openings}>
                        {meta.openings.map((opening) => (
                          <li key={opening.name}>
                            <strong>{opening.name}</strong>
                            <span>{opening.idea}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <span className="section-count">
                    {items.length} {t.games.toLowerCase()}
                  </span>
                </div>

                <div className={`game-table${showEloColumn ? " has-elo" : ""} has-result`}>
                  <div className="game-table-head" aria-hidden="true">
                    <span className="col-num">#</span>
                    <span className="col-players">{t.players}</span>
                    <span className="col-result">{t.result}</span>
                    {showEloColumn && (
                      <span className="col-elo" title={t.lucasElo}>
                        {t.estElo}
                      </span>
                    )}
                    <span className="col-opening">{t.opening}</span>
                    <span className="col-progress">{t.progress}</span>
                  </div>
                  <div className="lesson-list" role="list">
                    {items.map((lesson) => {
                      const pct = getGameProgress(lesson.id);
                      const status = progressLabel(pct, t);
                      const performanceElo = performanceByLesson.get(lesson.id);
                      const winner = gameWinner(lesson.result);
                      const sourceLabel = sourceBookLabel(lesson.sourceBook);
                      const sourceGameNum = lesson.sourceLessonId
                        ? Number(lesson.sourceLessonId.split("-").pop())
                        : null;
                      return (
                        <button
                          key={`${lesson.book}-${lesson.id}-${lesson.section}`}
                          type="button"
                          className={`lesson-row${pct >= 100 ? " is-complete" : pct > 0 ? " is-started" : ""}`}
                          onClick={() => onOpenLesson(lesson)}
                          role="listitem"
                        >
                          <span className="lesson-num" aria-hidden="true">{lesson.gameNum}</span>
                          <span className="lesson-main">
                            <strong>
                              <span className={resultWinnerClass("white", winner)}>
                                {formatPlayerWithElo(lesson.players.white, performanceElo?.white)}
                              </span>
                              {` ${t.vs} `}
                              <span className={resultWinnerClass("black", winner)}>
                                {formatPlayerWithElo(lesson.players.black, performanceElo?.black)}
                              </span>
                            </strong>
                            {lesson.why ? <span className="lesson-why">{lesson.why}</span> : null}
                            {lesson.openingIdea ? (
                              <span className="lesson-opening-idea">
                                <strong>{lesson.openingName ?? t.opening}</strong>
                                {" — "}
                                {lesson.openingIdea}
                              </span>
                            ) : null}
                            {lesson.event && !lesson.why ? <span className="lesson-event">{lesson.event}</span> : null}
                            {sourceLabel && sourceGameNum ? (
                              <span className="lesson-source-badge">
                                {sourceLabel} · {fill(t.gameN, { n: sourceGameNum })}
                              </span>
                            ) : null}
                          </span>
                          <div className="lesson-meta-chips">
                            <GameResultBadge result={lesson.result} lang={lang} />
                            {showEloColumn && (
                              <span className="lesson-elo" title={t.estElo}>
                                {performanceElo ? (
                                  <>
                                    <span className="elo-white">{performanceElo.white}</span>
                                    <span className="elo-sep" aria-hidden="true">·</span>
                                    <span className="elo-black">{performanceElo.black}</span>
                                  </>
                                ) : (
                                  <span className="muted">{elosLoading ? "…" : "—"}</span>
                                )}
                              </span>
                            )}
                            <span className="lesson-opening">
                              {lesson.opening ? (
                                <OpeningLabel name={lesson.opening} eco={lesson.eco} />
                              ) : (
                                <span className="muted">—</span>
                              )}
                            </span>
                            <span className={`lesson-status${pct >= 100 ? " is-done" : pct > 0 ? " is-active" : ""}`}>
                              {status}
                            </span>
                          </div>
                          {pct > 0 && pct < 100 && (
                            <span className="lesson-progress" aria-hidden="true">
                              <span style={{ width: `${pct}%` }} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })
        )}
      </section>
    </div>
  );
}

export function Home({
  lang,
  selectedBook,
  onSelectBook,
  onOpenLesson,
  onOpenSettings,
  onBackToLanding,
}: Props) {
  const t = ui(lang);
  const [index, setIndex] = useState<LessonIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIndex()
      .then(setIndex)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!index) return <div className="loading">{t.loadingLibrary}</div>;

  if (!selectedBook) {
    return (
      <LibraryView
        index={index}
        lang={lang}
        onSelectBook={onSelectBook}
        onOpenLesson={onOpenLesson}
        onOpenSettings={onOpenSettings}
        onBackToLanding={onBackToLanding}
      />
    );
  }

  const book = index.books.find((b) => b.id === selectedBook);
  const lessons = index[selectedBook] ?? [];
  if (!book) return <p className="error">{t.bookNotFound}</p>;

  return (
    <BookHomeView
      book={book}
      lessons={lessons}
      lang={lang}
      onBack={() => onSelectBook(null)}
      onOpenLesson={onOpenLesson}
      onOpenSettings={onOpenSettings}
    />
  );
}
