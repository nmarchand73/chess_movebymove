import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Lesson, LessonSummary } from "../types";
import { loadLesson } from "../lib/lessonLoader";
import { buildPositionAtPly } from "../lib/chess";
import { type AlternativeMove } from "../lib/commentary";
import {
  formatAnnotatedJumpLabel,
  nextAnnotatedPly,
  previewAlternative,
  resolveSanClick,
} from "../lib/moveNavigation";
import { gamePerformanceFromPrecomputed } from "../lib/performanceRating";
import { enqueueReview, loadProgress, markContinue } from "../lib/progress";
import { EngineBestLine, EvalGauge } from "../components/EvalDisplay";
import { BoardPanel, chessFromFen } from "../components/BoardPanel";
import { usePositionEval } from "../hooks/usePositionEval";
import { usePerformanceRating } from "../hooks/usePerformanceRating";
import { usePerformanceElos } from "../hooks/usePerformanceElos";
import { useChessnutBoard } from "../hooks/useChessnutBoard";
import { useChessUpBoard } from "../hooks/useChessUpBoard";
import { CommentaryPanel } from "../components/CommentaryPanel";
import { ChessnutConnectBar } from "../components/ChessnutConnectBar";
import { ChessUpConnectBar } from "../components/ChessUpConnectBar";
import { GuessMove } from "../components/GuessMove";
import { MoveStrip } from "../components/MoveStrip";
import { OpeningLabel } from "../components/OpeningLabel";
import { TransportBar } from "../components/TransportBar";
import { ExportPromptButton } from "../components/ExportPromptButton";
import { contextualizeOpeningExplanation, getOpeningTooltip } from "../lib/openingTooltips";
import { commentatorName } from "../lib/bookMeta";
import { buildBoardGuide, guideLedSquares } from "../lib/boardGuide";
import { chessUpAssistanceClear, chessUpAssistanceForMove } from "../lib/chessUpAssistance";
import { chessUpMoveMatchesSan } from "../lib/chessUpMove";
import { legalMoveMatchingPlacement } from "../lib/physicalGuess";
import type { Lang } from "../lib/lang";
import { fill, ui } from "../lib/uiCopy";

type Props = {
  summary: LessonSummary;
  lang: Lang;
  onBack: () => void;
};

