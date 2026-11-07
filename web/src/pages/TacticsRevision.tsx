import { Chess } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TacticsExercise, TacticsModule, TacticsRevisionCurriculum } from "../types";
import { BoardPanel } from "../components/BoardPanel";
import { ChessnutConnectBar } from "../components/ChessnutConnectBar";
import { ChessUpConnectBar } from "../components/ChessUpConnectBar";
import { useChessnutBoard } from "../hooks/useChessnutBoard";
import { useChessUpBoard } from "../hooks/useChessUpBoard";
import { buildBoardGuide, guideLedSquares } from "../lib/boardGuide";
import { chessUpAssistanceClear } from "../lib/chessUpAssistance";
import { chessUpMoveMatchesSan } from "../lib/chessUpMove";
import { checkKasparovMove } from "../lib/kasparovMoveMatch";
import type { Lang } from "../lib/lang";
import { legalMoveMatchingPlacement } from "../lib/physicalGuess";
import {
  getTacticsExerciseProgress,
  loadTacticsRevisionProgress,
  markTacticsModuleSeen,
  modulePracticeSummary,
  recordTacticsAttempt,
  seenTacticsModuleCount,
} from "../lib/tacticsRevisionProgress";
import { formatBookExcerpt } from "../lib/bookExcerptFormat";
import { fill, ui } from "../lib/uiCopy";

type Props = {
  curriculum: TacticsRevisionCurriculum;
  lang: Lang;
  initialModuleId?: string | null;
  initialSectionId?: string | null;
  onBack: () => void;
};

type Mode = "catalog" | "teach" | "practice";

function localized(text: { en: string; fr: string }, lang: Lang): string {
  return lang === "fr" ? text.fr : text.en;
}

