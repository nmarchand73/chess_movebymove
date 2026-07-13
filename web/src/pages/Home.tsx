import { useEffect, useMemo, useState } from "react";
import type { BookId, BookMeta, LessonIndex, LessonSummary } from "../types";
import { OpeningLabel } from "../components/OpeningLabel";
import { GameResultBadge, gameWinner, resultWinnerClass } from "../components/GameResultBadge";
import { usePerformanceElos } from "../hooks/usePerformanceElos";
import { loadIndex } from "../lib/lessonLoader";
import { aggregatePlayerElos, formatPlayerWithElo } from "../lib/playerStats";
import { getGameProgress, loadProgress } from "../lib/progress";
import { getBookDetails } from "../lib/bookDetails";

type Props = {
  selectedBook: BookId | null;
  onSelectBook: (bookId: BookId | null) => void;
  onOpenLesson: (lesson: LessonSummary) => void;
};

function sectionMeta(sections: BookMeta["sections"], title: string) {
  return sections?.find((s) => s.title === title);
}

function progressLabel(pct: number): string {
  if (pct >= 100) return "Complete";
  if (pct > 0) return `${pct}%`;
  return "Not started";
}

function bookProgress(lessons: LessonSummary[]) {
  const completedCount = lessons.filter((l) => getGameProgress(l.id) >= 100).length;
  const inProgressCount = lessons.filter((l) => {
    const pct = getGameProgress(l.id);
    return pct > 0 && pct < 100;
  }).length;
  return { completedCount, inProgressCount };
}

