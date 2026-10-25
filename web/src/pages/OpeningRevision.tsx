import { Chess } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  LessonSummary,
  OpeningModule,
  OpeningSkillItem,
  OpeningsRevisionCurriculum,
} from "../types";
import { BoardPanel } from "../components/BoardPanel";
import { ChessnutConnectBar } from "../components/ChessnutConnectBar";
import { ChessUpConnectBar } from "../components/ChessUpConnectBar";
import { useChessnutBoard } from "../hooks/useChessnutBoard";
import { useChessUpBoard } from "../hooks/useChessUpBoard";
import { buildBoardGuide, guideLedSquares } from "../lib/boardGuide";
import { formatBookExcerpt } from "../lib/bookExcerptFormat";
import { chessUpAssistanceClear } from "../lib/chessUpAssistance";
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
    <section className="opening-book-excerpt">
      <h3>{heading}</h3>
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

  const module = useMemo(
    () => curriculum.modules.find((m) => m.id === moduleId) ?? null,
    [curriculum.modules, moduleId],
  );

  const skillItem: OpeningSkillItem | null =
    mode === "skill" && !quizDone
      ? curriculum.batteries.skill[quizIndex] ?? null
      : null;

  useEffect(() => {
    if (module) {
      markModuleSeen(module.id);
      setProgressTick((n) => n + 1);
      setLinePly(0);
      setPosIndex(-1);
      setChoice(null);
    }
  }, [module?.id]);

  const progress = useMemo(() => {
    void progressTick;
    return loadOpeningRevisionProgress();
  }, [progressTick]);

  const studyChess = useMemo(() => {
    if (skillItem) {
      try {
        return new Chess(skillItem.fen);
      } catch {
        return new Chess();
      }
    }
    return new Chess();
  }, [skillItem]);

  const studyPlacement = studyChess.fen().split(" ")[0] ?? null;
  const moveLocked = Boolean(guessMove && skillItem && moveSanMatches(guessMove, skillItem.bestMoveSan));

  const boardChess = useMemo(() => {
    if (mode === "module" && module) {
      if (posIndex >= 0 && module.basePositions[posIndex]) {
        return new Chess(module.basePositions[posIndex]!.fen);
      }
      return chessAtLine(module.exampleLine.san, linePly, module.exampleLine.startFen);
    }
    if (skillItem) {
      try {
        const chess = new Chess(skillItem.fen);
        if (moveLocked) {
          chess.move(skillItem.bestMoveSan);
        }
        return chess;
      } catch {
        return new Chess();
      }
    }
    return new Chess();
  }, [mode, module, linePly, posIndex, skillItem, moveLocked]);

  function openModule(id: string) {
    setModuleId(id);
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

  useEffect(() => {
    if (!skillItem) {
      setAwaitingPhysicalSync(false);
      return;
    }
    setAwaitingPhysicalSync(physicalConnected && !moveLocked);
  }, [skillItem, quizIndex, physicalConnected, moveLocked]);

  useEffect(() => {
    if (!awaitingPhysicalSync || !physicalPlacement || !studyPlacement) return;
    if (physicalPlacement === studyPlacement) {
      setAwaitingPhysicalSync(false);
      lastWrongGuessPlacement.current = null;
    }
  }, [awaitingPhysicalSync, physicalPlacement, studyPlacement]);

  useEffect(() => {
    if (physicalSource !== "chessup" || !skillItem || moveLocked) return;
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
    chessup.onMove,
    skillItem,
    moveLocked,
    awaitingPhysicalSync,
    studyChess,
    acceptSkillMove,
    t,
  ]);

  useEffect(() => {
    if (!physicalConnected || !physicalPlacement || !skillItem || !studyPlacement) return;
    if (physicalSource === "chessup") return;
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
    t,
  ]);

  const skillBoardGuide = useMemo(() => {
    if (!physicalConnected || !skillItem) return null;
    return buildBoardGuide({
      boardPlacement: physicalPlacement,
      lessonPlacement: studyPlacement ?? studyChess.fen().split(" ")[0]!,
      nextSan: moveLocked ? null : skillItem.bestMoveSan,
      chess: studyChess,
      atEnd: moveLocked,
      requireExactSync: awaitingPhysicalSync,
      hideNextMove: !moveLocked,
    });
  }, [
    physicalConnected,
    physicalPlacement,
    skillItem,
    studyPlacement,
    studyChess,
    moveLocked,
    awaitingPhysicalSync,
  ]);

  useEffect(() => {
    if (physicalSource !== "chessnut") {
      if (chessnut.status === "connected") void chessnut.setLeds([]);
      return;
    }
    if (!skillBoardGuide) {
      void chessnut.setLeds([]);
      return;
    }
    void chessnut.setLeds(guideLedSquares(skillBoardGuide));
  }, [skillBoardGuide, chessnut.setLeds, chessnut.status, physicalSource]);

  useEffect(() => {
    if (physicalSource !== "chessup") return;
    void chessup.sendAssistance(chessUpAssistanceClear());
  }, [physicalSource, skillItem, quizIndex, chessup.sendAssistance]);

  const seen = seenModuleCount(progress);

  return (
    <div className="opening-revision">
      <header className="opening-revision-header">
        <button type="button" className="text-btn" onClick={onBack}>
          {t.backLibrary}
        </button>
        <div className="opening-revision-header-copy">
          <p className="eyebrow">{localized(curriculum.title, lang)}</p>
          <h1>{t.openingRevisionHeadline}</h1>
          <p className="opening-revision-lead">
            {fill(t.openingRevisionProgress, { seen, total: curriculum.modules.length })}
          </p>
        </div>
        <nav className="opening-revision-nav" aria-label={t.openingRevisionNav}>
          <button type="button" className={mode === "catalog" ? "is-active" : ""} onClick={() => setMode("catalog")}>
            {t.openingRevisionCatalog}
          </button>
          <button type="button" className={mode === "principles" ? "is-active" : ""} onClick={() => setMode("principles")}>
            {t.openingRevisionPrinciples}
          </button>
          <button type="button" className={mode === "knowledge" ? "is-active" : ""} onClick={() => startBattery("knowledge")}>
            {t.openingRevisionKnowledge}
          </button>
          <button type="button" className={mode === "skill" ? "is-active" : ""} onClick={() => startBattery("skill")}>
            {t.openingRevisionSkill}
          </button>
        </nav>
      </header>

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
          {curriculum.sections.map((section) => (
            <section key={section.id} className="opening-revision-section">
              <h2>{localized(section.title, lang)}</h2>
              <ul className="opening-module-grid">
                {modulesForSection(curriculum, section.id).map((mod) => (
                  <li key={mod.id}>
                    <button type="button" className="opening-module-card" onClick={() => openModule(mod.id)}>
                      <span className="opening-module-ref">#{mod.bookRef}</span>
                      <strong>{localized(mod.names, lang)}</strong>
                      <span className="opening-module-plan">{localized(mod.plan, lang)}</span>
                      {progress.seenModules[mod.id] ? (
                        <span className="opening-module-seen">{t.openingRevisionSeen}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : null}

      {mode === "module" && module ? (
        <ModuleView
          module={module}
          lang={lang}
          linePly={linePly}
          setLinePly={setLinePly}
          posIndex={posIndex}
          setPosIndex={setPosIndex}
          choice={choice}
          setChoice={setChoice}
          boardChess={boardChess}
          lessonsById={lessonsById}
          onOpenLesson={onOpenLesson}
          onBackCatalog={() => setMode("catalog")}
        />
      ) : null}

      {mode === "knowledge" ? (
        <section className="opening-quiz">
          {quizDone ? (
            <p>
              {fill(t.openingRevisionQuizDone, {
                score: quizScore,
                total: curriculum.batteries.knowledge.length,
              })}
            </p>
          ) : (
            <>
              <p className="eyebrow">
                {fill(t.openingRevisionQuizProgress, {
                  x: quizIndex + 1,
                  y: curriculum.batteries.knowledge.length,
                })}
              </p>
              <p>{localized(curriculum.batteries.knowledge[quizIndex]!.prompt, lang)}</p>
              <p className="opening-quiz-moves">
                {curriculum.batteries.knowledge[quizIndex]!.moves.join(" ")}
              </p>
              <input
                value={guessOpening}
                onChange={(e) => setGuessOpening(e.target.value)}
                placeholder={t.openingRevisionNamePlaceholder}
                aria-label={t.openingRevisionNamePlaceholder}
              />
              <button type="button" className="primary-btn" onClick={submitKnowledge}>
                {t.openingRevisionCheck}
              </button>
            </>
          )}
        </section>
      ) : null}

      {mode === "skill" ? (
        <section className="opening-quiz opening-quiz-skill">
          {quizDone ? (
            <p>
              {fill(t.openingRevisionQuizDone, {
                score: quizScore,
                total: curriculum.batteries.skill.length * 2,
              })}
            </p>
          ) : skillItem ? (
            <>
              <p className="eyebrow">
                {fill(t.openingRevisionQuizProgress, {
                  x: quizIndex + 1,
                  y: curriculum.batteries.skill.length,
                })}
              </p>
              <p>{localized(skillItem.prompt, lang)}</p>
              <p className="opening-quiz-play-hint">
                {physicalConnected ? t.onChessnut : t.openingRevisionPlayMove}
              </p>
              <div className="opening-quiz-board">
                <BoardPanel
                  chess={boardChess}
                  lang={lang}
                  allowMove={!moveLocked}
                  onPlayerMove={(from, to) => handleSkillBoardMove(from, to)}
                />
              </div>
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
                />
              </label>
              <button
                type="button"
                className="primary-btn"
                disabled={!moveLocked}
                onClick={submitSkill}
              >
                {t.openingRevisionCheck}
              </button>
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
                  guide={skillBoardGuide}
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
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function ModuleView({
  module,
  lang,
  linePly,
  setLinePly,
  posIndex,
  setPosIndex,
  choice,
  setChoice,
  boardChess,
  lessonsById,
  onOpenLesson,
  onBackCatalog,
}: {
  module: OpeningModule;
  lang: Lang;
  linePly: number;
  setLinePly: (n: number) => void;
  posIndex: number;
  setPosIndex: (n: number) => void;
  choice: number | null;
  setChoice: (n: number | null) => void;
  boardChess: Chess;
  lessonsById: Map<string, LessonSummary>;
  onOpenLesson: (lesson: LessonSummary) => void;
  onBackCatalog: () => void;
}) {
  const t = ui(lang);
  const position = posIndex >= 0 ? module.basePositions[posIndex] ?? null : null;
  const displayChess = boardChess;

  const linked = module.gameIds
    .map((id) => lessonsById.get(id))
    .filter((l): l is LessonSummary => Boolean(l));

  return (
    <div className="opening-module-view">
      <button type="button" className="text-btn" onClick={onBackCatalog}>
        {t.openingRevisionBackCatalog}
      </button>
      <div className="opening-module-layout">
        <div className="opening-module-board-col">
          <BoardPanel chess={displayChess} lang={lang} />
          <div className="opening-line-controls">
            <button
              type="button"
              disabled={linePly <= 0}
              onClick={() => {
                setPosIndex(-1);
                setChoice(null);
                setLinePly(Math.max(0, linePly - 1));
              }}
            >
              ←
            </button>
            <span>
              {linePly === 0
                ? t.openingRevisionLineStart
                : fill(t.openingRevisionLineProgress, {
                    x: linePly,
                    y: module.exampleLine.san.length,
                  })}
            </span>
            <button
              type="button"
              disabled={linePly >= module.exampleLine.san.length}
              onClick={() => {
                setPosIndex(-1);
                setChoice(null);
                setLinePly(Math.min(module.exampleLine.san.length, linePly + 1));
              }}
            >
              →
            </button>
          </div>
          <p className="opening-line-sans">
            {module.exampleLine.san.slice(0, linePly).join(" ") || "…"}
          </p>
        </div>
        <div className="opening-module-copy">
          <p className="eyebrow">
            {fill(t.openingRevisionSuperN, { n: module.bookRef })}
          </p>
          <h2>{localized(module.names, lang)}</h2>
          {module.tagline ? (
            <p className="opening-module-tagline">{localized(module.tagline, lang)}</p>
          ) : null}
          <p>{localized(module.plan, lang)}</p>
          {module.bookExcerpt?.excerptFr ? (
            <BookExcerptSection
              excerptFr={module.bookExcerpt.excerptFr}
              subtitle={module.tagline ? null : module.bookExcerpt.subtitle}
              heading={t.openingRevisionBookExcerpt}
              notesHeading={t.openingRevisionBookNotes}
            />
          ) : null}
          <h3>{t.openingRevisionThemes}</h3>
          <ul>
            {(lang === "fr" ? module.themes.fr : module.themes.en).map((theme) => (
              <li key={theme}>{theme}</li>
            ))}
          </ul>

          <h3>{t.openingRevisionBasePositions}</h3>
          <div className="opening-pos-tabs">
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
              {choice !== null ? <p className="opening-pos-why">{localized(position.why, lang)}</p> : null}
            </div>
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
          ) : (
            <p className="opening-no-games">{t.openingRevisionNoGames}</p>
          )}
        </div>
      </div>
    </div>
  );
}
