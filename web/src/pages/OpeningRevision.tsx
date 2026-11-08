import { Chess } from "chess.js";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  LessonSummary,
  OpeningExampleLine,
  OpeningModule,
  OpeningSkillItem,
  OpeningsRevisionCurriculum,
} from "../types";
import { BoardPanel, type BoardLinkState } from "../components/BoardPanel";
import { ChessnutConnectBar } from "../components/ChessnutConnectBar";
import { ChessUpConnectBar } from "../components/ChessUpConnectBar";
import { useChessnutBoard } from "../hooks/useChessnutBoard";
import { useChessUpBoard } from "../hooks/useChessUpBoard";
import { buildBoardGuide, guideLedSquares, type BoardGuide } from "../lib/boardGuide";
import { physicalBoardLink } from "../lib/boardLink";
import { formatBookExcerpt } from "../lib/bookExcerptFormat";
import { chessUpAssistanceClear, chessUpAssistanceForMove } from "../lib/chessUpAssistance";
import { chessUpMoveMatchesSan } from "../lib/chessUpMove";
import type { Lang } from "../lib/lang";
import { moveSanMatches, openingNameMatches } from "../lib/openingNameMatch";
import { localized, modulesForSection } from "../lib/openingRevision";
import {
  loadOpeningRevisionProgress,
  markModuleSeen,
  recordBatteryScore,
  seenModuleCount,
} from "../lib/openingRevisionProgress";
import { legalMoveMatchingPlacement } from "../lib/physicalGuess";
import { fill, ui } from "../lib/uiCopy";

type Props = {
  curriculum: OpeningsRevisionCurriculum;
  lang: Lang;
  initialModuleId?: string | null;
  lessonsById: Map<string, LessonSummary>;
  onOpenLesson: (lesson: LessonSummary) => void;
  onBack: () => void;
};

type Mode = "catalog" | "module" | "knowledge" | "skill" | "principles";

function chessAtLine(sans: string[], ply: number, startFen?: string): Chess {
  const chess = startFen ? new Chess(startFen) : new Chess();
  for (const san of sans.slice(0, ply)) {
    chess.move(san);
  }
  return chess;
}

function resolveInitialModuleId(
  curriculum: OpeningsRevisionCurriculum,
  initialModuleId?: string | null,
): string | null {
  if (!initialModuleId) return null;
  return curriculum.modules.some((m) => m.id === initialModuleId) ? initialModuleId : null;
}

function linesForModule(module: OpeningModule): OpeningExampleLine[] {
  if (module.exampleLines?.length) return module.exampleLines;
  return [
    {
      id: "main",
      label: { en: "Main line", fr: "Ligne principale" },
      san: module.exampleLine.san,
      startFen: module.exampleLine.startFen,
    },
  ];
}

function BookExcerptSection({
  excerptFr,
  subtitle,
  heading,
  notesHeading,
}: {
  excerptFr: string;
  subtitle?: string | null;
  heading: string;
  notesHeading: string;
}) {
  const { paragraphs, notes } = formatBookExcerpt(excerptFr);
  if (!paragraphs.length && !notes.length) return null;

  return (
    <section className={`opening-book-excerpt${heading ? "" : " is-nested"}`}>
      {heading ? <h3>{heading}</h3> : null}
      {subtitle ? <p className="opening-module-tagline">{subtitle}</p> : null}
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
    </section>
  );
}

function PhysicalBars({
  chessnut,
  chessup,
  guide,
  lang,
  compact = false,
}: {
  chessnut: ReturnType<typeof useChessnutBoard>;
  chessup: ReturnType<typeof useChessUpBoard>;
  guide: BoardGuide | null;
  lang: Lang;
  compact?: boolean;
}) {
  const t = ui(lang);
  const chessnutOn = chessnut.status === "connected";
  const chessupOn = chessup.status === "connected";
  const anyConnected = chessnutOn || chessupOn;
  const showChessnut = !compact || !anyConnected || chessnutOn;
  const showChessup = !compact || !anyConnected || chessupOn;

  const bars = (
    <div className={`kasparov-physical-bars opening-physical-bars${compact ? " is-compact" : ""}`}>
      {showChessnut ? (
        <ChessnutConnectBar
          status={chessnut.status}
          transport={chessnut.transport}
          connectingKind={chessnut.connectingKind}
          battery={chessnut.battery}
          error={chessnut.error}
          supported={chessnut.supported}
          onConnect={(kind) => {
            void chessup.disconnect();
            void chessnut.connect(kind);
          }}
          onDisconnect={() => void chessnut.disconnect()}
          guide={guide}
          guidePly={0}
          lang={lang}
        />
      ) : null}
      {showChessup ? (
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
          hint={chessupOn ? t.chessUpHint : null}
          lang={lang}
        />
      ) : null}
    </div>
  );

  if (compact && !anyConnected) {
    return (
      <details className="opening-board-dock">
        <summary>{t.openingRevisionConnectBoard}</summary>
        {bars}
      </details>
    );
  }

  return bars;
}

