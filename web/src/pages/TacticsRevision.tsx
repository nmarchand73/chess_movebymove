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
import {
  findPairedExample,
  groupExampleNav,
  parseDiagramPairLabel,
  teachLineSource,
} from "../lib/tacticsDiagramPair";
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

function bookTeaser(paragraphs: string[], maxChars = 140): string {
  const first = paragraphs[0]?.trim() ?? "";
  if (!first) return "";
  if (first.length <= maxChars) return first;
  const cut = first.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 120 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function BookExcerptSection({
  excerpt,
  heading,
  notesHeading,
  collapsedLabel,
  collapseLabel,
  teaserMoreLabel,
}: {
  excerpt: string;
  heading: string;
  notesHeading: string;
  collapsedLabel: string;
  collapseLabel: string;
  teaserMoreLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const { paragraphs, notes } = useMemo(() => formatBookExcerpt(excerpt), [excerpt]);
  const teaser = useMemo(() => bookTeaser(paragraphs), [paragraphs]);
  useEffect(() => {
    setOpen(false);
  }, [excerpt]);
  if (!paragraphs.length && !notes.length) return null;

  return (
    <section className="tactics-book-panel" aria-label={heading}>
      <header className="tactics-book-panel-head">
        <p className="tactics-book-panel-kicker">{heading}</p>
        <button
          type="button"
          className="tactics-book-panel-toggle"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? collapseLabel : collapsedLabel}
        </button>
      </header>
      {open ? (
        <>
          <div className="opening-book-excerpt-body tactics-book-panel-body">
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
      ) : teaser ? (
        <button
          type="button"
          className="tactics-book-teaser"
          onClick={() => setOpen(true)}
        >
          <p className="tactics-book-teaser-text">{teaser}</p>
          <span className="tactics-book-teaser-more">{teaserMoreLabel}</span>
        </button>
      ) : null}
    </section>
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

function phaseCounts(examples: { phase?: string }[]): {
  lesson: number;
  technique: number;
  quiz: number;
} {
  let lesson = 0;
  let technique = 0;
  let quiz = 0;
  for (const ex of examples) {
    const phase = ex.phase ?? "lesson";
    if (phase === "technique") technique += 1;
    else if (phase === "quiz") quiz += 1;
    else lesson += 1;
  }
  return { lesson, technique, quiz };
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

function sideToMoveFromFen(fen: string): "white" | "black" {
  const turn = fen.trim().split(/\s+/)[1];
  return turn === "b" ? "black" : "white";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Drop label / side-to-move leads already shown in the lesson chrome. */
function stripCoachLead(text: string, label: string | null | undefined): string {
  let out = text.trim();
  const trimmedLabel = label?.trim();
  if (trimmedLabel) {
    out = out.replace(new RegExp(`^${escapeRegExp(trimmedLabel)}[.:=\\s—–-]+`, "i"), "");
  }
  out = out.replace(
    /^(White (to )?moves?\.?\s*|Black (to )?moves?\.?\s*|Trait aux Blancs\.?\s*|Trait aux Noirs\.?\s*)/i,
    "",
  );
  return out.trim();
}

function diagramHeading(
  label: string | null | undefined,
  indexInPhase: number,
  t: ReturnType<typeof ui>,
): string {
  const trimmed = label?.trim();
  if (trimmed) return fill(t.tacticsRevisionDiagram, { n: trimmed });
  return fill(t.tacticsRevisionDiagram, { n: indexInPhase + 1 });
}

function formatKeySans(sans: string[]): string {
  return sans
    .map((san, index) => {
      const moveNo = Math.floor(index / 2) + 1;
      if (index % 2 === 0) return `${moveNo}. ${san}`;
      return san;
    })
    .join(" ");
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
  const teachLine = useMemo(() => {
    if (!module || !example) return null;
    return teachLineSource(module.examples, example);
  }, [module, example]);
  const teachChess = useMemo(() => {
    if (!teachLine) return new Chess();
    return chessAtLine(teachLine.fen, teachLine.sans, linePly);
  }, [teachLine, linePly]);

  function goToExample(index: number) {
    if (!module) return;
    const next = module.examples[index];
    if (!next) return;
    const line = teachLineSource(module.examples, next);
    setExampleIndex(index);
    setLinePly(line.arrowOnOpen ? line.sans.length : 0);
  }

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
    const nextModule = curriculum.modules.find((m) => m.id === id) ?? null;
    const first = nextModule?.examples[0];
    const line = first ? teachLineSource(nextModule.examples, first) : null;
    setModuleId(id);
    markTacticsModuleSeen(id, nextModule?.names ?? null);
    setProgressTick((n) => n + 1);
    setExampleIndex(0);
    setLinePly(line?.arrowOnOpen ? line.sans.length : 0);
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
    if (!initialModuleId || !module || module.id !== initialModuleId) return;
    markTacticsModuleSeen(module.id, module.names);
    setProgressTick((n) => n + 1);
    // Once on deep-link / library resume entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + initial module only
  }, [initialModuleId, module?.id]);

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
          <button
            type="button"
            className={mode === "catalog" ? "is-active" : ""}
            onClick={() => setMode("catalog")}
          >
            {t.tacticsRevisionCatalog}
          </button>
        </nav>
      </header>

      {mode === "catalog" ? (
        <div className="opening-revision-catalog tactics-catalog">
          {(() => {
            const resumeId = progress.lastModuleId;
            const resume =
              resumeId != null
                ? curriculum.modules.find((m) => m.id === resumeId) ?? null
                : null;
            const next =
              curriculum.modules.find((m) => !progress.seenModules[m.id]) ??
              curriculum.modules[0];
            const featured = resume ?? next;
            const ctaLabel = resume
              ? fill(t.tacticsRevisionResumeAs, {
                  name: localized(resume.names, lang),
                })
              : featured
                ? fill(t.tacticsRevisionContinueAs, {
                    name: localized(featured.names, lang),
                  })
                : null;
            return (
              <div className="tactics-catalog-intro">
                <div className="tactics-catalog-intro-copy">
                  <p className="tactics-catalog-path">{t.tacticsRevisionCoursePath}</p>
                  <p className="tactics-catalog-method">
                    {localized(curriculum.methodNote, lang)}
                  </p>
                </div>
                {featured && ctaLabel ? (
                  <button
                    type="button"
                    className="primary-btn tactics-catalog-continue"
                    onClick={() => openModule(featured.id)}
                  >
                    {ctaLabel}
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
                  const phases = phaseCounts(mod.examples);
                  const isResume = progress.lastModuleId === id;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        className={`opening-module-card tactics-catalog-card${seen ? " is-seen" : ""}${isResume ? " is-resume" : ""}`}
                        onClick={() => openModule(id)}
                      >
                        <span className="tactics-catalog-card-top">
                          <strong>{title}</strong>
                          <span className="tactics-catalog-open-hint">
                            {t.tacticsRevisionOpenCourse}
                          </span>
                        </span>
                        <span className="opening-module-plan">{localized(mod.plan, lang)}</span>
                        <span className="tactics-catalog-phases">
                          {fill(t.tacticsRevisionPhases, {
                            lesson: phases.lesson,
                            technique: phases.technique,
                            quiz: phases.quiz,
                          })}
                        </span>
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
                            {isResume ? (
                              <span className="tactics-catalog-resume-pill">
                                {t.tacticsRevisionContinue}
                              </span>
                            ) : null}
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
        (() => {
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
          const navGroups = groupExampleNav(phaseItems);
          const pairLabel = parseDiagramPairLabel(example.label);
          const paired = findPairedExample(module.examples, example);
          const pairA =
            pairLabel?.side === "A"
              ? example
              : paired && parseDiagramPairLabel(paired.label)?.side === "A"
                ? paired
                : null;
          const pairB =
            pairLabel?.side === "B"
              ? example
              : paired && parseDiagramPairLabel(paired.label)?.side === "B"
                ? paired
                : null;
          const pairAIndex = pairA
            ? module.examples.findIndex((ex) => ex.id === pairA.id)
            : -1;
          const pairBIndex = pairB
            ? module.examples.findIndex((ex) => ex.id === pairB.id)
            : -1;
          const boardSide = sideToMoveFromFen(teachChess.fen());
          const keySans =
            pairLabel?.side === "A"
              ? []
              : teachLine && teachLine.sans.length > 0
                ? teachLine.sans
                : example.sans;
          const moduleName = localized(module.names, lang);
          const themeRaw = example.theme ? localized(example.theme, lang).trim() : "";
          const themeText =
            themeRaw && themeRaw.toLocaleLowerCase() !== moduleName.toLocaleLowerCase()
              ? themeRaw
              : "";
          const motifPlan = localized(module.plan, lang).trim();
          const coachText = coachStep
            ? stripCoachLead(localized(coachStep, lang), example.label)
            : "";
          const coachParagraphs = coachText
            ? formatBookExcerpt(coachText).paragraphs
            : [];
          const diagramRef = diagramHeading(example.label, phaseLocalIndex, t);

          return (
            <div className="tactics-teach-layout">
              <aside className="tactics-teach-board">
                <BoardPanel chess={teachChess} lang={lang} allowMove={false} />
                <div className="tactics-board-meta">
                  <span
                    className={
                      boardSide === "white"
                        ? "tactics-side-chip is-white"
                        : "tactics-side-chip is-black"
                    }
                  >
                    {boardSide === "white"
                      ? t.tacticsRevisionSideWhite
                      : t.tacticsRevisionSideBlack}
                  </span>
                  {keySans.length > 0 ? (
                    <span className="tactics-key-chip">
                      <span className="tactics-key-chip-label">{t.tacticsRevisionKeyMove}</span>
                      <span className="tactics-key-chip-san">{formatKeySans(keySans)}</span>
                    </span>
                  ) : null}
                </div>
                {teachLine && teachLine.sans.length > 0 ? (
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
                            y: teachLine.sans.length,
                          })}
                    </span>
                    <button
                      type="button"
                      disabled={linePly >= teachLine.sans.length}
                      onClick={() =>
                        setLinePly((p) => Math.min(teachLine.sans.length, p + 1))
                      }
                    >
                      ›
                    </button>
                  </div>
                ) : (
                  <p className="tactics-line-static">{t.tacticsRevisionLineStart}</p>
                )}
              </aside>

              <div className="tactics-teach-copy">
                <header className="tactics-lesson-meta">
                  <p className="tactics-diagram-ref">
                    <span className="tactics-diagram-phase">{phaseLabelFor(phase, t)}</span>
                    <span className="tactics-diagram-sep" aria-hidden="true">
                      ·
                    </span>
                    <span className="tactics-diagram-num">{diagramRef}</span>
                    {themeText ? (
                      <>
                        <span className="tactics-diagram-sep" aria-hidden="true">
                          ·
                        </span>
                        <span className="tactics-diagram-theme">{themeText}</span>
                      </>
                    ) : null}
                  </p>
                </header>

                {coachParagraphs.length > 0 ? (
                  <section className="tactics-coach" aria-label={t.tacticsRevisionCoach}>
                    <div className="tactics-coach-head">
                      <p className="tactics-coach-label">{t.tacticsRevisionCoach}</p>
                      {keySans.length > 0 ? (
                        <p className="tactics-coach-key">
                          <span>{t.tacticsRevisionKeyMove}</span>
                          <strong>{formatKeySans(keySans)}</strong>
                        </p>
                      ) : null}
                    </div>
                    <div className="opening-book-excerpt-body">
                      {coachParagraphs.map((paragraph, index) => (
                        <p key={`coach-${index}`}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
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
                      collapseLabel={t.tacticsRevisionBookCollapse}
                      teaserMoreLabel={t.tacticsRevisionBookTeaserMore}
                    />
                  );
                })()}

                <section className="tactics-examples" aria-label={t.tacticsRevisionExamples}>
                  {phaseOrder.length > 1 ? (
                    <div className="tactics-phase-tabs" role="tablist">
                      {phaseOrder.map((p) => {
                        const first = module.examples.findIndex(
                          (ex) => (ex.phase ?? "lesson") === p,
                        );
                        const count = module.examples.filter(
                          (ex) => (ex.phase ?? "lesson") === p,
                        ).length;
                        const active = phase === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            className={active ? "is-current" : ""}
                            onClick={() => goToExample(first)}
                          >
                            <span className="tactics-phase-label">{phaseLabelFor(p, t)}</span>
                            <span className="tactics-phase-count">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {pairLabel && pairA && pairB && pairAIndex >= 0 && pairBIndex >= 0 ? (
                    <div
                      className="tactics-pair-switch"
                      role="group"
                      aria-label={t.tacticsRevisionPairSides}
                    >
                      <p className="tactics-pair-figure">
                        {fill(t.tacticsRevisionPairFigure, { n: pairLabel.num })}
                      </p>
                      <div className="tactics-pair-track">
                        <button
                          type="button"
                          className={
                            pairLabel.side === "A"
                              ? "tactics-pair-side is-current"
                              : "tactics-pair-side"
                          }
                          aria-pressed={pairLabel.side === "A"}
                          onClick={() => goToExample(pairAIndex)}
                        >
                          <span className="tactics-pair-letter">A</span>
                          <span className="tactics-pair-caption">{t.tacticsRevisionPairOnA}</span>
                        </button>
                        <span className="tactics-pair-bridge" aria-hidden="true">
                          →
                        </span>
                        <button
                          type="button"
                          className={
                            pairLabel.side === "B"
                              ? "tactics-pair-side is-current is-result"
                              : "tactics-pair-side is-result"
                          }
                          aria-pressed={pairLabel.side === "B"}
                          onClick={() => goToExample(pairBIndex)}
                        >
                          <span className="tactics-pair-letter">B</span>
                          <span className="tactics-pair-caption">{t.tacticsRevisionPairOnB}</span>
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="tactics-example-nav">
                    <button
                      type="button"
                      className="secondary"
                      disabled={exampleIndex <= 0}
                      aria-label={t.tacticsRevisionPrevExample}
                      onClick={() => goToExample(Math.max(0, exampleIndex - 1))}
                    >
                      ‹
                    </button>
                    <label className="tactics-example-jump">
                      <span className="visually-hidden">{t.tacticsRevisionJumpExample}</span>
                      <select
                        value={exampleIndex}
                        aria-label={t.tacticsRevisionJumpExample}
                        onChange={(event) => goToExample(Number(event.target.value))}
                      >
                        {navGroups.map((group) => {
                          if (group.kind === "pair") {
                            return (
                              <optgroup
                                key={`pair-${group.num}`}
                                label={fill(t.tacticsRevisionPairFigure, { n: group.num })}
                              >
                                <option value={group.a.i}>
                                  {group.a.ex.label?.trim() || "A"} · {t.tacticsRevisionPairOnA}
                                </option>
                                <option value={group.b.i}>
                                  {group.b.ex.label?.trim() || "B"} · {t.tacticsRevisionPairOnB}
                                </option>
                              </optgroup>
                            );
                          }
                          const local = phaseItems.findIndex(({ i }) => i === group.item.i);
                          return (
                            <option key={group.item.ex.id} value={group.item.i}>
                              {exampleLabel(
                                group.item.ex,
                                Math.max(0, local),
                                t.tacticsRevisionExampleN,
                              )}
                            </option>
                          );
                        })}
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
                      onClick={() =>
                        goToExample(Math.min(module.examples.length - 1, exampleIndex + 1))
                      }
                    >
                      ›
                    </button>
                  </div>
                </section>

                <footer className="tactics-teach-footer">
                  {motifPlan ? (
                    <p className="tactics-motif-line">
                      <span className="tactics-motif-line-label">
                        {t.tacticsRevisionMotifPlan}
                      </span>
                      <span className="tactics-motif-line-text">{motifPlan}</span>
                    </p>
                  ) : null}
                  <p className="tactics-source-line">
                    {module.sources
                      .map((s) => sourceBadge(s.book, s.ref, t.tacticsRevisionSourceWc))
                      .join(" · ")}
                    {" · "}
                    {formatModuleCounts(
                      module.examples.length,
                      module.exerciseIds.length,
                      t,
                    )}
                  </p>
                  {module.exerciseIds.length > 0 ? (
                    <button type="button" className="primary-btn" onClick={startPractice}>
                      {t.tacticsRevisionPractice}
                    </button>
                  ) : null}
                </footer>
              </div>
            </div>
          );
        })()
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
