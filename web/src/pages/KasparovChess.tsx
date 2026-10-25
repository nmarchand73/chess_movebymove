import { Chess } from "chess.js";
import { useEffect, useMemo, useState } from "react";
import type { KasparovChessCurriculum, KasparovExercise, LessonSummary } from "../types";
import { BoardPanel } from "../components/BoardPanel";
import type { Lang } from "../lib/lang";
import { checkKasparovMove } from "../lib/kasparovMoveMatch";
import {
  getExerciseProgress,
  kasparovProgressSummary,
  loadKasparovChessProgress,
  recordKasparovAttempt,
  resetKasparovChessProgress,
} from "../lib/kasparovChessProgress";
import { fill, ui } from "../lib/uiCopy";

type Props = {
  curriculum: KasparovChessCurriculum;
  lang: Lang;
  initialExerciseId?: string | null;
  lessonsById: Map<string, LessonSummary>;
  onOpenLesson: (lesson: LessonSummary) => void;
  onBack: () => void;
};

type Mode = "catalog" | "score" | "exercise";

function localized(
  text: { en: string; fr: string } | undefined,
  lang: Lang,
): string {
  if (!text) return "";
  return lang === "fr" ? text.fr || text.en : text.en || text.fr;
}

function exercisesForGame(curriculum: KasparovChessCurriculum, gameId: number) {
  return curriculum.exercises.filter((e) => e.game === gameId);
}

function resolveInitial(
  curriculum: KasparovChessCurriculum,
  initialExerciseId?: string | null,
): string | null {
  if (!initialExerciseId) return null;
  return curriculum.exercises.some((e) => e.id === initialExerciseId)
    ? initialExerciseId
    : null;
}

function exStatusClass(id: string): string {
  const s = getExerciseProgress(id);
  if (s.solved && s.firstTry) return "ok1";
  if (s.solved) return "ok";
  if (s.revealed) return "rev";
  return "";
}

