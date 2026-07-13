import { useMemo } from "react";
import type { AnnotationNode } from "../types";
import {
  buildCommentaryBeats,
  beatsNeedStepping,
  extractPrinciples,
  extractTakeaway,
  type CommentaryBeat,
} from "../lib/commentaryBeats";
import {
  formatSanWithSymbols,
  hasSubstantiveAltQuote,
  highlightChessNotation,
  normalizeCommentary,
  type AlternativeMove,
  type TextSegment,
} from "../lib/commentary";

type Props = {
  node: AnnotationNode | undefined;
  ply: number;
  totalPlies: number;
  beatIndex: number;
  onBeatChange: (index: number) => void;
  onSanClick: (notation: string) => void;
  onAltClick: (alt: AlternativeMove) => void;
  studyMode: boolean;
  onStudyModeChange: (value: boolean) => void;
};

function CommentaryParagraph({
  text,
  lede,
  onSanClick,
}: {
  text: string;
  lede?: boolean;
  onSanClick: (notation: string) => void;
}) {
  const segments = useMemo(() => highlightChessNotation(text), [text]);
  return (
    <p className={lede ? "lede" : undefined}>
      {segments.map((seg, i) => (
        <CommentarySegment key={i} segment={seg} onSanClick={onSanClick} />
      ))}
    </p>
  );
}

function CommentarySegment({
  segment,
  onSanClick,
}: {
  segment: TextSegment;
  onSanClick: (notation: string) => void;
}) {
  if (segment.type === "san") {
    return (
      <button
        type="button"
        className="san san-link"
        onClick={() => onSanClick(segment.value)}
        title="Show this move on the board"
      >
        {segment.value}
      </button>
    );
  }
  return <>{segment.value}</>;
}

function AlternativeChip({
  alt,
  onAltClick,
}: {
  alt: AlternativeMove;
  onAltClick: (alt: AlternativeMove) => void;
}) {
  const showQuote = hasSubstantiveAltQuote(alt);

  return (
    <li className="alt-chip-item">
      <button
        type="button"
        className={`alt-chip tone-${alt.tone}${alt.isPlayed ? " played" : ""}`}
        onClick={() => onAltClick(alt)}
        title={showQuote ? alt.quote : "Preview this move on the board"}
      >
        <span className="alt-chip-move">{formatSanWithSymbols(alt.label)}</span>
        {alt.verdict ? <span className="alt-chip-verdict">{alt.verdict}</span> : null}
        {alt.isPlayed ? <span className="alt-chip-played" aria-label="Played">✓</span> : null}
      </button>
      {showQuote ? <p className="alt-chip-quote">{alt.quote}</p> : null}
    </li>
  );
}

function BeatContent({
  beat,
  onSanClick,
  onAltClick,
}: {
  beat: CommentaryBeat;
  onSanClick: (notation: string) => void;
  onAltClick: (alt: AlternativeMove) => void;
}) {
  if (beat.kind === "prose") {
    return <CommentaryParagraph text={beat.text} onSanClick={onSanClick} />;
  }

  if (beat.kind === "principle") {
    return <blockquote className="principle-callout">{beat.text}</blockquote>;
  }

  return (
    <div className="prelude-block">
      <h3>{beat.intro ? "Choosing the reply" : "Alternatives considered"}</h3>
      <div className="alt-intro-row">
        {beat.intro ? <p className="alt-intro">{beat.intro}</p> : null}
        <ul className="alt-chip-row">
          {beat.alternatives.map((alt) => (
            <AlternativeChip key={alt.label + alt.quote.slice(0, 24)} alt={alt} onAltClick={onAltClick} />
          ))}
        </ul>
      </div>
    </div>
  );
}

export function CommentaryPanel({
  node,
  ply,
  totalPlies,
  beatIndex,
  onBeatChange,
  onSanClick,
  onAltClick,
  studyMode,
  onStudyModeChange,
}: Props) {
  const label = ply === 0 ? "Introduction" : node?.san ? `${formatMoveNumber(ply)} ${node.san}` : `Move ${ply}`;

  const normalized = useMemo(
    () => normalizeCommentary(node?.text ?? "", node?.san),
    [node],
  );

  const takeaway = useMemo(() => extractTakeaway(normalized), [normalized]);
  const principles = useMemo(
    () => extractPrinciples([...normalized.main, ...normalized.tail]),
    [normalized],
  );
  const beats = useMemo(() => buildCommentaryBeats(normalized), [normalized]);
  const stepping = beatsNeedStepping(beats);
  const safeBeatIndex = Math.min(beatIndex, Math.max(0, beats.length - 1));
  const currentBeat = beats[safeBeatIndex];

  const hasContent = beats.length > 0 || principles.length > 0;

  return (
    <section className="commentary">
      <header className="commentary-header">
        <div>
          <p className="eyebrow">Chernev explains</p>
          <h2>{label}</h2>
        </div>
        <div className="commentary-badges">
          <span className="pill">{ply}/{totalPlies}</span>
          {node?.isCritical ? <span className="pill critical">Key moment</span> : null}
          {hasContent ? <span className="pill accent">Annotated</span> : null}
          <label className="study-mode-toggle" title="Hide engine eval while reading Chernev">
            <input
              type="checkbox"
              checked={studyMode}
              onChange={(e) => onStudyModeChange(e.target.checked)}
            />
            Study mode
          </label>
        </div>
      </header>

      <article className="commentary-body">
        {!hasContent && (
          <p className="muted empty-note">Chernev does not pause on this move — continue to the next.</p>
        )}

        {normalized.hadDiagram && hasContent && (
          <p className="board-hint">Study the position on the board ←</p>
        )}

        {takeaway && hasContent ? (
          <p className="commentary-takeaway">{takeaway}</p>
        ) : null}

        {principles.length > 0 ? (
          <div className="principle-list">
            {principles.slice(0, 2).map((p) => (
              <blockquote key={p} className="principle-callout">{p}</blockquote>
            ))}
          </div>
        ) : null}

        {currentBeat ? (
          <BeatContent beat={currentBeat} onSanClick={onSanClick} onAltClick={onAltClick} />
        ) : null}

        {stepping ? (
          <div className="beat-nav">
            <button
              type="button"
              className="secondary"
              disabled={safeBeatIndex === 0}
              onClick={() => onBeatChange(safeBeatIndex - 1)}
            >
              ← Earlier
            </button>
            <span className="beat-counter">
              Part {safeBeatIndex + 1} / {beats.length}
            </span>
            <button
              type="button"
              className="secondary"
              disabled={safeBeatIndex >= beats.length - 1}
              onClick={() => onBeatChange(safeBeatIndex + 1)}
            >
              Continue →
            </button>
          </div>
        ) : null}
      </article>
    </section>
  );
}

function formatMoveNumber(ply: number): string {
  const moveNum = Math.ceil(ply / 2);
  return ply % 2 === 1 ? `${moveNum}.` : `${moveNum}...`;
}