function BookExcerptSection({
  excerpt,
  heading,
  notesHeading,
  collapsedLabel,
}: {
  excerpt: string;
  heading: string;
  notesHeading: string;
  collapsedLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const { paragraphs, notes } = useMemo(() => formatBookExcerpt(excerpt), [excerpt]);
  if (!paragraphs.length && !notes.length) return null;

  return (
    <details
      className="opening-book-excerpt tactics-book-excerpt"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <span className="tactics-book-excerpt-title">{heading}</span>
        <span className="tactics-book-excerpt-hint">{collapsedLabel}</span>
      </summary>
      {open ? (
        <>
          <div className="opening-book-excerpt-body">
            {paragraphs.map((paragraph, index) => (
              <p key={`p-${index}`}>{paragraph}</p>
            ))}
          </div>
          {notes.length > 0 ? (
            <div className="opening-book-excerpt-notes">
              <h4>{notesHeading}</h4>
              <ol>
                {notes.map((note, index) => (
                  <li key={`n-${index}`}>{note}</li>
                ))}
              </ol>
            </div>
          ) : null}
        </>
      ) : null}
    </details>
  );
}

function exampleLabel(
  ex: { id: string; label?: string | null },
  indexInPhase: number,
  fallback: string,
): string {
  if (ex.label?.trim()) return ex.label.trim();
  return fallback.replace("{n}", String(indexInPhase + 1));
}

function phaseLabelFor(
  phase: "lesson" | "technique" | "quiz",
  t: ReturnType<typeof ui>,
): string {
  switch (phase) {
    case "lesson":
      return t.tacticsRevisionPhaseLesson;
    case "technique":
      return t.tacticsRevisionPhaseTechnique;
    case "quiz":
      return t.tacticsRevisionPhaseQuiz;
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

function formatModuleCounts(
  examples: number,
  drills: number,
  t: ReturnType<typeof ui>,
): string {
  const diagrams =
    examples === 1
      ? fill(t.tacticsRevisionCountDiagram, { n: examples })
      : fill(t.tacticsRevisionCountDiagrams, { n: examples });
  const drillPart =
    drills === 1
      ? fill(t.tacticsRevisionCountDrill, { n: drills })
      : fill(t.tacticsRevisionCountDrills, { n: drills });
  return `${diagrams} · ${drillPart}`;
}

function chessAtLine(fen: string, sans: string[], ply: number): Chess {
  const chess = new Chess(fen);
  for (const san of sans.slice(0, ply)) {
    chess.move(san);
  }
  return chess;
}

function sourceBadge(book: string, ref: string, wcLabel: string): string {
  if (book === "winning-chess") return wcLabel;
  if (book === "predator") return ref ? `Predator · ${ref}` : "Predator";
  return ref ? `${book} · ${ref}` : book;
}

export function TacticsRevisionPage({
  curriculum,
  lang,
  initialModuleId,
  initialSectionId,
  onBack,
}: Props) {
  const t = ui(lang);
  const [mode, setMode] = useState<Mode>(initialModuleId ? "teach" : "catalog");
  const [moduleId, setModuleId] = useState<string | null>(initialModuleId ?? null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [linePly, setLinePly] = useState(0);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [progressTick, setProgressTick] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [playedSan, setPlayedSan] = useState<string | null>(null);
  const [practiceDone, setPracticeDone] = useState(false);
  const [awaitingPhysicalSync, setAwaitingPhysicalSync] = useState(false);
  const lastWrongGuessPlacement = useRef<string | null>(null);
  const lastAcceptedPlacement = useRef<string | null>(null);
  const landedSectionRef = useRef(false);

  const progress = useMemo(() => {
    void progressTick;
    return loadTacticsRevisionProgress();
  }, [progressTick]);

  const module: TacticsModule | null = useMemo(
    () => curriculum.modules.find((m) => m.id === moduleId) ?? null,
    [curriculum.modules, moduleId],
  );

  const exercises: TacticsExercise[] = useMemo(() => {
    if (!module) return [];
    return module.exerciseIds
      .map((id) => curriculum.exercises.find((e) => e.id === id))
      .filter((e): e is TacticsExercise => Boolean(e));
  }, [curriculum.exercises, module]);

  const exercise = exercises[exerciseIndex] ?? null;

  const example = module?.examples[exampleIndex] ?? null;
  const teachChess = useMemo(() => {
    if (!example) return new Chess();
    return chessAtLine(example.fen, example.sans, linePly);
  }, [example, linePly]);

  const studyChess = useMemo(() => {
    if (!exercise) return new Chess();
    const c = new Chess(exercise.fen);
    if (playedSan) {
      try {
        c.move(playedSan);
      } catch {
        /* keep start */
      }
    }
    return c;
  }, [exercise, playedSan]);

  const studyPlacement = studyChess.fen().split(" ")[0]!;
  const chessnut = useChessnutBoard();
  const chessup = useChessUpBoard();
  const physicalConnected =
    chessnut.status === "connected" || chessup.status === "connected";
  const physicalSource =
    chessup.status === "connected" ? "chessup" : chessnut.status === "connected" ? "chessnut" : null;
  const physicalPlacement =
    physicalSource === "chessup"
      ? chessup.placement
      : physicalSource === "chessnut"
        ? chessnut.placement
        : null;

  function scrollPageToTop() {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function openModule(id: string) {
    setModuleId(id);
    markTacticsModuleSeen(id);
    setProgressTick((n) => n + 1);
    setExampleIndex(0);
    setLinePly(0);
    setMode("teach");
    setFeedback(null);
    setShowSolution(false);
    setPlayedSan(null);
    setPracticeDone(false);
    setExerciseIndex(0);
    scrollPageToTop();
  }

  function startPractice() {
    if (!module || exercises.length === 0) return;
    setMode("practice");
    setExerciseIndex(0);
    setFeedback(null);
    setShowSolution(false);
    setPlayedSan(null);
    setPracticeDone(false);
    lastWrongGuessPlacement.current = null;
    lastAcceptedPlacement.current = null;
    scrollPageToTop();
  }

  const doneLocked = Boolean(
    exercise &&
      (getTacticsExerciseProgress(exercise.id).solved ||
        getTacticsExerciseProgress(exercise.id).revealed ||
        showSolution),
  );

  const applyGuessResult = useCallback(
    (ex: TacticsExercise, result: ReturnType<typeof checkKasparovMove>): boolean => {
      if (result.status === "unknown") {
        setFeedback(t.couldNotParse);
        return false;
      }
      if (result.status === "correct") {
        recordTacticsAttempt(ex.id, "correct");
        setProgressTick((n) => n + 1);
        setFeedback(fill(t.tacticsRevisionCorrect, { san: result.san }));
        setShowSolution(true);
        setPlayedSan(result.san);
        setAwaitingPhysicalSync(false);
        return true;
      }
      recordTacticsAttempt(ex.id, "wrong");
      setProgressTick((n) => n + 1);
      setFeedback(t.tacticsRevisionWrong);
      return false;
    },
    [t],
  );

  function handleBoardMove(ex: TacticsExercise, from: string, to: string): boolean {
    if (doneLocked) return false;
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

  function reveal(ex: TacticsExercise) {
    recordTacticsAttempt(ex.id, "reveal");
    setProgressTick((n) => n + 1);
    setShowSolution(true);
    setFeedback(fill(t.tacticsRevisionRevealed, { san: ex.expectedSan }));
    setPlayedSan(ex.expectedSan);
    setAwaitingPhysicalSync(false);
  }

  function goNextExercise() {
    if (exerciseIndex + 1 >= exercises.length) {
      setPracticeDone(true);
      return;
    }
    setExerciseIndex((i) => i + 1);
    setFeedback(null);
    setShowSolution(false);
    setPlayedSan(null);
    lastWrongGuessPlacement.current = null;
    lastAcceptedPlacement.current = null;
  }

  function nextModuleId(): string | null {
    const ids = curriculum.modules.map((m) => m.id);
    if (!moduleId) return ids[0] ?? null;
    const i = ids.indexOf(moduleId);
    return ids[i + 1] ?? null;
  }

  useEffect(() => {
    if (!exercise || mode !== "practice" || doneLocked) {
      setAwaitingPhysicalSync(false);
      return;
    }
    setAwaitingPhysicalSync(physicalConnected);
  }, [exercise, exerciseIndex, mode, physicalConnected, doneLocked]);

  useEffect(() => {
    if (!awaitingPhysicalSync || !physicalPlacement || !studyPlacement) return;
    if (physicalPlacement === studyPlacement) {
      setAwaitingPhysicalSync(false);
      lastWrongGuessPlacement.current = null;
    }
  }, [awaitingPhysicalSync, physicalPlacement, studyPlacement]);

  useEffect(() => {
    if (physicalSource !== "chessup" || !exercise || mode !== "practice" || doneLocked) return;
    return chessup.onMove((move) => {
      if (awaitingPhysicalSync) return;
      if (chessUpMoveMatchesSan(studyChess, exercise.expectedSan, move)) {
        applyGuessResult(
          exercise,
          checkKasparovMove(exercise.expectedUci, exercise.legal, exercise.expectedUci),
        );
        return;
      }
      applyGuessResult(
        exercise,
        checkKasparovMove(`${move.from}${move.to}`, exercise.legal, exercise.expectedUci),
      );
    });
  }, [
    physicalSource,
    chessup.onMove,
    exercise,
    mode,
    doneLocked,
    awaitingPhysicalSync,
    studyChess,
    applyGuessResult,
  ]);

  useEffect(() => {
    if (!physicalConnected || !physicalPlacement || !exercise || mode !== "practice") return;
    if (physicalSource === "chessup") return;
    if (doneLocked || awaitingPhysicalSync) return;
    if (physicalPlacement === studyPlacement) {
      lastWrongGuessPlacement.current = null;
      return;
    }
    if (physicalPlacement === lastAcceptedPlacement.current) return;
    const guess = legalMoveMatchingPlacement(exercise.fen, physicalPlacement);
    if (!guess) return;
    if (guess.san === exercise.expectedSan) {
      lastAcceptedPlacement.current = physicalPlacement;
      applyGuessResult(
        exercise,
        checkKasparovMove(exercise.expectedUci, exercise.legal, exercise.expectedUci),
      );
      return;
    }
    if (lastWrongGuessPlacement.current !== physicalPlacement) {
      lastWrongGuessPlacement.current = physicalPlacement;
      applyGuessResult(
        exercise,
        checkKasparovMove(guess.san, exercise.legal, exercise.expectedUci),
      );
    }
  }, [
    physicalConnected,
    physicalSource,
    physicalPlacement,
    exercise,
    mode,
    doneLocked,
    awaitingPhysicalSync,
    studyPlacement,
    applyGuessResult,
  ]);

  const boardGuide = useMemo(() => {
    if (!physicalConnected || !exercise || mode !== "practice") return null;
    return buildBoardGuide({
      boardPlacement: physicalPlacement,
      lessonPlacement: studyPlacement,
      nextSan: doneLocked ? null : exercise.expectedSan,
      chess: new Chess(exercise.fen),
      atEnd: doneLocked,
      requireExactSync: awaitingPhysicalSync,
      hideNextMove: !doneLocked,
    });
  }, [
    physicalConnected,
    physicalPlacement,
    exercise,
    mode,
    studyPlacement,
    doneLocked,
    awaitingPhysicalSync,
  ]);

  useEffect(() => {
    if (physicalSource !== "chessnut") {
      if (chessnut.status === "connected") void chessnut.setLeds([]);
      return;
    }
    if (!boardGuide) {
      void chessnut.setLeds([]);
      return;
    }
    void chessnut.setLeds(guideLedSquares(boardGuide));
  }, [boardGuide, chessnut.setLeds, chessnut.status, physicalSource]);

  useEffect(() => {
    if (physicalSource !== "chessup") return;
    void chessup.sendAssistance(chessUpAssistanceClear());
  }, [physicalSource, exercise, exerciseIndex, chessup.sendAssistance]);

  useEffect(() => {
    const shouldLandOnSection =
      mode === "catalog" && Boolean(initialSectionId) && !landedSectionRef.current;
    if (!shouldLandOnSection) {
      scrollPageToTop();
      return;
    }
    landedSectionRef.current = true;
    const targetId = `tactics-section-${initialSectionId}`;
    const scrollToSection = (attempts = 0) => {
      const el = document.getElementById(targetId);
      if (!el) {
        if (attempts < 12) {
          requestAnimationFrame(() => scrollToSection(attempts + 1));
          return;
        }
        scrollPageToTop();
        return;
      }
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, top - 8), left: 0, behavior: "auto" });
    };
    requestAnimationFrame(() => scrollToSection());
  }, [mode, moduleId, initialSectionId]);

  const seen = seenTacticsModuleCount(progress);
  const coachStep =
    example && linePly === 0
      ? example.coach
      : example?.stepCoaches?.[linePly - 1] ?? example?.coach;

  const practiceSummary = module
    ? modulePracticeSummary(module.exerciseIds, progress)
    : { done: 0, points: 0, max: 0 };

  const teachOrPractice = mode === "teach" || mode === "practice";

  return (
    <div
      className={`opening-revision tactics-revision${teachOrPractice ? " is-lesson" : ""}`}
    >
      <header className="opening-revision-header tactics-revision-header">
        <button type="button" className="text-btn" onClick={onBack}>
          {t.backLibrary}
        </button>
        {teachOrPractice && module ? (
          <div className="opening-revision-header-copy">
            <p className="eyebrow">{localized(curriculum.title, lang)}</p>
            <h1>{localized(module.names, lang)}</h1>
          </div>
        ) : (
          <div className="opening-revision-header-copy">
            <p className="eyebrow">{localized(curriculum.title, lang)}</p>
            <h1>{t.tacticsRevisionHeadline}</h1>
            <p className="opening-revision-lead">
              {fill(t.tacticsRevisionProgress, { seen, total: curriculum.modules.length })}
            </p>
          </div>
        )}
        <nav className="opening-revision-nav" aria-label={t.tacticsRevisionNav}>
          <button
            type="button"
            className={mode === "catalog" ? "is-active" : ""}
            onClick={() => setMode("catalog")}
          >
            {t.tacticsRevisionCatalog}
          </button>
          {module ? (
            <button
              type="button"
              className={mode === "teach" ? "is-active" : ""}
              onClick={() => setMode("teach")}
            >
              {t.tacticsRevisionTeachNav}
            </button>
          ) : null}
          {module && module.exerciseIds.length > 0 ? (
            <button
              type="button"
              className={mode === "practice" ? "is-active" : ""}
              onClick={startPractice}
            >
              {t.tacticsRevisionPracticeNav}
            </button>
          ) : null}
        </nav>
      </header>

      {mode === "catalog" ? (
        <div className="opening-revision-catalog tactics-catalog">
          {(() => {
            const next =
              curriculum.modules.find((m) => !progress.seenModules[m.id]) ??
              curriculum.modules[0];
            return (
              <div className="tactics-catalog-intro">
                <p className="tactics-catalog-method">{localized(curriculum.methodNote, lang)}</p>
                {next ? (
                  <button
                    type="button"
                    className="primary-btn tactics-catalog-continue"
                    onClick={() => openModule(next.id)}
                  >
                    {fill(t.tacticsRevisionContinueAs, {
                      name: localized(next.names, lang),
                    })}
                  </button>
                ) : null}
              </div>
            );
          })()}
          {curriculum.sections.map((section) => (
            <section
              key={section.id}
              id={`tactics-section-${section.id}`}
              className="opening-revision-section tactics-catalog-section"
            >
              <h2>{localized(section.title, lang)}</h2>
              <ul className="opening-module-grid tactics-catalog-grid">
                {section.moduleIds.map((id) => {
                  const mod = curriculum.modules.find((m) => m.id === id);
                  if (!mod) return null;
                  const summary = modulePracticeSummary(mod.exerciseIds, progress);
                  const title = localized(mod.names, lang);
                  const themes = (lang === "fr" ? mod.themes.fr : mod.themes.en).filter(
                    (theme) => theme.trim().toLowerCase() !== title.trim().toLowerCase(),
                  );
                  const seen = Boolean(progress.seenModules[mod.id]);
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        className={`opening-module-card tactics-catalog-card${seen ? " is-seen" : ""}`}
                        onClick={() => openModule(id)}
                      >
                        <strong>{title}</strong>
                        <span className="opening-module-plan">{localized(mod.plan, lang)}</span>
                        {themes.length > 0 ? (
                          <span className="tactics-catalog-themes">
                            {themes.slice(0, 3).join(" · ")}
                            {themes.length > 3 ? "…" : ""}
                          </span>
                        ) : null}
                        <span className="tactics-catalog-card-foot">
                          <span className="opening-module-ref">
                            {formatModuleCounts(mod.examples.length, mod.exerciseIds.length, t)}
                          </span>
                          <span className="tactics-catalog-card-status">
                            {seen ? (
                              <span className="opening-module-seen">{t.tacticsRevisionSeen}</span>
                            ) : null}
                            {summary.done > 0 ? (
                              <span className="opening-module-seen">
                                {fill(t.tacticsRevisionModuleScore, {
                                  done: summary.done,
                                  total: mod.exerciseIds.length,
                                  pts: summary.points,
                                })}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : null}

      {mode === "teach" && module && example ? (
        <div className="tactics-teach-layout">
          <aside className="tactics-teach-board">
            <BoardPanel chess={teachChess} lang={lang} allowMove={false} />
            {example.sans.length > 0 ? (
              <div className="opening-line-scrubber">
                <button
                  type="button"
                  disabled={linePly <= 0}
                  onClick={() => setLinePly((p) => Math.max(0, p - 1))}
                >
                  ‹
                </button>
                <span>
                  {linePly === 0
                    ? t.tacticsRevisionLineStart
                    : fill(t.tacticsRevisionLineProgress, {
                        x: linePly,
                        y: example.sans.length,
                      })}
                </span>
                <button
                  type="button"
                  disabled={linePly >= example.sans.length}
                  onClick={() => setLinePly((p) => Math.min(example.sans.length, p + 1))}
                >
                  ›
                </button>
              </div>
            ) : (
              <p className="tactics-line-static">{t.tacticsRevisionLineStart}</p>
            )}
          </aside>

          <div className="tactics-teach-copy">
            <header className="tactics-teach-header">
              <p className="tactics-idea">{localized(module.plan, lang)}</p>
              <p className="tactics-source-line">
                {module.sources
                  .map((s) => sourceBadge(s.book, s.ref, t.tacticsRevisionSourceWc))
                  .join(" · ")}
                {" · "}
                {formatModuleCounts(module.examples.length, module.exerciseIds.length, t)}
              </p>
            </header>

            {(() => {
              const phase = example.phase ?? "lesson";
              const phaseOrder = (["lesson", "technique", "quiz"] as const).filter((p) =>
                module.examples.some((ex) => (ex.phase ?? "lesson") === p),
              );
              const phaseItems = module.examples
                .map((ex, i) => ({ ex, i }))
                .filter(({ ex }) => (ex.phase ?? "lesson") === phase);
              const phaseLocalIndex = Math.max(
                0,
                phaseItems.findIndex(({ i }) => i === exampleIndex),
              );
              return (
                <section className="tactics-examples" aria-label={t.tacticsRevisionExamples}>
                  {phaseOrder.length > 1 ? (
                    <div className="tactics-phase-tabs" role="tablist">
                      {phaseOrder.map((p) => {
                        const first = module.examples.findIndex(
                          (ex) => (ex.phase ?? "lesson") === p,
                        );
                        const active = phase === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            className={active ? "is-active" : ""}
                            onClick={() => {
                              setExampleIndex(first);
                              setLinePly(0);
                            }}
                          >
                            {phaseLabelFor(p, t)}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="tactics-example-nav">
                    <button
                      type="button"
                      className="secondary"
                      disabled={exampleIndex <= 0}
                      aria-label={t.tacticsRevisionPrevExample}
                      onClick={() => {
                        setExampleIndex((i) => Math.max(0, i - 1));
                        setLinePly(0);
                      }}
                    >
                      ‹
                    </button>
                    <label className="tactics-example-jump">
                      <span className="visually-hidden">{t.tacticsRevisionJumpExample}</span>
                      <select
                        value={exampleIndex}
                        aria-label={t.tacticsRevisionJumpExample}
                        onChange={(event) => {
                          setExampleIndex(Number(event.target.value));
                          setLinePly(0);
                        }}
                      >
                        {phaseItems.map(({ ex, i }, local) => (
                          <option key={ex.id} value={i}>
                            {exampleLabel(ex, local, t.tacticsRevisionExampleN)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="tactics-example-count" aria-hidden="true">
                      {phaseLocalIndex + 1}/{phaseItems.length}
                    </span>
                    <button
                      type="button"
                      className="secondary"
                      disabled={exampleIndex >= module.examples.length - 1}
                      aria-label={t.tacticsRevisionNextExample}
                      onClick={() => {
                        setExampleIndex((i) => Math.min(module.examples.length - 1, i + 1));
                        setLinePly(0);
                      }}
                    >
                      ›
                    </button>
                  </div>
                </section>
              );
            })()}

            {coachStep ? (
              <section className="tactics-coach" aria-label={t.tacticsRevisionCoach}>
                <p className="eyebrow">{t.tacticsRevisionCoach}</p>
                <div className="opening-book-excerpt-body">
                  {formatBookExcerpt(localized(coachStep, lang)).paragraphs.map(
                    (paragraph, index) => (
                      <p key={`coach-${index}`}>{paragraph}</p>
                    ),
                  )}
                </div>
              </section>
            ) : null}

            <footer className="tactics-teach-footer">
              {module.exerciseIds.length > 0 ? (
                <button type="button" className="primary-btn" onClick={startPractice}>
                  {t.tacticsRevisionPractice}
                </button>
              ) : null}
              {(() => {
                const excerpt =
                  lang === "fr"
                    ? module.bookExcerpt?.excerptFr || module.bookExcerpt?.excerptEn
                    : module.bookExcerpt?.excerptEn || module.bookExcerpt?.excerptFr;
                if (!excerpt) return null;
                return (
                  <BookExcerptSection
                    excerpt={excerpt}
                    heading={t.tacticsRevisionBookExcerpt}
                    notesHeading={t.tacticsRevisionBookNotes}
                    collapsedLabel={t.tacticsRevisionBookToggle}
                  />
                );
              })()}
            </footer>
          </div>
        </div>
      ) : null}

      {mode === "practice" && module ? (
        <div className="kasparov-exercise-layout">
          {practiceDone ? (
            <section className="opening-quiz">
              <p>
                {fill(t.tacticsRevisionDone, {
                  pts: practiceSummary.points,
                  max: practiceSummary.max,
                })}
              </p>
              <div className="kasparov-catalog-actions">
                <button type="button" onClick={() => setMode("teach")}>
                  {t.tacticsRevisionBackTeach}
                </button>
                {nextModuleId() ? (
                  <button type="button" className="primary-btn" onClick={() => openModule(nextModuleId()!)}>
                    {t.tacticsRevisionNextMotif}
                  </button>
                ) : (
                  <button type="button" onClick={() => setMode("catalog")}>
                    {t.tacticsRevisionBackCatalog}
                  </button>
                )}
              </div>
            </section>
          ) : exercise ? (
            <>
              <div className="opening-module-board">
                <BoardPanel
                  chess={studyChess}
                  lang={lang}
                  allowMove={!doneLocked}
                  orientation={exercise.boardOrientation}
                  onPlayerMove={(from, to) => handleBoardMove(exercise, from, to)}
                />
              </div>
              <div className="kasparov-guess-panel">
                <p className="eyebrow">
                  {fill(t.tacticsRevisionPracticeProgress, {
                    x: exerciseIndex + 1,
                    y: exercises.length,
                  })}
                </p>
                <h2>{localized(module.names, lang)}</h2>
                <p>{localized(exercise.cue, lang)}</p>
                <p>{localized(exercise.task, lang)}</p>
                {exercise.prompt ? (
                  <div className="opening-book-excerpt-body">
                    {formatBookExcerpt(localized(exercise.prompt, lang)).paragraphs.map(
                      (paragraph, index) => (
                        <p key={`prompt-${index}`} className="kasparov-game-intro">
                          {paragraph}
                        </p>
                      ),
                    )}
                  </div>
                ) : null}
                <p className="opening-quiz-play-hint">
                  {physicalConnected ? t.onChessnut : t.tacticsRevisionPlayMove}
                </p>
                {feedback ? (
                  <p className={`opening-quiz-move-feedback${doneLocked ? " is-ok" : ""}`}>
                    {feedback}
                  </p>
                ) : null}
                <div className="kasparov-catalog-actions">
                  {!doneLocked ? (
                    <button type="button" className="secondary" onClick={() => reveal(exercise)}>
                      {t.tacticsRevisionReveal}
                    </button>
                  ) : (
                    <button type="button" className="primary-btn" onClick={goNextExercise}>
                      {t.tacticsRevisionNext}
                    </button>
                  )}
                  <button type="button" className="text-btn" onClick={() => setMode("teach")}>
                    {t.tacticsRevisionBackTeach}
                  </button>
                </div>
                {doneLocked && exercise.solution ? (
                  <div className="opening-book-excerpt-body">
                    {formatBookExcerpt(localized(exercise.solution, lang)).paragraphs.map(
                      (paragraph, index) => (
                        <blockquote key={`sol-${index}`} className="kasparov-game-intro">
                          {paragraph}
                        </blockquote>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
          <div className="kasparov-physical-bars">
            <ChessnutConnectBar
              status={chessnut.status}
              transport={chessnut.transport}
              battery={chessnut.battery}
              error={chessnut.error}
              supported={chessnut.supported}
              onConnect={(kind) => {
                void chessup.disconnect();
                void chessnut.connect(kind);
              }}
              onDisconnect={() => void chessnut.disconnect()}
              guide={mode === "practice" ? boardGuide : null}
              guidePly={0}
              lang={lang}
            />
            <ChessUpConnectBar
              status={chessup.status}
              battery={chessup.battery}
              error={chessup.error}
              supported={chessup.supported}
              onConnect={() => {
                void chessnut.disconnect();
                void chessup.connect();
              }}
              onDisconnect={() => void chessup.disconnect()}
              hint={chessup.status === "connected" ? t.chessUpHint : null}
              lang={lang}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