function LibraryView({
  index,
  onSelectBook,
  onOpenLesson,
}: {
  index: LessonIndex;
  onSelectBook: (bookId: BookId) => void;
  onOpenLesson: (lesson: LessonSummary) => void;
}) {
  const progress = loadProgress();
  const totalGames = index.books.reduce((sum, book) => sum + book.gameCount, 0);
  const continueLesson = progress.lastLessonId
    ? index.books
        .flatMap((book) => index[book.id] ?? [])
        .find((lesson) => lesson.id === progress.lastLessonId)
    : undefined;
  const continuePct = continueLesson ? getGameProgress(continueLesson.id) : 0;

  return (
    <div className="book-library">
      <header className="library-hero">
        <p className="eyebrow">Move-by-Move Coach</p>
        <h1>Your library</h1>
        <p className="library-hero-sub">
          {index.books.length} books · {totalGames} annotated games with synced boards, author commentary,
          and optional Stockfish analysis.
        </p>
      </header>

      {continueLesson ? (
        <button
          type="button"
          className="library-resume"
          onClick={() => onOpenLesson(continueLesson)}
        >
          <span className="library-resume-label">Continue where you left off</span>
          <strong>
            Game {continueLesson.gameNum}: {continueLesson.players.white} vs {continueLesson.players.black}
          </strong>
          <span className="library-resume-meta">
            {continueLesson.opening ?? continueLesson.section}
            {continuePct > 0 && continuePct < 100 ? ` · ${continuePct}%` : continuePct >= 100 ? " · complete" : ""}
          </span>
          <span className="library-resume-cta">Resume →</span>
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
          const isResumeBook = progress.lastLessonId?.startsWith(`${book.id}-`);

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
                {isResumeBook ? <span className="book-card-pill">In progress</span> : null}
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
                {book.gameCount} annotated games in this app
              </p>
              {book.sections && book.sections.length > 0 ? (
                <ul className="book-card-sections" aria-label="Book sections">
                  {book.sections.map((section) => (
                    <li key={section.title} title={section.blurb}>
                      <span className="book-card-section-name">{section.title}</span>
                      <span className="book-card-section-range">Games {section.range}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="book-card-footer">
                <div className="book-card-progress-wrap">
                  <div className="book-card-progress-bar" aria-hidden="true">
                    <span style={{ width: `${pctComplete}%` }} />
                  </div>
                  <span className="book-card-progress-label">
                    {completedCount} complete
                    {inProgressCount > 0 ? ` · ${inProgressCount} started` : ""}
                  </span>
                </div>
                <span className="book-card-open">Browse games →</span>
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
  onBack,
  onOpenLesson,
}: {
  book: BookMeta;
  lessons: LessonSummary[];
  onBack: () => void;
  onOpenLesson: (lesson: LessonSummary) => void;
}) {
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
      (l.eco?.toLowerCase().includes(q) ?? false)
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
          <button type="button" className="back-link library-back" onClick={onBack}>
            ← Library
          </button>
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
              Study all {book.gameCount} games with {book.author.split(" ").pop()}&apos;s commentary and a synced board.
            </p>
          )}
        </div>

        {continueLesson && (
          <button type="button" className="continue-card" onClick={() => onOpenLesson(continueLesson)}>
            <div className="continue-card-top">
              <span className="continue-label">
                {continuePct >= 100 ? "Review last game" : "Continue studying"}
              </span>
              <span className="continue-game-num">Game {continueLesson.gameNum}</span>
            </div>
            <strong>{continueLesson.players.white} vs {continueLesson.players.black}</strong>
            <div className="continue-meta">
              {continueLesson.opening && (
                <OpeningLabel name={continueLesson.opening} eco={continueLesson.eco} showTip={false} />
              )}
              {continueLesson.event && <span className="continue-event">{continueLesson.event}</span>}
            </div>
            <span className="continue-progress-text">
              {continuePct >= 100
                ? "Finished — open to review"
                : `Move ${progress.lastPly ?? 0} of ${continueLesson.moveCount}`}
            </span>
            <div className="card-progress">
              <div style={{ width: `${continuePct}%` }} />
            </div>
          </button>
        )}

        <div className="home-stats">
          <div className="stat-card">
            <strong>{lessons.length}</strong>
            <span>Games</span>
          </div>
          <div className="stat-card">
            <strong>{openingCount}</strong>
            <span>Openings</span>
          </div>
          <div className="stat-card">
            <strong>{completedCount}</strong>
            <span>Completed</span>
          </div>
          <div className="stat-card">
            <strong>{inProgressCount}</strong>
            <span>In progress</span>
          </div>
          {ratedGames > 0 && (
            <div className="stat-card" title="Average estimated playing strength across all rated players (Stockfish move-quality analysis)">
              <strong>{playerStats.length}</strong>
              <span>Rated players</span>
            </div>
          )}
        </div>
      </header>

      <section className="home-library" aria-labelledby="library-heading">
        <div className="library-head">
          <div>
            <h2 id="library-heading">Game index</h2>
            <p className="library-sub">
              {searchActive
                ? `${filtered.length} of ${lessons.length} games match your search`
                : elosLoading
                  ? "Loading estimated Elo ratings…"
                  : "All games in book order — click a row to open"}
            </p>
          </div>
          <div className="toolbar">
            <input
              type="search"
              placeholder="Search players, openings, cities…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search games"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="empty-search">No games match “{query.trim()}”.</p>
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
                        Games {meta.range} · {meta.blurb}
                      </p>
                    )}
                  </div>
                  <span className="section-count">{items.length} games</span>
                </div>

                <div className={`game-table${showEloColumn ? " has-elo" : ""} has-result`}>
                  <div className="game-table-head" aria-hidden="true">
                    <span className="col-num">#</span>
                    <span className="col-players">Players</span>
                    <span className="col-result">Result</span>
                    {showEloColumn && (
                      <span className="col-elo" title="Estimated playing strength from Stockfish move-quality analysis">
                        Est. Elo
                      </span>
                    )}
                    <span className="col-opening">Opening</span>
                    <span className="col-progress">Progress</span>
                  </div>
                  <div className="lesson-list" role="list">
                    {items.map((lesson) => {
                      const pct = getGameProgress(lesson.id);
                      const status = progressLabel(pct);
                      const performanceElo = performanceByLesson.get(lesson.id);
                      const winner = gameWinner(lesson.result);
                      return (
                        <button
                          key={lesson.id}
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
                              {" vs "}
                              <span className={resultWinnerClass("black", winner)}>
                                {formatPlayerWithElo(lesson.players.black, performanceElo?.black)}
                              </span>
                            </strong>
                            {lesson.event && <span className="lesson-event">{lesson.event}</span>}
                          </span>
                          <GameResultBadge result={lesson.result} />
                          {showEloColumn && (
                            <span className="lesson-elo" title="White · Black estimated Elo">
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

export function Home({ selectedBook, onSelectBook, onOpenLesson }: Props) {
  const [index, setIndex] = useState<LessonIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIndex()
      .then(setIndex)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!index) return <div className="loading">Loading library…</div>;

  if (!selectedBook) {
    return (
      <LibraryView
        index={index}
        onSelectBook={onSelectBook}
        onOpenLesson={onOpenLesson}
      />
    );
  }

  const book = index.books.find((b) => b.id === selectedBook);
  const lessons = index[selectedBook] ?? [];
  if (!book) return <p className="error">Book not found.</p>;

  return (
    <BookHomeView
      book={book}
      lessons={lessons}
      onBack={() => onSelectBook(null)}
      onOpenLesson={onOpenLesson}
    />
  );
}
