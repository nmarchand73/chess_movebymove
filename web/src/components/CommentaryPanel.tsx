import { useEffect, useMemo, useState } from "react";
import type { AnnotationNode } from "../types";
import {
  buildCommentaryBeats,
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
import {
  commentaryToSpeechText,
  speakCommentary,
  speechSupported,
  stopCommentarySpeech,
} from "../lib/commentarySpeech";

type Props = {
  node: AnnotationNode | undefined;
  ply: number;
  totalPlies: number;
  onSanClick: (notation: string) => void;
  onAltClick: (alt: AlternativeMove) => void;
  commentator: string;
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
  switch (beat.kind) {
    case "heading":
      return <h3 className="commentary-chapter">{beat.text}</h3>;
    case "prose":
    case "principle":
      return <CommentaryParagraph text={beat.text} onSanClick={onSanClick} />;
    case "alternatives":
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
    default: {
      const _exhaustive: never = beat;
      return _exhaustive;
    }
  }
}

export function CommentaryPanel({
  node,
  ply,
  totalPlies,
  onSanClick,
  onAltClick,
  commentator,
}: Props) {
  const [speaking, setSpeaking] = useState(false);
  const canSpeak = speechSupported();

  const label = ply === 0 ? "Introduction" : node?.san ? `${formatMoveNumber(ply)} ${node.san}` : `Move ${ply}`;

  const normalized = useMemo(
    () => normalizeCommentary(node?.text ?? "", node?.san),
    [node],
  );

  const takeaway = useMemo(() => extractTakeaway(normalized), [normalized]);
  const beats = useMemo(() => buildCommentaryBeats(normalized), [normalized]);
  const headingBeat = beats.find((beat): beat is Extract<CommentaryBeat, { kind: "heading" }> => beat.kind === "heading");
  const hasContent = beats.length > 0;

  const speechText = useMemo(() => {
    const body = commentaryToSpeechText(beats, headingBeat ? null : takeaway);
    if (!body) return "";
    if (ply === 0) return body;
    return `${label}. ${body}`;
  }, [beats, takeaway, headingBeat, label, ply]);

  useEffect(() => {
    stopCommentarySpeech();
    setSpeaking(false);
  }, [ply, node?.text]);

  useEffect(() => () => stopCommentarySpeech(), []);

  function toggleListen() {
    if (speaking) {
      stopCommentarySpeech();
      setSpeaking(false);
      return;
    }
    const started = speakCommentary(speechText, {
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
    setSpeaking(started);
  }

  return (
    <section className="commentary">
      <header className="commentary-header">
        <div>
          <p className="eyebrow">{commentator} explains</p>
          <h2>{label}</h2>
        </div>
        <div className="commentary-badges">
          <span className="pill">{ply}/{totalPlies}</span>
          {node?.isCritical ? <span className="pill critical">Key moment</span> : null}
          {hasContent ? <span className="pill accent">Annotated</span> : null}
          {canSpeak && hasContent ? (
            <button
              type="button"
              className={`commentary-listen${speaking ? " is-speaking" : ""}`}
              onClick={toggleListen}
              aria-pressed={speaking}
              aria-label={speaking ? "Stop reading" : "Listen to this commentary"}
              title={speaking ? "Stop reading" : "Listen to this commentary"}
            >
              {speaking ? <StopIcon /> : <SpeakerIcon />}
            </button>
          ) : null}
        </div>
      </header>

      <article className="commentary-body">
        {!hasContent && (
          <p className="muted empty-note">{commentator} does not pause on this move — continue to the next.</p>
        )}

        {normalized.hadDiagram && hasContent && (
          <p className="board-hint">Study the position on the board ←</p>
        )}

        {takeaway && hasContent && !headingBeat ? (
          <p className="commentary-takeaway">{takeaway}</p>
        ) : null}

        {beats.map((beat, index) => (
          <BeatContent
            key={`${beat.kind}-${index}`}
            beat={beat}
            onSanClick={onSanClick}
            onAltClick={onAltClick}
          />
        ))}
      </article>
    </section>
  );
}

function formatMoveNumber(ply: number): string {
  const moveNum = Math.ceil(ply / 2);
  return ply % 2 === 1 ? `${moveNum}.` : `${moveNum}...`;
}

function SpeakerIcon() {
  return (
    <svg className="commentary-listen-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg className="commentary-listen-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect fill="currentColor" x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  );
}
