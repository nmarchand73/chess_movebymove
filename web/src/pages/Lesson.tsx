import { useCallback, useEffect, useMemo, useState } from "react";
import type { Lesson, LessonSummary } from "../types";
import { loadLesson } from "../lib/lessonLoader";
import { buildPositionAtPly } from "../lib/chess";
import { normalizeCommentary, type AlternativeMove } from "../lib/commentary";
import { buildCommentaryBeats, beatsNeedStepping } from "../lib/commentaryBeats";
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
import { CommentaryPanel } from "../components/CommentaryPanel";
import { GuessMove } from "../components/GuessMove";
import { MoveStrip } from "../components/MoveStrip";
import { OpeningLabel } from "../components/OpeningLabel";
import { TransportBar } from "../components/TransportBar";
import { getOpeningTooltip } from "../lib/openingTooltips";

type Props = {
  summary: LessonSummary;
  onBack: () => void;
};

export function LessonPage({ summary, onBack }: Props) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [ply, setPly] = useState(0);
  const [beatIndex, setBeatIndex] = useState(0);
  const [preview, setPreview] = useState<{ fen: string; label: string } | null>(null);
  const [studyMode, setStudyMode] = useState(true);
  const [guessEnabled, setGuessEnabled] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const normalized = useMemo(
    () => normalizeCommentary(node?.text ?? "", node?.san),
    [node],
  );
  const beats = useMemo(() => buildCommentaryBeats(normalized), [normalized]);
  const hasMoreBeats = beatsNeedStepping(beats) && beatIndex < beats.length - 1;

  const showEngine = ply > 0 && !studyMode;
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
    setBeatIndex(0);
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
        setPreview({ fen: resolution.fen, label: resolution.label });
      }
    },
    [lesson, ply, goTo],
  );

  const advance = useCallback(() => {
    if (hasMoreBeats) {
      setBeatIndex((index) => index + 1);
      return;
    }
    if (ply < maxPly) goTo(ply + 1);
  }, [hasMoreBeats, ply, maxPly, goTo]);

  useEffect(() => {
    if (lesson) markContinue(lesson.id, ply, lesson.moveCount);
  }, [lesson, ply]);

  useEffect(() => {
    setBeatIndex(0);
    setPreview(null);
  }, [ply]);

  useEffect(() => {
    if (guessEnabled && nextNode?.san) {
      setRevealed(false);
    } else {
      setRevealed(true);
    }
  }, [ply, nextNode, guessEnabled]);

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
        if (beatIndex > 0) {
          setBeatIndex((index) => index - 1);
        } else if (ply > 0) {
          goTo(ply - 1);
        }
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
  }, [ply, maxPly, goTo, guessEnabled, revealed, nextNode, advance, beatIndex, preview]);

  if (error) return <p className="error">{error}</p>;
  if (!lesson || !chess || !displayChess) return <div className="loading">Loading lesson…</div>;

  const openingTip = getOpeningTooltip(lesson.opening);
  const sideToMove = ply === 0 ? "none" as const : chess.turn() === "w" ? "white" as const : "black" as const;
  const guessing = guessEnabled && !revealed && !!nextNode?.san;

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
          <div className="lesson-header-progress">
            <span className="lesson-progress-label">
              Move {ply} <span className="muted">/ {maxPly}</span>
            </span>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progressPct}%` }} />
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
              {lesson.event && <span className="meta-chip">{lesson.event}</span>}
              {lesson.opening && (
                <span className="meta-chip meta-opening">
                  <OpeningLabel name={lesson.opening} eco={lesson.eco} showTip={false} />
                </span>
              )}
              {lesson.result && <span className="meta-chip meta-result">{lesson.result}</span>}
            </div>
          </div>

          {openingTip && ply === 0 ? (
            <details className="opening-hint-details">
              <summary>Opening idea</summary>
              <p>{openingTip}</p>
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

          <TransportBar
            ply={ply}
            maxPly={maxPly}
            currentSan={node?.san}
            sideToMove={sideToMove}
            nextAnnotatedPly={nextNotePly}
            nextAnnotatedLabel={nextNoteLabel}
            hasMoreBeats={hasMoreBeats}
            onFirst={() => goTo(0)}
            onPrev={() => {
              if (beatIndex > 0) setBeatIndex((index) => index - 1);
              else goTo(ply - 1);
            }}
            onNext={advance}
            onNextAnnotated={() => nextNotePly && goTo(nextNotePly)}
            onLast={() => goTo(maxPly)}
            guessEnabled={guessEnabled}
            onToggleGuess={() => setGuessEnabled((v) => !v)}
            nextBlocked={guessing}
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
              onReveal={revealNext}
              onCorrect={() => undefined}
              onWrong={() => enqueueReview(lesson.id, ply + 1)}
            />
          )}
        </aside>

        <CommentaryPanel
          node={node}
          ply={ply}
          totalPlies={maxPly}
          beatIndex={beatIndex}
          onBeatChange={setBeatIndex}
          onSanClick={handleSanClick}
          onAltClick={handleAltClick}
          studyMode={studyMode}
          onStudyModeChange={setStudyMode}
        />
      </div>
    </div>
  );
}