export function OpeningRevisionPage({
  curriculum,
  lang,
  initialModuleId,
  lessonsById,
  onOpenLesson,
  onBack,
}: Props) {
  const t = ui(lang);
  const resolvedInitial = resolveInitialModuleId(curriculum, initialModuleId);
  const [mode, setMode] = useState<Mode>(resolvedInitial ? "module" : "catalog");
  const [moduleId, setModuleId] = useState<string | null>(resolvedInitial);
  const [lineIndex, setLineIndex] = useState(0);
  const [linePly, setLinePly] = useState(0);
  const [posIndex, setPosIndex] = useState(-1);
  const [choice, setChoice] = useState<number | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [guessOpening, setGuessOpening] = useState("");
  const [guessMove, setGuessMove] = useState("");
  const [moveFeedback, setMoveFeedback] = useState<string | null>(null);
  const [awaitingPhysicalSync, setAwaitingPhysicalSync] = useState(false);
  const [progressTick, setProgressTick] = useState(0);

  const chessnut = useChessnutBoard();
  const chessup = useChessUpBoard();
  const lastWrongGuessPlacement = useRef<string | null>(null);
  const lastAcceptedPlacement = useRef<string | null>(null);

  const physicalSource =
    chessnut.status === "connected"
      ? ("chessnut" as const)
      : chessup.status === "connected"
        ? ("chessup" as const)
        : null;
  const physicalPlacement =
    physicalSource === "chessnut"
      ? chessnut.placement
      : physicalSource === "chessup"
        ? chessup.placement
        : null;
  const physicalConnected = physicalSource !== null;
  const boardLink = physicalBoardLink(chessnut, chessup);

  const module = useMemo(
    () => curriculum.modules.find((m) => m.id === moduleId) ?? null,
    [curriculum.modules, moduleId],
  );

  const skillItem: OpeningSkillItem | null =
    mode === "skill" && !quizDone
      ? curriculum.batteries.skill[quizIndex] ?? null
      : null;

  const activeLine = useMemo(() => {
    if (!module) return null;
    const lines = linesForModule(module);
    return lines[Math.min(lineIndex, lines.length - 1)] ?? lines[0] ?? null;
  }, [module, lineIndex]);

  const nextLineSan =
    mode === "module" && module && activeLine && posIndex < 0 && linePly < activeLine.san.length
      ? activeLine.san[linePly]!
      : null;
  const lineComplete =
    mode === "module" && !!activeLine && posIndex < 0 && linePly >= activeLine.san.length;

  useEffect(() => {
    if (module) {
      markModuleSeen(module.id);
      setProgressTick((n) => n + 1);
      setLineIndex(0);
      setLinePly(0);
      setPosIndex(-1);
      setChoice(null);
      lastWrongGuessPlacement.current = null;
      lastAcceptedPlacement.current = null;
    }
  }, [module?.id]);

  const progress = useMemo(() => {
    void progressTick;
    return loadOpeningRevisionProgress();
  }, [progressTick]);

  const resumeModule = useMemo(() => {
    const id = progress.lastModuleId;
    if (!id) return null;
    return curriculum.modules.find((m) => m.id === id) ?? null;
  }, [progress.lastModuleId, curriculum.modules]);

  const studyChess = useMemo(() => {
    if (skillItem) {
      try {
        return new Chess(skillItem.fen);
      } catch {
        return new Chess();
      }
    }
    if (mode === "module" && module && activeLine) {
      if (posIndex >= 0 && module.basePositions[posIndex]) {
        return new Chess(module.basePositions[posIndex]!.fen);
      }
      return chessAtLine(activeLine.san, linePly, activeLine.startFen);
    }
    if (mode === "knowledge" && !quizDone) {
      const item = curriculum.batteries.knowledge[quizIndex];
      if (item) {
        try {
          return chessAtLine(item.moves, item.moves.length);
        } catch {
          return new Chess();
        }
      }
    }
    return new Chess();
  }, [
    skillItem,
    mode,
    module,
    activeLine,
    linePly,
    posIndex,
    quizDone,
    quizIndex,
    curriculum.batteries.knowledge,
  ]);

  const studyPlacement = studyChess.fen().split(" ")[0] ?? null;
  const moveLocked = Boolean(guessMove && skillItem && moveSanMatches(guessMove, skillItem.bestMoveSan));

  const boardChess = useMemo(() => {
    if (skillItem) {
      try {
        const chess = new Chess(skillItem.fen);
        if (moveLocked) chess.move(skillItem.bestMoveSan);
        return chess;
      } catch {
        return new Chess();
      }
    }
    return studyChess;
  }, [skillItem, moveLocked, studyChess]);

  function openModule(id: string) {
    setModuleId(id);
    setLineIndex(0);
    setMode("module");
  }

  function startBattery(kind: "knowledge" | "skill") {
    setMode(kind);
    setQuizIndex(0);
    setQuizScore(0);
    setQuizDone(false);
    setGuessOpening("");
    setGuessMove("");
    setMoveFeedback(null);
    lastWrongGuessPlacement.current = null;
    lastAcceptedPlacement.current = null;
  }

  function resetSkillMoveState() {
    setGuessOpening("");
    setGuessMove("");
    setMoveFeedback(null);
    lastWrongGuessPlacement.current = null;
    lastAcceptedPlacement.current = null;
  }

  function submitKnowledge() {
    const items = curriculum.batteries.knowledge;
    const item = items[quizIndex];
    if (!item) return;
    const answer = curriculum.modules.find((m) => m.id === item.answerModuleId);
    const ok = !!answer && openingNameMatches(guessOpening, answer.names);
    const nextScore = quizScore + (ok ? 1 : 0);
    if (quizIndex + 1 >= items.length) {
      setQuizScore(nextScore);
      setQuizDone(true);
      recordBatteryScore("knowledge", nextScore, items.length);
      setProgressTick((n) => n + 1);
    } else {
      setQuizScore(nextScore);
      setQuizIndex((i) => i + 1);
      setGuessOpening("");
    }
  }

  function submitSkill() {
    const items = curriculum.batteries.skill;
    const item = items[quizIndex];
    if (!item) return;
    const answer = curriculum.modules.find((m) => m.id === item.answerModuleId);
    const moveOk = moveSanMatches(guessMove, item.bestMoveSan);
    const openingOk = !!answer && openingNameMatches(guessOpening, answer.names);
    const nextScore = quizScore + (moveOk ? 1 : 0) + (openingOk ? 1 : 0);
    if (quizIndex + 1 >= items.length) {
      setQuizScore(nextScore);
      setQuizDone(true);
      recordBatteryScore("skill", nextScore, items.length * 2);
      setProgressTick((n) => n + 1);
    } else {
      setQuizScore(nextScore);
      setQuizIndex((i) => i + 1);
      resetSkillMoveState();
    }
  }

  const acceptSkillMove = useCallback(
    (item: OpeningSkillItem, san: string): boolean => {
      if (!moveSanMatches(san, item.bestMoveSan)) {
        setMoveFeedback(t.openingRevisionMoveWrong);
        return false;
      }
      setGuessMove(item.bestMoveSan);
      setMoveFeedback(fill(t.openingRevisionMoveFound, { san: item.bestMoveSan }));
      setAwaitingPhysicalSync(false);
      return true;
    },
    [t],
  );

  const advanceLine = useCallback(() => {
    setPosIndex(-1);
    setChoice(null);
    setLinePly((ply) => ply + 1);
    setAwaitingPhysicalSync(physicalConnected);
    lastWrongGuessPlacement.current = null;
    lastAcceptedPlacement.current = null;
  }, [physicalConnected]);

  function handleSkillBoardMove(from: string, to: string): boolean {
    if (!skillItem || moveLocked) return false;
    const probe = new Chess(skillItem.fen);
    let played;
    try {
      played = probe.move({ from, to, promotion: "q" });
    } catch {
      played = null;
    }
    if (!played) return false;
    return acceptSkillMove(skillItem, played.san);
  }

  function handleLineBoardMove(from: string, to: string): boolean {
    if (!nextLineSan) return false;
    const probe = new Chess(studyChess.fen());
    let played;
    try {
      played = probe.move({ from, to, promotion: "q" });
    } catch {
      played = null;
    }
    if (!played) return false;
    if (!moveSanMatches(played.san, nextLineSan)) {
      setMoveFeedback(t.openingRevisionMoveWrong);
      return false;
    }
    setMoveFeedback(null);
    advanceLine();
    return true;
  }

  // Sync gate when entering a new study/skill position with a board connected.
  useEffect(() => {
    if (mode === "skill") {
      if (!skillItem || moveLocked) {
        setAwaitingPhysicalSync(false);
        return;
      }
      setAwaitingPhysicalSync(physicalConnected);
      return;
    }
    if (mode === "module" && nextLineSan) {
      setAwaitingPhysicalSync(physicalConnected);
      return;
    }
    if (mode === "module" && posIndex >= 0) {
      setAwaitingPhysicalSync(physicalConnected);
      return;
    }
    setAwaitingPhysicalSync(false);
  }, [mode, skillItem, quizIndex, moveLocked, nextLineSan, linePly, lineIndex, posIndex, physicalConnected]);

  useEffect(() => {
    if (!awaitingPhysicalSync || !physicalPlacement || !studyPlacement) return;
    if (physicalPlacement === studyPlacement) {
      setAwaitingPhysicalSync(false);
      lastWrongGuessPlacement.current = null;
    }
  }, [awaitingPhysicalSync, physicalPlacement, studyPlacement]);

  // ChessUp move stream — skill quiz
  useEffect(() => {
    if (physicalSource !== "chessup" || mode !== "skill" || !skillItem || moveLocked) return;
    return chessup.onMove((move) => {
      if (awaitingPhysicalSync) return;
      if (chessUpMoveMatchesSan(studyChess, skillItem.bestMoveSan, move)) {
        acceptSkillMove(skillItem, skillItem.bestMoveSan);
        return;
      }
      setMoveFeedback(t.openingRevisionMoveWrong);
    });
  }, [
    physicalSource,
    mode,
    chessup.onMove,
    skillItem,
    moveLocked,
    awaitingPhysicalSync,
    studyChess,
    acceptSkillMove,
    t,
  ]);

  // ChessUp move stream — line study
  useEffect(() => {
    if (physicalSource !== "chessup" || mode !== "module" || !nextLineSan) return;
    return chessup.onMove((move) => {
      if (awaitingPhysicalSync) return;
      if (chessUpMoveMatchesSan(studyChess, nextLineSan, move)) {
        setMoveFeedback(null);
        advanceLine();
        return;
      }
      setMoveFeedback(t.openingRevisionMoveWrong);
    });
  }, [
    physicalSource,
    mode,
    chessup.onMove,
    nextLineSan,
    awaitingPhysicalSync,
    studyChess,
    advanceLine,
    t,
  ]);

  // Chessnut placement delta — skill
  useEffect(() => {
    if (!physicalConnected || !physicalPlacement || !skillItem || !studyPlacement) return;
    if (physicalSource === "chessup" || mode !== "skill") return;
    if (moveLocked || awaitingPhysicalSync) return;

    if (physicalPlacement === studyPlacement) {
      lastWrongGuessPlacement.current = null;
      return;
    }
    if (physicalPlacement === lastAcceptedPlacement.current) return;

    const guess = legalMoveMatchingPlacement(skillItem.fen, physicalPlacement);
    if (!guess) return;

    if (moveSanMatches(guess.san, skillItem.bestMoveSan)) {
      lastAcceptedPlacement.current = physicalPlacement;
      acceptSkillMove(skillItem, skillItem.bestMoveSan);
      return;
    }
    if (lastWrongGuessPlacement.current !== physicalPlacement) {
      lastWrongGuessPlacement.current = physicalPlacement;
      setMoveFeedback(t.openingRevisionMoveWrong);
    }
  }, [
    physicalConnected,
    physicalSource,
    physicalPlacement,
    skillItem,
    studyPlacement,
    moveLocked,
    awaitingPhysicalSync,
    acceptSkillMove,
    mode,
    t,
  ]);

  // Chessnut placement delta — line study
  useEffect(() => {
    if (!physicalConnected || !physicalPlacement || !nextLineSan || !studyPlacement) return;
    if (physicalSource === "chessup" || mode !== "module") return;
    if (awaitingPhysicalSync) return;

    if (physicalPlacement === studyPlacement) {
      lastWrongGuessPlacement.current = null;
      return;
    }
    if (physicalPlacement === lastAcceptedPlacement.current) return;

    const guess = legalMoveMatchingPlacement(studyChess.fen(), physicalPlacement);
    if (!guess) return;

    if (moveSanMatches(guess.san, nextLineSan)) {
      lastAcceptedPlacement.current = physicalPlacement;
      setMoveFeedback(null);
      advanceLine();
      return;
    }
    if (lastWrongGuessPlacement.current !== physicalPlacement) {
      lastWrongGuessPlacement.current = physicalPlacement;
      setMoveFeedback(t.openingRevisionMoveWrong);
    }
  }, [
    physicalConnected,
    physicalSource,
    physicalPlacement,
    nextLineSan,
    studyPlacement,
    studyChess,
    awaitingPhysicalSync,
    advanceLine,
    mode,
    t,
  ]);

  const activeGuide = useMemo((): BoardGuide | null => {
    if (!physicalConnected) return null;
    if (mode === "skill" && skillItem) {
      return buildBoardGuide({
        boardPlacement: physicalPlacement,
        lessonPlacement: studyPlacement ?? studyChess.fen().split(" ")[0]!,
        nextSan: moveLocked ? null : skillItem.bestMoveSan,
        chess: studyChess,
        atEnd: moveLocked,
        requireExactSync: awaitingPhysicalSync,
        hideNextMove: !moveLocked,
      });
    }
    if (mode === "module" && module) {
      return buildBoardGuide({
        boardPlacement: physicalPlacement,
        lessonPlacement: studyPlacement ?? studyChess.fen().split(" ")[0]!,
        nextSan: nextLineSan,
        chess: studyChess,
        atEnd: lineComplete,
        requireExactSync: awaitingPhysicalSync,
        hideNextMove: false,
      });
    }
    return null;
  }, [
    physicalConnected,
    mode,
    skillItem,
    module,
    physicalPlacement,
    studyPlacement,
    studyChess,
    moveLocked,
    awaitingPhysicalSync,
    nextLineSan,
    lineComplete,
  ]);

  useEffect(() => {
    if (physicalSource !== "chessnut") {
      if (chessnut.status === "connected") void chessnut.setLeds([]);
      return;
    }
    if (!activeGuide) {
      void chessnut.setLeds([]);
      return;
    }
    void chessnut.setLeds(guideLedSquares(activeGuide));
  }, [activeGuide, chessnut.setLeds, chessnut.status, physicalSource]);

  useEffect(() => {
    if (physicalSource !== "chessup") return;
    // Skill quiz: no spoiler lights — only clear assistance.
    if (mode === "skill") {
      void chessup.sendAssistance(chessUpAssistanceClear());
      return;
    }
    if (activeGuide?.kind === "play_move" && !awaitingPhysicalSync) {
      void chessup.sendAssistance(
        chessUpAssistanceForMove(studyChess, activeGuide.from, activeGuide.to),
      );
      return;
    }
    void chessup.sendAssistance(chessUpAssistanceClear());
  }, [
    physicalSource,
    mode,
    activeGuide,
    awaitingPhysicalSync,
    studyChess,
    chessup.sendAssistance,
  ]);

  const seen = seenModuleCount(progress);
  const studying = mode === "module" || mode === "skill" || mode === "knowledge";

  return (
    <div
      className={`opening-revision${studying ? " is-studying" : ""}${mode === "module" ? " is-module-focus" : ""}`}
    >
      {mode !== "module" ? (
        <header className="opening-revision-header">
          <button type="button" className="text-btn" onClick={onBack}>
            {t.backLibrary}
          </button>
          <div className="opening-revision-header-copy">
            <p className="eyebrow">{localized(curriculum.title, lang)}</p>
            <h1>{t.openingRevisionHeadline}</h1>
            {mode === "catalog" ? (
              <p className="opening-revision-lead">{t.openingRevisionLead}</p>
            ) : (
              <p className="opening-revision-lead">
                {fill(t.openingRevisionProgress, { seen, total: curriculum.modules.length })}
              </p>
            )}
          </div>
          <nav className="opening-revision-nav" aria-label={t.openingRevisionNav}>
            <button type="button" className={mode === "catalog" ? "is-active" : ""} onClick={() => setMode("catalog")}>
              {t.openingRevisionCatalog}
            </button>
            <button
              type="button"
              className={mode === "principles" ? "is-active" : ""}
              onClick={() => setMode("principles")}
            >
              {t.openingRevisionPrinciples}
            </button>
            <button
              type="button"
              className={mode === "knowledge" ? "is-active" : ""}
              onClick={() => startBattery("knowledge")}
            >
              {t.openingRevisionKnowledge}
            </button>
            <button
              type="button"
              className={mode === "skill" ? "is-active" : ""}
              onClick={() => startBattery("skill")}
            >
              {t.openingRevisionSkill}
            </button>
          </nav>
        </header>
      ) : null}

      {mode === "principles" ? (
        <section className="opening-revision-principles">
          {curriculum.principles.map((p) => (
            <article key={p.id} className="opening-principle-card">
              <h2>{localized(p.title, lang)}</h2>
              <p>{localized(p.body, lang)}</p>
            </article>
          ))}
        </section>
      ) : null}

      {mode === "catalog" ? (
        <div className="opening-revision-catalog">
          {resumeModule ? (
            <button type="button" className="opening-resume-card" onClick={() => openModule(resumeModule.id)}>
              <span className="eyebrow">{t.openingRevisionResumeHint}</span>
              <strong>{localized(resumeModule.names, lang)}</strong>
              <span className="opening-module-plan">{localized(resumeModule.plan, lang)}</span>
              <span className="opening-resume-cta">{t.openingRevisionResume}</span>
            </button>
          ) : null}
          {curriculum.sections.map((section) => (
            <section
              key={section.id}
              className={`opening-revision-section${section.id === "italian-family" ? " is-featured" : ""}`}
            >
              <h2>{localized(section.title, lang)}</h2>
              <ul className="opening-module-grid">
                {modulesForSection(curriculum, section.id).map((mod) => {
                  const isResume = progress.lastModuleId === mod.id;
                  return (
                    <li key={`${section.id}-${mod.id}`}>
                      <button
                        type="button"
                        className={`opening-module-card${progress.seenModules[mod.id] ? " is-seen" : ""}${isResume ? " is-resume" : ""}`}
                        onClick={() => openModule(mod.id)}
                      >
                        <span className="opening-module-ref">#{mod.bookRef}</span>
                        <strong>{localized(mod.names, lang)}</strong>
                        <span className="opening-module-plan">{localized(mod.plan, lang)}</span>
                        {progress.seenModules[mod.id] ? (
                          <span className="opening-module-seen">{t.openingRevisionSeen}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : null}

      {mode === "module" && module && activeLine ? (
        <ModuleView
          module={module}
          lang={lang}
          lineIndex={lineIndex}
          setLineIndex={(i) => {
            setLineIndex(i);
            setLinePly(0);
            setPosIndex(-1);
            setChoice(null);
            setMoveFeedback(null);
          }}
          linePly={linePly}
          setLinePly={(n) => {
            setPosIndex(-1);
            setChoice(null);
            setMoveFeedback(null);
            setLinePly(n);
          }}
          posIndex={posIndex}
          setPosIndex={setPosIndex}
          choice={choice}
          setChoice={setChoice}
          boardChess={boardChess}
          nextSan={nextLineSan}
          lineComplete={lineComplete}
          moveFeedback={moveFeedback}
          boardLink={boardLink}
          onLineMove={handleLineBoardMove}
          physicalBars={
            <PhysicalBars
              chessnut={chessnut}
              chessup={chessup}
              guide={activeGuide}
              lang={lang}
              compact
            />
          }
          lessonsById={lessonsById}
          onOpenLesson={onOpenLesson}
          onBackCatalog={() => setMode("catalog")}
        />
      ) : null}

      {mode === "knowledge" ? (
        <section className="opening-quiz opening-quiz-knowledge">
          {quizDone ? (
            <p className="opening-quiz-score">
              {fill(t.openingRevisionQuizDone, {
                score: quizScore,
                total: curriculum.batteries.knowledge.length,
              })}
            </p>
          ) : (
            <div className="kasparov-exercise-layout">
              <div className="opening-module-board">
                <BoardPanel chess={boardChess} lang={lang} boardLink={boardLink} />
              </div>
              <div className="kasparov-guess-panel">
                <p className="eyebrow">
                  {fill(t.openingRevisionQuizProgress, {
                    x: quizIndex + 1,
                    y: curriculum.batteries.knowledge.length,
                  })}
                </p>
                <p className="kasparov-guess-label">
                  {localized(curriculum.batteries.knowledge[quizIndex]!.prompt, lang)}
                </p>
                <p className="opening-line-sans opening-quiz-moves">
                  {curriculum.batteries.knowledge[quizIndex]!.moves.join(" ")}
                </p>
                <label className="opening-quiz-field">
                  <span>{t.openingRevisionNamePlaceholder}</span>
                  <input
                    value={guessOpening}
                    onChange={(e) => setGuessOpening(e.target.value)}
                    placeholder={t.openingRevisionNamePlaceholder}
                    aria-label={t.openingRevisionNamePlaceholder}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitKnowledge();
                    }}
                  />
                </label>
                <button type="button" className="primary-btn" onClick={submitKnowledge}>
                  {t.openingRevisionCheck}
                </button>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {mode === "skill" ? (
        <section className="opening-quiz opening-quiz-skill">
          {quizDone ? (
            <p className="opening-quiz-score">
              {fill(t.openingRevisionQuizDone, {
                score: quizScore,
                total: curriculum.batteries.skill.length * 2,
              })}
            </p>
          ) : skillItem ? (
            <div className="kasparov-exercise-layout">
              <div className="opening-module-board">
                <BoardPanel
                  chess={boardChess}
                  lang={lang}
                  allowMove={!moveLocked}
                  onPlayerMove={(from, to) => handleSkillBoardMove(from, to)}
                  boardLink={boardLink}
                />
                <PhysicalBars
                  chessnut={chessnut}
                  chessup={chessup}
                  guide={activeGuide}
                  lang={lang}
                />
              </div>
              <div className="kasparov-guess-panel">
                <p className="eyebrow">
                  {fill(t.openingRevisionQuizProgress, {
                    x: quizIndex + 1,
                    y: curriculum.batteries.skill.length,
                  })}
                </p>
                <p className="kasparov-guess-label">{localized(skillItem.prompt, lang)}</p>
                <p className="opening-quiz-play-hint">
                  {physicalConnected ? t.onChessnut : t.openingRevisionPlayMove}
                </p>
                {moveFeedback ? (
                  <p className={`opening-quiz-move-feedback${moveLocked ? " is-ok" : ""}`}>
                    {moveFeedback}
                  </p>
                ) : null}
                <label className="opening-quiz-field">
                  <span>{t.openingRevisionNamePlaceholder}</span>
                  <input
                    value={guessOpening}
                    onChange={(e) => setGuessOpening(e.target.value)}
                    placeholder={t.openingRevisionNamePlaceholder}
                    aria-label={t.openingRevisionNamePlaceholder}
                    disabled={!moveLocked}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && moveLocked) submitSkill();
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="primary-btn"
                  disabled={!moveLocked}
                  onClick={submitSkill}
                >
                  {moveLocked ? t.openingRevisionNext : t.openingRevisionCheck}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

    </div>
  );
}

function ModuleView({
  module,
  lang,
  lineIndex,
  setLineIndex,
  linePly,
  setLinePly,
  posIndex,
  setPosIndex,
  choice,
  setChoice,
  boardChess,
  nextSan,
  lineComplete,
  moveFeedback,
  boardLink,
  onLineMove,
  physicalBars,
  lessonsById,
  onOpenLesson,
  onBackCatalog,
}: {
  module: OpeningModule;
  lang: Lang;
  lineIndex: number;
  setLineIndex: (n: number) => void;
  linePly: number;
  setLinePly: (n: number) => void;
  posIndex: number;
  setPosIndex: (n: number) => void;
  choice: number | null;
  setChoice: (n: number | null) => void;
  boardChess: Chess;
  nextSan: string | null;
  lineComplete: boolean;
  moveFeedback: string | null;
  boardLink: BoardLinkState;
  onLineMove: (from: string, to: string) => boolean;
  physicalBars: ReactNode;
  lessonsById: Map<string, LessonSummary>;
  onOpenLesson: (lesson: LessonSummary) => void;
  onBackCatalog: () => void;
}) {
  const t = ui(lang);
  const position = posIndex >= 0 ? module.basePositions[posIndex] ?? null : null;
  const lines = linesForModule(module);
  const activeLine = lines[Math.min(lineIndex, lines.length - 1)] ?? lines[0]!;
  const interactive = posIndex < 0 && !!nextSan;

  const linked = module.gameIds
    .map((id) => lessonsById.get(id))
    .filter((l): l is LessonSummary => Boolean(l));

  return (
    <div className="opening-module-view">
      <div className="opening-module-study">
        <div className="opening-module-board-col">
          <div className="opening-module-topbar">
            <button type="button" className="text-btn" onClick={onBackCatalog}>
              {t.openingRevisionBackCatalog}
            </button>
            <p className="eyebrow opening-module-topbar-ref">
              {fill(t.openingRevisionSuperN, { n: module.bookRef })}
            </p>
          </div>

          <div className="opening-module-board">
            <BoardPanel
              chess={boardChess}
              lang={lang}
              allowMove={interactive}
              onPlayerMove={interactive ? onLineMove : undefined}
              boardLink={boardLink}
            />
          </div>

          <div className="opening-module-controls">
            {lines.length > 1 ? (
              <label className="opening-line-select-wrap">
                <span className="opening-line-select-label">{t.openingRevisionChooseLine}</span>
                <select
                  className="opening-line-select"
                  value={lineIndex}
                  aria-label={t.openingRevisionLines}
                  onChange={(e) => setLineIndex(Number(e.target.value))}
                >
                  {lines.map((line, i) => (
                    <option key={line.id} value={i}>
                      {localized(line.label, lang)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {posIndex < 0 && nextSan ? (
              <button
                type="button"
                className="opening-play-next"
                onClick={() => setLinePly(Math.min(activeLine.san.length, linePly + 1))}
              >
                {fill(t.openingRevisionStepNext, { san: nextSan })}
              </button>
            ) : null}

            <div className="opening-module-toolbar">
              <div className="opening-line-scrubber">
                <button
                  type="button"
                  className="opening-step-btn"
                  disabled={linePly <= 0 || posIndex >= 0}
                  onClick={() => setLinePly(Math.max(0, linePly - 1))}
                  aria-label="Previous"
                >
                  ←
                </button>
                <span className="opening-line-progress">
                  {posIndex >= 0
                    ? fill(t.openingRevisionSuperN, { n: posIndex + 1 })
                    : linePly === 0
                      ? t.openingRevisionLineStart
                      : `${linePly}/${activeLine.san.length}`}
                </span>
                <button
                  type="button"
                  className="opening-step-btn"
                  disabled={linePly >= activeLine.san.length || posIndex >= 0}
                  onClick={() => setLinePly(Math.min(activeLine.san.length, linePly + 1))}
                  aria-label="Next"
                >
                  →
                </button>
              </div>
              {linePly > 0 ? (
                <p className="opening-line-sans">{activeLine.san.slice(0, linePly).join(" ")}</p>
              ) : null}
            </div>

            {posIndex < 0 && lineComplete ? (
              <p className="opening-quiz-play-hint">{t.openingRevisionLineDone}</p>
            ) : null}
            {moveFeedback && posIndex < 0 ? (
              <p className="opening-quiz-move-feedback">{moveFeedback}</p>
            ) : null}
          </div>

          {physicalBars}
        </div>

        <aside className="opening-module-copy">
          <header className="opening-module-copy-head">
            <h2>{localized(module.names, lang)}</h2>
            {module.tagline ? (
              <p className="opening-module-tagline">{localized(module.tagline, lang)}</p>
            ) : null}
            <p className="opening-module-plan-line">{localized(module.plan, lang)}</p>
          </header>

          <div className="opening-theme-chips" aria-label={t.openingRevisionThemes}>
            {(lang === "fr" ? module.themes.fr : module.themes.en).map((theme) => (
              <span key={theme} className="opening-theme-chip">
                {theme}
              </span>
            ))}
          </div>

          <section className="opening-ideas">
            <div className="opening-ideas-head">
              <h3>{t.openingRevisionBasePositions}</h3>
              <div className="opening-pos-tabs">
                <button
                  type="button"
                  className={`opening-pos-tab${posIndex < 0 ? " is-active" : ""}`}
                  onClick={() => {
                    setPosIndex(-1);
                    setChoice(null);
                  }}
                >
                  {t.openingRevisionLines}
                </button>
                {module.basePositions.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`opening-pos-tab${posIndex === i ? " is-active" : ""}`}
                    onClick={() => {
                      setPosIndex(i);
                      setChoice(null);
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
            {position ? (
              <div className="opening-pos-quiz">
                <p>{localized(position.ask, lang)}</p>
                <ul className="opening-pos-choices">
                  {(lang === "fr" ? position.choices.fr : position.choices.en).map((c, i) => (
                    <li key={c}>
                      <button
                        type="button"
                        className={[
                          "opening-pos-choice",
                          choice === null
                            ? ""
                            : i === position.answer
                              ? "is-correct"
                              : choice === i
                                ? "is-wrong"
                                : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setChoice(i)}
                      >
                        {c}
                      </button>
                    </li>
                  ))}
                </ul>
                {choice !== null ? (
                  <p className="opening-pos-why">{localized(position.why, lang)}</p>
                ) : null}
              </div>
            ) : null}
          </section>

          {module.bookExcerpt?.excerptFr ? (
            <details className="opening-book-details">
              <summary>{t.openingRevisionBookExcerpt}</summary>
              <BookExcerptSection
                excerptFr={module.bookExcerpt.excerptFr}
                subtitle={module.tagline ? null : module.bookExcerpt.subtitle}
                heading=""
                notesHeading={t.openingRevisionBookNotes}
              />
            </details>
          ) : null}

          {linked.length > 0 ? (
            <section className="opening-linked-section">
              <h3>{t.openingRevisionLinkedGames}</h3>
              <ul className="opening-linked-games">
                {linked.map((lesson) => {
                  const gameNum = lesson.title.match(/^Game\s+(\d+)/i)?.[1];
                  const label = gameNum
                    ? fill(t.openingRevisionGameN, { n: gameNum })
                    : lesson.title;
                  return (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        className="opening-linked-game"
                        onClick={() => onOpenLesson(lesson)}
                      >
                        <span className="opening-linked-game-id">{label}</span>
                        <span className="opening-linked-game-players">
                          {lesson.players.white}{" "}
                          <span className="opening-linked-game-vs">{t.vs}</span>{" "}
                          {lesson.players.black}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