export function LessonPage({ summary, lang, onBack }: Props) {
  const t = ui(lang);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [ply, setPly] = useState(0);
  const [preview, setPreview] = useState<{ fen: string; label: string } | null>(null);
  const [guessEnabled, setGuessEnabled] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** After First/scrub: wait until the physical board matches the diagram. */
  const [awaitingPhysicalSync, setAwaitingPhysicalSync] = useState(false);
  const [physicalGuessFeedback, setPhysicalGuessFeedback] = useState<string | null>(null);
  const chessnut = useChessnutBoard();
  const chessup = useChessUpBoard();
  /** Board placement when the lesson ply last changed — blocks auto-advance on rewind. */
  const placementAtPlyLanding = useRef<string | null>(null);
  const lastAutoAdvancedPlacement = useRef<string | null>(null);
  const lastWrongGuessPlacement = useRef<string | null>(null);
  const prevPhysicalConnected = useRef(false);
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

  useEffect(() => {
    let cancelled = false;
    setError(null);
    loadLesson(summary.file, lang)
      .then((data) => {
        if (cancelled) return;
        setLesson(data);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [summary.file, lang]);

  useEffect(() => {
    const saved = loadProgress();
    if (saved.lastLessonId === summary.id && saved.lastPly !== undefined) {
      setPly(saved.lastPly);
    } else {
      setPly(0);
    }
    setPreview(null);
    setRevealed(true);
  }, [summary.file, summary.id]);

  const node = useMemo(() => lesson?.nodes.find((n) => n.ply === ply), [lesson, ply]);
  const chess = useMemo(() => (lesson ? buildPositionAtPly(lesson.nodes, ply) : null), [lesson, ply]);
  const displayChess = useMemo(() => {
    if (preview) return chessFromFen(preview.fen);
    return chess;
  }, [preview, chess]);

  const showEngine = ply > 0;
  const { eval: positionEval, status: evalStatus } = usePositionEval(
    chess?.fen() ?? null,
    showEngine,
  );
  const { performance, sparklines, status: performanceStatus } = usePerformanceRating(
    lesson?.id ?? "",
    lesson?.nodes ?? [],
    ply,
    showEngine,
  );
  const { performanceByLesson } = usePerformanceElos();
  const fullGameElo = lesson ? performanceByLesson.get(lesson.id) : undefined;
  const maxPly = lesson?.moveCount ?? 0;
  const displayPerformance = useMemo(() => {
    if (ply >= maxPly && fullGameElo) {
      return gamePerformanceFromPrecomputed(fullGameElo);
    }
    return performance;
  }, [ply, maxPly, fullGameElo, performance]);
  const nextNode = useMemo(() => lesson?.nodes.find((n) => n.ply === ply + 1 && n.san), [lesson, ply]);
  const nextNotePly = useMemo(
    () => (lesson ? nextAnnotatedPly(lesson.nodes, ply, maxPly) : null),
    [lesson, ply, maxPly],
  );
  const nextNoteLabel = useMemo(
    () => (lesson && nextNotePly ? formatAnnotatedJumpLabel(lesson.nodes, nextNotePly) : null),
    [lesson, nextNotePly],
  );
  const progressPct = maxPly ? Math.round((ply / maxPly) * 100) : 0;

  const goTo = useCallback((target: number) => {
    if (!lesson) return;
    setPly(Math.max(0, Math.min(target, lesson.moveCount)));
    setPreview(null);
    setRevealed(true);
  }, [lesson]);

  const handleSanClick = useCallback(
    (notation: string) => {
      if (!lesson) return;
      const resolution = resolveSanClick(notation, lesson.nodes, ply);
      if (resolution.kind === "jump") {
        goTo(resolution.ply);
        return;
      }
      if (resolution.kind === "preview") {
        if (ply === 0) {
          const targetPly = nextAnnotatedPly(lesson.nodes, 0, lesson.moveCount) ?? 1;
          setPly(targetPly);
          setRevealed(true);
        }
        setPreview({ fen: resolution.fen, label: resolution.label });
      }
    },
    [lesson, ply, goTo],
  );

  const handleAltClick = useCallback(
    (alt: AlternativeMove) => {
      if (!lesson) return;
      const resolution = previewAlternative(lesson.nodes, ply, alt);
      if (resolution.kind === "jump") {
        goTo(resolution.ply);
        return;
      }
      if (resolution.kind === "preview") {
        if (ply === 0) {
          const targetPly = nextAnnotatedPly(lesson.nodes, 0, lesson.moveCount) ?? 1;
          setPly(targetPly);
          setRevealed(true);
        }
        setPreview({ fen: resolution.fen, label: resolution.label });
      }
    },
    [lesson, ply, goTo],
  );

  const advance = useCallback(() => {
    if (ply < maxPly) goTo(ply + 1);
  }, [ply, maxPly, goTo]);

  const commentator = commentatorName(summary.book, summary.sourceBook);

  useEffect(() => {
    if (lesson) markContinue(lesson.id, ply, lesson.moveCount);
  }, [lesson, ply]);

  useEffect(() => {
    if (guessEnabled && nextNode?.san) {
      setRevealed(false);
    } else {
      setRevealed(true);
    }
  }, [ply, nextNode, guessEnabled]);

  // Auto-enable quiz mode when a physical board connects (including reconnect on load).
  useEffect(() => {
    if (physicalConnected && !prevPhysicalConnected.current) {
      setGuessEnabled(true);
    }
    prevPhysicalConnected.current = physicalConnected;
  }, [physicalConnected]);

  // Remember physical position when ply changes (First / scrub / keyboard).
  // Auto-advance only if the board moves AFTER landing on this ply — otherwise
  // rewinding to the start while pieces are mid-game would instantly jump forward.
  useEffect(() => {
    placementAtPlyLanding.current = physicalPlacement;
    lastAutoAdvancedPlacement.current = null;
    lastWrongGuessPlacement.current = null;
    setPhysicalGuessFeedback(null);
    if (physicalConnected) {
      setAwaitingPhysicalSync(true);
    }
  }, [ply, physicalConnected]);

  useEffect(() => {
    if (placementAtPlyLanding.current == null && physicalPlacement) {
      placementAtPlyLanding.current = physicalPlacement;
    }
  }, [physicalPlacement]);

  const lessonPlacement = chess?.fen().split(" ")[0] ?? null;
  const isGuessing = guessEnabled && !revealed && !!nextNode?.san;

  useEffect(() => {
    if (!awaitingPhysicalSync || !physicalPlacement || !lessonPlacement) return;
    if (physicalPlacement === lessonPlacement) {
      setAwaitingPhysicalSync(false);
    }
  }, [awaitingPhysicalSync, physicalPlacement, lessonPlacement]);

  // ChessUp resolves moves on-board — advance from the `move` event (not inferMove).
  useEffect(() => {
    if (physicalSource !== "chessup" || !lesson || !chess) return;

    return chessup.onMove((move) => {
      if (ply >= lesson.moveCount) return;
      if (awaitingPhysicalSync) return;
      if (!nextNode?.san) return;

      if (isGuessing) {
        if (chessUpMoveMatchesSan(chess, nextNode.san, move)) {
          setPhysicalGuessFeedback(fill(t.correctSame, { name: commentator }));
          setRevealed(true);
          goTo(ply + 1);
          return;
        }
        setPhysicalGuessFeedback(
          fill(t.authorPlayed, { name: commentator, san: nextNode.san }),
        );
        enqueueReview(lesson.id, ply + 1);
        return;
      }

      if (chessUpMoveMatchesSan(chess, nextNode.san, move)) {
        setRevealed(true);
        goTo(ply + 1);
      }
    });
  }, [
    physicalSource,
    chessup.onMove,
    lesson,
    chess,
    ply,
    goTo,
    awaitingPhysicalSync,
    isGuessing,
    nextNode?.san,
    commentator,
    t,
  ]);

  // Chessnut (and ChessUp boardState fallback): placement-delta advance.
  useEffect(() => {
    if (!physicalConnected || !physicalPlacement || !lesson || !chess) return;
    if (physicalSource === "chessup") return; // move event owns ChessUp advances
    if (ply >= lesson.moveCount) return;
    // Do not advance while the board still needs to match the diagram (e.g. reset to start).
    if (awaitingPhysicalSync) return;
    if (placementAtPlyLanding.current == null) return;

    // Back on the diagram — clear wrong-guess state and wait for the next attempt.
    if (physicalPlacement === lessonPlacement) {
      lastWrongGuessPlacement.current = null;
      setPhysicalGuessFeedback(null);
      return;
    }

    if (physicalPlacement === placementAtPlyLanding.current) return;
    if (physicalPlacement === lastAutoAdvancedPlacement.current) return;

    if (isGuessing && nextNode?.san) {
      const guess = legalMoveMatchingPlacement(chess.fen(), physicalPlacement);
      if (!guess) return;

      if (guess.san.toLowerCase() === nextNode.san.toLowerCase()) {
        lastAutoAdvancedPlacement.current = physicalPlacement;
        setPhysicalGuessFeedback(fill(t.correctSame, { name: commentator }));
        setRevealed(true);
        goTo(ply + 1);
        return;
      }

      if (lastWrongGuessPlacement.current !== physicalPlacement) {
        lastWrongGuessPlacement.current = physicalPlacement;
        setPhysicalGuessFeedback(
          fill(t.authorPlayed, { name: commentator, san: nextNode.san }),
        );
        enqueueReview(lesson.id, ply + 1);
      }
      return;
    }

    const nextPlacement = buildPositionAtPly(lesson.nodes, ply + 1).fen().split(" ")[0];
    if (physicalPlacement !== nextPlacement) return;

    lastAutoAdvancedPlacement.current = physicalPlacement;
    setRevealed(true);
    goTo(ply + 1);
  }, [
    physicalConnected,
    physicalSource,
    physicalPlacement,
    lesson,
    chess,
    ply,
    goTo,
    awaitingPhysicalSync,
    isGuessing,
    nextNode?.san,
    lessonPlacement,
    commentator,
    t,
  ]);

  const boardGuide = useMemo(() => {
    if (!physicalConnected || !chess) return null;
    // ChessUp has no free-form LED API; we still compute the guide for copy + assistance.
    return buildBoardGuide({
      boardPlacement: physicalPlacement,
      lessonPlacement: chess.fen().split(" ")[0]!,
      nextSan: nextNode?.san ?? null,
      chess,
      atEnd: ply >= maxPly,
      requireExactSync: awaitingPhysicalSync,
      hideNextMove: isGuessing,
    });
  }, [
    physicalConnected,
    physicalPlacement,
    chess,
    nextNode?.san,
    ply,
    maxPly,
    awaitingPhysicalSync,
    isGuessing,
  ]);

  // Chessnut LEDs
  useEffect(() => {
    if (physicalSource !== "chessnut") {
      if (chessnut.status === "connected") void chessnut.setLeds([]);
      return;
    }
    if (!boardGuide) {
      void chessnut.setLeds([]);
      return;
    }
    const squares = guideLedSquares(boardGuide);
    if (boardGuide.kind !== "setup" || awaitingPhysicalSync) {
      void chessnut.setLeds(squares);
      return;
    }
    const timer = window.setTimeout(() => {
      void chessnut.setLeds(squares);
    }, 140);
    return () => window.clearTimeout(timer);
  }, [boardGuide, chessnut.setLeds, chessnut.status, awaitingPhysicalSync, physicalSource]);

  // ChessUp unofficial assistance lights (green = book move, red = other legal moves).
  useEffect(() => {
    if (physicalSource !== "chessup" || !chess) {
      return;
    }
    if (!boardGuide || boardGuide.kind !== "play_move") {
      void chessup.sendAssistance(chessUpAssistanceClear());
      return;
    }
    const colours = chessUpAssistanceForMove(chess, boardGuide.from, boardGuide.to);
    void chessup.sendAssistance(colours);
  }, [physicalSource, boardGuide, chess, chessup.sendAssistance]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const guessing = guessEnabled && !revealed && !!nextNode?.san;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        if (guessing) return;
        advance();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (ply > 0) goTo(ply - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(maxPly);
      } else if (e.key === "Escape" && preview) {
        e.preventDefault();
        setPreview(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ply, maxPly, goTo, guessEnabled, revealed, nextNode, advance, preview]);

  if (error) return <p className="error">{error}</p>;
  if (!lesson || !chess || !displayChess) return <div className="loading">{t.loadingLesson}</div>;

  const openingTip = getOpeningTooltip(lesson.opening);
  const sideToMove = ply === 0 ? "none" as const : chess.turn() === "w" ? "white" as const : "black" as const;
  const guessing = isGuessing;

  function revealNext() {
    setRevealed(true);
    goTo(ply + 1);
  }

  return (
    <div className="lesson">
      <header className="lesson-header">
        <div className="lesson-header-bar">
          <button type="button" className="back-btn" onClick={onBack}>{t.backGames}</button>
          <div className="lesson-header-identity">
            <span className="lesson-game-num">{fill(t.gameN, { n: lesson.gameNum })}</span>
          </div>
          <div className="lesson-header-actions">
            <ExportPromptButton lesson={lesson} ply={ply} lang={lang} />
            <div className="lesson-header-progress">
              <span className="lesson-progress-label">
                {fill(t.moveProgress, { x: ply, y: maxPly })}
              </span>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="lesson-header-body">
          <div className="lesson-header-main">
            <h1 className="lesson-matchup">
              <span className="player-name">{lesson.players.white}</span>
              <span className="matchup-vs">{t.vs}</span>
              <span className="player-name">{lesson.players.black}</span>
            </h1>

            <div className="lesson-meta">
              {summary.intentionId || summary.book === "intentions" ? (
                <span
                  className="meta-chip meta-intention"
                  title={
                    summary.openingIdea
                      ? `${summary.openingName ?? t.opening} — ${summary.openingIdea}`
                      : summary.why
                  }
                >
                  {t.intention} · {summary.section}
                </span>
              ) : null}
              {lesson.event && <span className="meta-chip">{lesson.event}</span>}
              {lesson.opening && (
                <span className="meta-chip meta-opening">
                  <OpeningLabel name={lesson.opening} eco={lesson.eco} showTip={false} />
                </span>
              )}
              {lesson.result && <span className="meta-chip meta-result">{lesson.result}</span>}
            </div>
          </div>

          {openingTip && lesson.opening && ply === 0 ? (
            <details className="opening-hint-details">
              <summary>{t.openingIdea}</summary>
              <p className="opening-hint-goal">{openingTip.goal}</p>
              <p className="opening-hint-explanation">
                {contextualizeOpeningExplanation(lesson.opening, openingTip.explanation)}
              </p>
            </details>
          ) : null}
        </div>
      </header>

      <div className="lesson-layout">
        <aside className="study-panel">
          <div className="study-board">
            <div className="study-board-main">
              <div className="board-slot">
                <BoardPanel
                  chess={displayChess}
                  previewLabel={preview?.label ?? null}
                  onClearPreview={() => setPreview(null)}
                  lang={lang}
                />
              </div>
              <EvalGauge
                fen={chess.fen()}
                eval={positionEval}
                status={evalStatus}
                performance={displayPerformance}
                performanceStatus={performanceStatus}
                performanceSource={ply >= maxPly && fullGameElo ? "precomputed" : "live"}
                sparklines={sparklines}
                maxPly={maxPly}
                hidden={!showEngine}
                lang={lang}
              />
            </div>
            <EngineBestLine
              fen={chess.fen()}
              eval={positionEval}
              status={evalStatus}
              hidden={!showEngine || guessing}
              lang={lang}
            />
          </div>

          <div className="study-chrome">
            {guessing && nextNode?.san ? (
              <GuessMove
                key={ply}
                chess={chess}
                expectedSan={nextNode.san}
                commentator={commentator}
                onReveal={revealNext}
                onCorrect={() => undefined}
                onWrong={() => enqueueReview(lesson.id, ply + 1)}
                physicalBoard={physicalConnected}
                externalFeedback={physicalGuessFeedback}
                lang={lang}
              />
            ) : null}

            <TransportBar
              ply={ply}
              maxPly={maxPly}
              currentSan={node?.san}
              sideToMove={sideToMove}
              nextAnnotatedPly={nextNotePly}
              nextAnnotatedLabel={nextNoteLabel}
              onFirst={() => goTo(0)}
              onPrev={() => goTo(ply - 1)}
              onNext={advance}
              onNextAnnotated={() => nextNotePly && goTo(nextNotePly)}
              onLast={() => goTo(maxPly)}
              guessEnabled={guessEnabled}
              onToggleGuess={() => setGuessEnabled((v) => !v)}
              nextBlocked={guessing}
              physicalBoard={physicalConnected}
              lang={lang}
            />

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
              guide={boardGuide}
              guidePly={ply}
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

            <MoveStrip
              nodes={lesson.nodes}
              ply={ply}
              onSelect={goTo}
              hideFuture={guessing}
              lang={lang}
            />
          </div>
        </aside>

        <CommentaryPanel
          node={node}
          ply={ply}
          totalPlies={maxPly}
          onSanClick={handleSanClick}
          onAltClick={handleAltClick}
          commentator={commentator}
          lang={lang}
        />
      </div>
    </div>
  );
}
