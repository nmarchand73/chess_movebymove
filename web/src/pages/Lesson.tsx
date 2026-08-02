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
import { CommentaryPanel } from "../components/CommentaryPanel";
import { ChessnutConnectBar } from "../components/ChessnutConnectBar";
import { GuessMove } from "../components/GuessMove";
import { MoveStrip } from "../components/MoveStrip";
import { OpeningLabel } from "../components/OpeningLabel";
import { TransportBar } from "../components/TransportBar";
import { ExportPromptButton } from "../components/ExportPromptButton";
import { contextualizeOpeningExplanation, getOpeningTooltip } from "../lib/openingTooltips";
import { commentatorName } from "../lib/bookMeta";
import { buildBoardGuide, guideLedSquares } from "../lib/boardGuide";
import { legalMoveMatchingPlacement } from "../lib/physicalGuess";

type Props = {
  summary: LessonSummary;
  onBack: () => void;
};

export function LessonPage({ summary, onBack }: Props) {
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
  /** Board placement when the lesson ply last changed — blocks auto-advance on rewind. */
  const placementAtPlyLanding = useRef<string | null>(null);
  const lastAutoAdvancedPlacement = useRef<string | null>(null);
  const lastWrongGuessPlacement = useRef<string | null>(null);
  const prevChessnutStatus = useRef<typeof chessnut.status | null>(null);

  useEffect(() => {
    loadLesson(summary.file)
      .then((data) => {
        setLesson(data);
        const saved = loadProgress();
        if (saved.lastLessonId === data.id && saved.lastPly !== undefined) setPly(saved.lastPly);
      })
      .catch((e: Error) => setError(e.message));
  }, [summary.file]);

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

  // Auto-enable quiz mode when the physical board connects (including reconnect on load).
  useEffect(() => {
    const was = prevChessnutStatus.current;
    if (chessnut.status === "connected" && was !== "connected") {
      setGuessEnabled(true);
    }
    prevChessnutStatus.current = chessnut.status;
  }, [chessnut.status]);

  // Remember physical position when ply changes (First / scrub / keyboard).
  // Auto-advance only if the board moves AFTER landing on this ply — otherwise
  // rewinding to the start while pieces are mid-game would instantly jump forward.
  useEffect(() => {
    placementAtPlyLanding.current = chessnut.placement;
    lastAutoAdvancedPlacement.current = null;
    lastWrongGuessPlacement.current = null;
    setPhysicalGuessFeedback(null);
    if (chessnut.status === "connected") {
      setAwaitingPhysicalSync(true);
    }
  }, [ply, chessnut.status]);

  useEffect(() => {
    if (placementAtPlyLanding.current == null && chessnut.placement) {
      placementAtPlyLanding.current = chessnut.placement;
    }
  }, [chessnut.placement]);

  const lessonPlacement = chess?.fen().split(" ")[0] ?? null;
  const isGuessing = guessEnabled && !revealed && !!nextNode?.san;
  const physicalConnected = chessnut.status === "connected";

  useEffect(() => {
    if (!awaitingPhysicalSync || !chessnut.placement || !lessonPlacement) return;
    if (chessnut.placement === lessonPlacement) {
      setAwaitingPhysicalSync(false);
    }
  }, [awaitingPhysicalSync, chessnut.placement, lessonPlacement]);

  useEffect(() => {
    if (chessnut.status !== "connected" || !chessnut.placement || !lesson || !chess) return;
    if (ply >= lesson.moveCount) return;
    // Do not advance while the board still needs to match the diagram (e.g. reset to start).
    if (awaitingPhysicalSync) return;
    if (placementAtPlyLanding.current == null) return;

    // Back on the diagram — clear wrong-guess state and wait for the next attempt.
    if (chessnut.placement === lessonPlacement) {
      lastWrongGuessPlacement.current = null;
      setPhysicalGuessFeedback(null);
      return;
    }

    if (chessnut.placement === placementAtPlyLanding.current) return;
    if (chessnut.placement === lastAutoAdvancedPlacement.current) return;

    if (isGuessing && nextNode?.san) {
      const guess = legalMoveMatchingPlacement(chess.fen(), chessnut.placement);
      if (!guess) return;

      if (guess.san.toLowerCase() === nextNode.san.toLowerCase()) {
        lastAutoAdvancedPlacement.current = chessnut.placement;
        setPhysicalGuessFeedback(`Correct — same as ${commentator}!`);
        setRevealed(true);
        goTo(ply + 1);
        return;
      }

      if (lastWrongGuessPlacement.current !== chessnut.placement) {
        lastWrongGuessPlacement.current = chessnut.placement;
        setPhysicalGuessFeedback(`${commentator} played ${nextNode.san} here.`);
        enqueueReview(lesson.id, ply + 1);
      }
      return;
    }

    const nextPlacement = buildPositionAtPly(lesson.nodes, ply + 1).fen().split(" ")[0];
    if (chessnut.placement !== nextPlacement) return;

    lastAutoAdvancedPlacement.current = chessnut.placement;
    setRevealed(true);
    goTo(ply + 1);
  }, [
    chessnut.status,
    chessnut.placement,
    lesson,
    chess,
    ply,
    goTo,
    awaitingPhysicalSync,
    isGuessing,
    nextNode?.san,
    lessonPlacement,
    commentator,
  ]);

  const boardGuide = useMemo(() => {
    if (chessnut.status !== "connected" || !chess) return null;
    return buildBoardGuide({
      boardPlacement: chessnut.placement,
      lessonPlacement: chess.fen().split(" ")[0]!,
      nextSan: nextNode?.san ?? null,
      chess,
      atEnd: ply >= maxPly,
      requireExactSync: awaitingPhysicalSync,
      hideNextMove: isGuessing,
    });
  }, [
    chessnut.status,
    chessnut.placement,
    chess,
    nextNode?.san,
    ply,
    maxPly,
    awaitingPhysicalSync,
    isGuessing,
  ]);

  // Apply play_move / clear LEDs immediately; debounce setup floods so a noisy
  // lift reading cannot flash every mismatched square. Exact sync after rewind
  // applies setup LEDs immediately (player must reset pieces).
  useEffect(() => {
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
  }, [boardGuide, chessnut.setLeds, awaitingPhysicalSync]);

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
  if (!lesson || !chess || !displayChess) return <div className="loading">Loading lesson…</div>;

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
          <button type="button" className="back-btn" onClick={onBack}>← Games</button>
          <div className="lesson-header-identity">
            <span className="lesson-game-num">Game {lesson.gameNum}</span>
          </div>
          <div className="lesson-header-actions">
            <ExportPromptButton lesson={lesson} ply={ply} />
            <div className="lesson-header-progress">
              <span className="lesson-progress-label">
                Move {ply} <span className="muted">/ {maxPly}</span>
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
              <span className="matchup-vs">vs</span>
              <span className="player-name">{lesson.players.black}</span>
            </h1>

            <div className="lesson-meta">
              {summary.intentionId || summary.book === "intentions" ? (
                <span
                  className="meta-chip meta-intention"
                  title={
                    summary.openingIdea
                      ? `${summary.openingName ?? "Ouverture"} — ${summary.openingIdea}`
                      : summary.why
                  }
                >
                  Intention · {summary.section}
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
              <summary>Opening idea</summary>
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
              />
            </div>
            <EngineBestLine
              fen={chess.fen()}
              eval={positionEval}
              status={evalStatus}
              hidden={!showEngine}
            />
          </div>

          <div className="study-chrome">
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
            />

            <ChessnutConnectBar
              status={chessnut.status}
              transport={chessnut.transport}
              battery={chessnut.battery}
              error={chessnut.error}
              supported={chessnut.supported}
              onConnect={(kind) => void chessnut.connect(kind)}
              onDisconnect={() => void chessnut.disconnect()}
              guide={boardGuide}
              guidePly={ply}
            />

            <MoveStrip
              nodes={lesson.nodes}
              ply={ply}
              onSelect={goTo}
              hideFuture={guessing}
            />

            {guessing && nextNode?.san && (
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
              />
            )}
          </div>
        </aside>

        <CommentaryPanel
          node={node}
          ply={ply}
          totalPlies={maxPly}
          onSanClick={handleSanClick}
          onAltClick={handleAltClick}
          commentator={commentator}
        />
      </div>
    </div>
  );
}