export function KasparovChessPage({
  curriculum,
  lang,
  initialExerciseId,
  lessonsById,
  onOpenLesson,
  onBack,
}: Props) {
  const t = ui(lang);
  const resolved = resolveInitial(curriculum, initialExerciseId);
  const [mode, setMode] = useState<Mode>(resolved ? "exercise" : "catalog");
  const [exerciseId, setExerciseId] = useState<string | null>(resolved);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  /** When set, the book move is applied so the board keeps history (arrow + square rings). */
  const [playedSan, setPlayedSan] = useState<string | null>(null);
  const [progressTick, setProgressTick] = useState(0);

  const exercise = useMemo(
    () => curriculum.exercises.find((e) => e.id === exerciseId) ?? null,
    [curriculum.exercises, exerciseId],
  );

  useEffect(() => {
    setFeedback(null);
    if (!exercise) {
      setShowSolution(false);
      setPlayedSan(null);
      return;
    }
    const prior = getExerciseProgress(exercise.id);
    if (prior.solved || prior.revealed) {
      setShowSolution(true);
      setPlayedSan(exercise.expectedSan);
      setFeedback(
        prior.solved
          ? fill(t.kasparovCorrect, { san: exercise.expectedSan })
          : fill(t.kasparovRevealed, { san: exercise.expectedSan }),
      );
    } else {
      setShowSolution(false);
      setPlayedSan(null);
    }
  }, [exerciseId, exercise, t]);

  const progress = useMemo(() => {
    void progressTick;
    return loadKasparovChessProgress();
  }, [progressTick]);

  const summary = useMemo(() => {
    void progressTick;
    return kasparovProgressSummary(curriculum.exercises.map((e) => e.id));
  }, [curriculum.exercises, progressTick]);

  const boardChess = useMemo(() => {
    if (!exercise) return new Chess();
    try {
      const chess = new Chess(exercise.fen);
      if (playedSan) {
        chess.move(playedSan);
      }
      return chess;
    } catch {
      return new Chess();
    }
  }, [exercise, playedSan]);

  function bumpProgress() {
    setProgressTick((n) => n + 1);
  }

  function openExercise(id: string) {
    setExerciseId(id);
    setMode("exercise");
  }

  function goCatalog() {
    setMode("catalog");
    setExerciseId(null);
  }

  function applyGuessResult(
    ex: KasparovExercise,
    result: ReturnType<typeof checkKasparovMove>,
  ): boolean {
    if (result.status === "unknown") {
      setFeedback(t.couldNotParse);
      return false;
    }
    if (result.status === "correct") {
      recordKasparovAttempt(ex.id, "correct");
      bumpProgress();
      setFeedback(fill(t.kasparovCorrect, { san: result.san }));
      setShowSolution(true);
      setPlayedSan(result.san);
      return true;
    }
    recordKasparovAttempt(ex.id, "wrong");
    bumpProgress();
    setFeedback(t.kasparovWrong);
    return false;
  }

  function handleBoardMove(ex: KasparovExercise, from: string, to: string): boolean {
    if (doneLockedFor(ex)) return false;
    const probe = new Chess(ex.fen);
    let played;
    try {
      played = probe.move({ from, to, promotion: "q" });
    } catch {
      played = null;
    }
    if (!played) {
      setFeedback(t.illegalMove);
      return false;
    }
    const uci = `${played.from}${played.to}${played.promotion ?? ""}`;
    return applyGuessResult(ex, checkKasparovMove(uci, ex.legal, ex.expectedUci));
  }

  function reveal(ex: KasparovExercise) {
    recordKasparovAttempt(ex.id, "reveal");
    bumpProgress();
    setShowSolution(true);
    setFeedback(fill(t.kasparovRevealed, { san: ex.expectedSan }));
    setPlayedSan(ex.expectedSan);
  }

  function doneLockedFor(ex: KasparovExercise): boolean {
    const s = getExerciseProgress(ex.id);
    return Boolean(s.solved || s.revealed || showSolution);
  }

  function nextUndone(): KasparovExercise | null {
    return (
      curriculum.exercises.find((e) => {
        const s = getExerciseProgress(e.id);
        return !(s.solved || s.revealed);
      }) ?? null
    );
  }

  const currentProg = exercise ? getExerciseProgress(exercise.id, progress) : null;
  const doneLocked = exercise ? doneLockedFor(exercise) : false;

  return (
    <div className="kasparov-chess opening-revision">
      <header className="opening-revision-header kasparov-header">
        <button type="button" className="text-btn" onClick={onBack}>
          {t.backLibrary}
        </button>
        <div>
          <h1>{localized(curriculum.title, lang)}</h1>
          <p className="kasparov-progress-line">
            {fill(t.kasparovProgress, {
              done: summary.done,
              total: curriculum.exercises.length,
              first: summary.firstTry,
              pts: summary.points,
              max: summary.maxPoints,
            })}
          </p>
        </div>
      </header>

      <nav className="opening-revision-nav" aria-label={t.kasparovNav}>
        <button
          type="button"
          className={mode === "catalog" ? "is-active" : undefined}
          onClick={goCatalog}
        >
          {t.kasparovCatalog}
        </button>
        <button
          type="button"
          className={mode === "score" ? "is-active" : undefined}
          onClick={() => setMode("score")}
        >
          {t.kasparovScore}
        </button>
        {exercise ? (
          <button type="button" className="is-active" disabled>
            {fill(t.kasparovExerciseN, { n: exercise.id })}
          </button>
        ) : null}
      </nav>

      {mode === "catalog" ? (
        <div className="kasparov-catalog">
          <p className="kasparov-method">{localized(curriculum.methodNote, lang)}</p>
          <div className="kasparov-catalog-actions">
            {(() => {
              const next = nextUndone();
              return next ? (
                <button type="button" onClick={() => openExercise(next.id)}>
                  {summary.done
                    ? fill(t.kasparovContinue, { n: next.id })
                    : fill(t.kasparovStart, { n: next.id })}
                </button>
              ) : (
                <button type="button" onClick={() => setMode("score")}>
                  {t.kasparovScore}
                </button>
              );
            })()}
            <button
              type="button"
              className="secondary"
              onClick={() => {
                if (window.confirm(t.kasparovResetConfirm)) {
                  resetKasparovChessProgress();
                  bumpProgress();
                }
              }}
            >
              {t.kasparovReset}
            </button>
          </div>

          <div className="kasparov-games">
            {curriculum.games.map((game) => {
              const exs = exercisesForGame(curriculum, game.id);
              const linked = game.gameIds
                .map((id) => lessonsById.get(id))
                .filter((l): l is LessonSummary => Boolean(l));
              return (
                <article key={game.id} className="kasparov-game-card">
                  <h2>
                    {fill(t.kasparovGameN, { n: game.id })} — {exs[0]?.gameTitle ?? `${game.white} – ${game.black}`}
                  </h2>
                  <p className="kasparov-game-meta">
                    <span>{localized(game.opening, lang)}</span>
                    <span>{game.result}</span>
                    <span>{game.date}</span>
                    {exs[0]?.sideToMove === "black" ? (
                      <span>{t.kasparovPlayBlack}</span>
                    ) : null}
                  </p>
                  {game.intro ? (
                    <p className="kasparov-game-intro">{localized(game.intro, lang)}</p>
                  ) : null}
                  <div className="kasparov-exlist">
                    {exs.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        className={`kasparov-ex-chip ${exStatusClass(e.id)}`}
                        title={localized(e.cue, lang)}
                        onClick={() => openExercise(e.id)}
                      >
                        {e.id}
                      </button>
                    ))}
                  </div>
                  {linked.length > 0 ? (
                    <ul className="kasparov-linked">
                      {linked.map((lesson) => (
                        <li key={lesson.id}>
                          <button type="button" className="text-btn" onClick={() => onOpenLesson(lesson)}>
                            {lesson.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              );
            })}
          </div>
          <p className="kasparov-legend">{t.kasparovLegend}</p>
        </div>
      ) : null}

      {mode === "score" ? (
        <div className="kasparov-score">
          <p>
            {fill(t.kasparovProgress, {
              done: summary.done,
              total: curriculum.exercises.length,
              first: summary.firstTry,
              pts: summary.points,
              max: summary.maxPoints,
            })}
          </p>
          <table className="kasparov-score-table">
            <thead>
              <tr>
                <th>{t.kasparovColId}</th>
                <th>{t.kasparovColGame}</th>
                <th>{t.kasparovColStatus}</th>
                <th>{t.kasparovColPoints}</th>
              </tr>
            </thead>
            <tbody>
              {curriculum.exercises.map((e) => {
                const s = getExerciseProgress(e.id, progress);
                let status = t.notStarted;
                if (s.solved && s.firstTry) status = t.kasparovStatusFirst;
                else if (s.solved) status = t.kasparovStatusSolved;
                else if (s.revealed) status = t.kasparovStatusRevealed;
                return (
                  <tr key={e.id}>
                    <td>
                      <button type="button" className="text-btn" onClick={() => openExercise(e.id)}>
                        {e.id}
                      </button>
                    </td>
                    <td>{e.game}</td>
                    <td>{status}</td>
                    <td>{s.points ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {mode === "exercise" && exercise ? (
        <div className="kasparov-exercise">
          <button type="button" className="text-btn" onClick={goCatalog}>
            {t.kasparovBackCatalog}
          </button>
          <h2>
            {fill(t.kasparovExerciseN, { n: exercise.id })} · {fill(t.kasparovStudyN, { n: exercise.study })}
          </h2>
          <p className="kasparov-game-title">{exercise.gameTitle}</p>
          <p className="kasparov-cue">{localized(exercise.cue, lang)}</p>
          <p className="kasparov-task">{localized(exercise.task, lang)}</p>
          {exercise.prompt ? (
            <blockquote className="kasparov-book-quote">
              <span className="kasparov-book-label">{t.kasparovBookPrompt}</span>
              {localized(exercise.prompt, lang)}
            </blockquote>
          ) : null}

          <div className="kasparov-exercise-layout">
            <BoardPanel
              chess={boardChess}
              orientation={exercise.boardOrientation}
              lang={lang}
              allowMove={!doneLocked}
              onPlayerMove={(from, to) => handleBoardMove(exercise, from, to)}
            />
            <div className="kasparov-guess-panel">
              <p className="kasparov-guess-label">{t.yourMove}</p>
              <p className="kasparov-play-hint">{t.onScreenBoard}</p>
              <div className="kasparov-guess-row">
                <button
                  type="button"
                  className="secondary"
                  disabled={doneLocked}
                  onClick={() => reveal(exercise)}
                >
                  {t.show}
                </button>
              </div>
              {feedback ? (
                <p className={`kasparov-feedback${showSolution && currentProg?.solved ? " is-ok" : ""}`}>
                  {feedback}
                </p>
              ) : null}
              <p className="kasparov-level">
                {fill(t.kasparovLevel, { n: exercise.recommendedLevel })}
              </p>
              {showSolution || currentProg?.solved || currentProg?.revealed ? (
                <div className="kasparov-solution">
                  <p>
                    <strong>{exercise.expectedSan}</strong>
                    {exercise.expectedUci ? ` · ${exercise.expectedUci}` : ""}
                  </p>
                  {exercise.solution ? (
                    <blockquote className="kasparov-book-quote">
                      <span className="kasparov-book-label">{t.kasparovBookSolution}</span>
                      {localized(exercise.solution, lang)}
                    </blockquote>
                  ) : (
                    <p className="muted">{t.kasparovNoBookSolution}</p>
                  )}
                </div>
              ) : null}
              <div className="kasparov-ex-nav">
                {(() => {
                  const idx = curriculum.exercises.findIndex((e) => e.id === exercise.id);
                  const prev = idx > 0 ? curriculum.exercises[idx - 1] : null;
                  const next = idx >= 0 && idx < curriculum.exercises.length - 1
                    ? curriculum.exercises[idx + 1]
                    : null;
                  return (
                    <>
                      <button
                        type="button"
                        className="secondary"
                        disabled={!prev}
                        onClick={() => prev && openExercise(prev.id)}
                      >
                        {t.previousMove}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        disabled={!next}
                        onClick={() => next && openExercise(next.id)}
                      >
                        {t.nextMove}
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
