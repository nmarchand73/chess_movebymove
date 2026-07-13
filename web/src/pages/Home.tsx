import { useEffect, useMemo, useState } from "react";
import type { LessonSummary } from "../types";
import { OpeningLabel } from "../components/OpeningLabel";
import { GameResultBadge, gameWinner, resultWinnerClass } from "../components/GameResultBadge";
import { usePerformanceElos } from "../hooks/usePerformanceElos";
import { loadIndex } from "../lib/lessonLoader";
import { aggregatePlayerElos, formatPlayerWithElo } from "../lib/playerStats";
import { getGameProgress, loadProgress } from "../lib/progress";

type Props = {
  onOpenLesson: (lesson: LessonSummary) => void;
};

const SECTIONS: { title: string; range: string; blurb: string }[] = [
  {
    title: "The Kingside Attack",
    range: "1–16",
    blurb: "e4 openings and kingside attacks",
  },
  {
    title: "The Queen\u2019s Pawn Opening",
    range: "17–23",
    blurb: "d4 structures and queenside play",
  },
  {
    title: "The Chess Master Explains his Ideas",
    range: "24–33",
    blurb: "masterclass commentary",
  },
];

function sectionMeta(title: string) {
  return SECTIONS.find((s) => s.title === title);
}

function progressLabel(pct: number): string {
  if (pct >= 100) return "Complete";
  if (pct > 0) return `${pct}%`;
  return "Not started";
}

export function Home({ onOpenLesson }: Props) {
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const progress = loadProgress();
  const { performanceByLesson, loading: elosLoading } = usePerformanceElos();

  useEffect(() => {
    loadIndex()
      .then((idx) => setLessons(idx.chernov))
      .catch((e: Error) => setError(e.message));
  }, []);

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
    return SECTIONS
      .map((s) => [s.title, map.get(s.title) ?? []] as const)
      .filter(([, items]) => items.length > 0);
  }, [filtered]);

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

  const ratedGames = performanceByLesson.size;
  const showEloColumn = elosLoading || ratedGames > 0;

  const continueLesson = lessons.find((l) => l.id === progress.lastLessonId);
  const continuePct = continueLesson ? getGameProgress(continueLesson.id) : 0;
  const completedCount = lessons.filter((l) => getGameProgress(l.id) >= 100).length;
  const inProgressCount = lessons.filter((l) => {
    const pct = getGameProgress(l.id);
    return pct > 0 && pct < 100;
  }).length;
  const searchActive = query.trim().length > 0;

  if (error) return <p className="error">{error}</p>;
  if (!lessons.length) return <div className="loading">Loading library…</div>;

  return (
    <div className="home">
      <header className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">Irving Chernev · Batsford</p>
          <h1>Logical Chess<br />Move by Move</h1>
          <p className="hero-sub">
            Study all 33 games with Chernev&apos;s commentary and a synced board.
          </p>
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
            const meta = sectionMeta(section);
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
