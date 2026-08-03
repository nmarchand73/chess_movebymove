import type { CommentaryBeat } from "./commentaryBeats.ts";
import { loadListenSettings, resolveSpeechVoice } from "./listenSettings.ts";

const RANK_WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight"] as const;

const PIECE_WORDS: Record<string, string> = {
  N: "knight",
  B: "bishop",
  R: "rook",
  Q: "queen",
  K: "king",
};

/** Move tokens worth expanding for TTS (with optional move-number prefix). */
const SPEECH_MOVE_PATTERN =
  /(?:\d+\s*\.{2,3}\s*|\d+\.\s*|\b\d+\s+)?(?:O-O-O|O-O|0-0-0|0-0|[NBRQK][a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQK])?|[a-h]x[a-h][1-8](?:=[NBRQK])?|x[a-h][1-8](?:=[NBRQK])?|[a-h][1-8])[+#?!‼⁇⁉⁈]*/gi;

/** Unicode NAG glyphs → ASCII, so one suffix parser covers both. */
export function normalizeEvalMarks(text: string): string {
  return text
    .replace(/‼/g, "!!")
    .replace(/⁇/g, "??")
    .replace(/⁉/g, "!?")
    .replace(/⁈/g, "?!");
}

/**
 * Classic NAG / check marks after a move (longest tokens first).
 * Order matters: !! before !, !? before !, etc.
 */
const ANNOTATION_SUFFIX_TOKENS: Array<[string, string]> = [
  ["!!", "brilliant"],
  ["??", "blunder"],
  ["!?", "interesting"],
  ["?!", "dubious"],
  ["!", "good"],
  ["?", "mistake"],
  ["#", "checkmate"],
  ["+", "check"],
];

function speakAnnotationSuffix(raw: string): string {
  const words: string[] = [];
  let rest = normalizeEvalMarks(raw);
  while (rest.length > 0) {
    const hit = ANNOTATION_SUFFIX_TOKENS.find(([token]) => rest.startsWith(token));
    if (!hit) break;
    words.push(hit[1]);
    rest = rest.slice(hit[0].length);
  }
  return words.join(" ");
}

/**
 * Informator / evaluation symbols in prose (not SAN suffixes).
 * Longer / more specific patterns first.
 */
const INFORMATOR_SPEECH: Array<[RegExp, string]> = [
  [/\+\-\-/g, "White is winning"],
  [/--\+/g, "Black is winning"],
  [/\+\/\-/g, "White is better"],
  [/-\/\+/g, "Black is better"],
  [/\+\/=/g, "White is slightly better"],
  [/=\/\+/g, "Black is slightly better"],
  [/=\/∞/g, "with compensation"],
  [/∞\/=/g, "with compensation"],
  [/±/g, "White is better"],
  [/∓/g, "Black is better"],
  [/⩲/g, "White is slightly better"],
  [/⩱/g, "Black is slightly better"],
  [/∞/g, "unclear"],
  [/△/g, "with the idea"],
  [/▲/g, "with the idea"],
  [/□/g, "only move"],
  [/⊙/g, "zugzwang"],
  [/◯/g, "zugzwang"],
  [/↑/g, "with initiative"],
  [/↓/g, "with a disadvantage"],
  [/⇄/g, "with counterplay"],
  [/⊕/g, "in time trouble"],
  [/†/g, "check"],
  [/‡/g, "checkmate"],
  // Informator attack arrow — only as a spaced symbol, not prose arrows.
  [/(?<=\s|^)→(?=\s|$)/g, "with an attack"],
];

export function speakInformatorSymbols(text: string): string {
  let out = text;
  for (const [pattern, spoken] of INFORMATOR_SPEECH) {
    out = out.replace(pattern, ` ${spoken} `);
  }
  return out;
}

function speakRank(rank: string): string {
  return RANK_WORDS[Number(rank)] ?? rank;
}

function speakSquare(square: string): string {
  return `${square[0]!.toLowerCase()} ${speakRank(square[1]!)}`;
}

function speakPiece(letter: string): string {
  return PIECE_WORDS[letter.toUpperCase()] ?? letter;
}

/** Expand a single SAN / castling token into spoken English. */
export function speakableSan(token: string): string {
  const trimmed = normalizeEvalMarks(token.trim());
  if (!trimmed) return trimmed;

  // Castling before move-number parsing — "0-0" must not become "move 0".
  const castleLong = trimmed.match(/^(?:O-O-O|0-0-0)([+#?!]*)$/i);
  if (castleLong) {
    const ann = speakAnnotationSuffix(castleLong[1] ?? "");
    return ann ? `castles queenside ${ann}` : "castles queenside";
  }

  const castleShort = trimmed.match(/^(?:O-O|0-0)([+#?!]*)$/i);
  if (castleShort) {
    const ann = speakAnnotationSuffix(castleShort[1] ?? "");
    return ann ? `castles kingside ${ann}` : "castles kingside";
  }

  const prefixed = trimmed.match(/^([1-9]\d*)\s*(\.{2,3}|\.)?\s*(.+)$/);
  if (prefixed) {
    const rest = prefixed[3]!;
    const restIsMove =
      /^(?:O-O-O|O-O|0-0-0|0-0)/i.test(rest) || /[NBRQKOa-hx]/i.test(rest);
    if (restIsMove) {
      const moveNum = prefixed[1]!;
      const dots = prefixed[2] ?? "";
      const spokenMove = speakableSan(rest);
      if (dots.startsWith("..")) return `move ${moveNum} for black, ${spokenMove}`;
      return `move ${moveNum}, ${spokenMove}`;
    }
  }

  const parsed = trimmed.match(
    /^([NBRQK])?([a-h]|[1-8])?(x)?([a-h][1-8])(?:=([NBRQK]))?([+#?!]*)$/i,
  );
  if (!parsed) return trimmed;

  const piece = parsed[1];
  const disambig = parsed[2];
  const capture = parsed[3];
  const dest = parsed[4]!;
  const promo = parsed[5];
  const ann = parsed[6] ?? "";
  const parts: string[] = [];

  if (piece) {
    parts.push(speakPiece(piece));
    if (disambig) {
      parts.push(/[a-h]/i.test(disambig) ? disambig.toLowerCase() : speakRank(disambig));
    }
    parts.push(capture ? "takes" : "to");
    parts.push(speakSquare(dest));
  } else if (capture && disambig) {
    parts.push(disambig.toLowerCase(), "takes", speakSquare(dest));
  } else if (capture) {
    parts.push("takes", speakSquare(dest));
  } else {
    parts.push(speakSquare(dest));
  }

  if (promo) {
    parts.push("promotes to", speakPiece(promo));
  }

  const annWords = speakAnnotationSuffix(ann);
  if (annWords) parts.push(annWords);

  return parts.join(" ");
}

/**
 * Rewrite chess notation so browser TTS says "check" / "knight to f three"
 * instead of "plus" / "N F three".
 */
export function prepareCommentarySpeech(text: string): string {
  let out = normalizeEvalMarks(text);

  // Hyphenated chess jargon before generic square rewrites.
  out = out.replace(/\b([a-h])-pawn\b/gi, (_, file: string) => `${file.toLowerCase()} pawn`);
  out = out.replace(/\b([a-h][1-8])-square\b/gi, (_, sq: string) => `${speakSquare(sq)} square`);

  // Spaced check / mate marks left by EPUB cleanup: "h4 +" / "xe4 #"
  out = out.replace(/\b([NBRQK]?[a-h]?x?[a-h][1-8])\s+\+/gi, "$1+");
  out = out.replace(/\b([NBRQK]?[a-h]?x?[a-h][1-8])\s+#/gi, "$1#");

  out = out.replace(SPEECH_MOVE_PATTERN, (match) => speakableSan(match));
  out = speakInformatorSymbols(out);

  return out.replace(/\s+/g, " ").trim();
}

/** Join commentary chunks, inserting a period when the previous chunk has no closer. */
export function joinSpeechParts(parts: string[]): string {
  let out = "";
  for (const part of parts) {
    const chunk = part.trim();
    if (!chunk) continue;
    if (!out) {
      out = chunk;
      continue;
    }
    const needsStop = !/[.!?…]["”']?$/.test(out);
    out += needsStop ? `. ${chunk}` : ` ${chunk}`;
  }
  return out;
}

/**
 * Split prepared prose into sentences so each can be its own utterance.
 * Browser TTS often ignores periods inside a single long utterance.
 */
export function splitIntoSpeechSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences: string[] = [];
  const pattern = /[^.!?]+(?:[.!?]+["”']*|$)/g;
  for (const match of normalized.matchAll(pattern)) {
    const sentence = match[0]!.trim();
    if (sentence) sentences.push(sentence);
  }

  return sentences.length > 0 ? sentences : [normalized];
}

function takeawayAlreadyInBeats(takeaway: string, beats: CommentaryBeat[]): boolean {
  const needle = takeaway.trim().replace(/[.!?]+$/, "").toLowerCase();
  if (!needle) return true;
  for (const beat of beats) {
    switch (beat.kind) {
      case "heading":
      case "prose":
      case "principle":
        if (beat.text.trim().toLowerCase().startsWith(needle)) return true;
        break;
      case "alternatives":
        break;
      default: {
        const _exhaustive: never = beat;
        return _exhaustive;
      }
    }
  }
  return false;
}

/** Flatten commentary beats into plain prose for TTS. */
export function commentaryToSpeechText(
  beats: CommentaryBeat[],
  takeaway?: string | null,
): string {
  const parts: string[] = [];

  if (takeaway?.trim() && !takeawayAlreadyInBeats(takeaway, beats)) {
    parts.push(takeaway.trim());
  }

  for (const beat of beats) {
    switch (beat.kind) {
      case "heading":
      case "prose":
      case "principle":
        if (beat.text.trim()) parts.push(beat.text.trim());
        break;
      case "alternatives": {
        if (beat.intro?.trim()) parts.push(beat.intro.trim());
        for (const alt of beat.alternatives) {
          const bits = [alt.label];
          if (alt.verdict) bits.push(alt.verdict);
          if (alt.quote?.trim()) bits.push(alt.quote.trim());
          parts.push(bits.join(". "));
        }
        break;
      }
      default: {
        const _exhaustive: never = beat;
        return _exhaustive;
      }
    }
  }

  return prepareCommentarySpeech(joinSpeechParts(parts));
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Bumped on cancel so in-flight sentence queues stop cleanly. */
let speakGeneration = 0;
const pendingPauseTimers = new Set<ReturnType<typeof setTimeout>>();

function clearSpeechPauseTimers(): void {
  for (const timer of pendingPauseTimers) clearTimeout(timer);
  pendingPauseTimers.clear();
}

export function stopCommentarySpeech(): void {
  speakGeneration += 1;
  clearSpeechPauseTimers();
  if (!speechSupported()) return;
  window.speechSynthesis.cancel();
}

type SpeakHandlers = {
  onEnd?: () => void;
  onError?: () => void;
};

const SENTENCE_GAP_MS = 320;

/** Speak commentary sentence-by-sentence so end-of-sentence pauses are heard. */
export function speakCommentary(text: string, handlers: SpeakHandlers = {}): boolean {
  if (!speechSupported() || !text.trim()) return false;

  stopCommentarySpeech();
  const myGeneration = speakGeneration;
  const settings = loadListenSettings();
  const voice = resolveSpeechVoice(settings.voiceURI);

  const sentences = splitIntoSpeechSentences(prepareCommentarySpeech(text));
  if (sentences.length === 0) return false;

  let index = 0;

  const queueNext = () => {
    if (myGeneration !== speakGeneration) return;

    if (index >= sentences.length) {
      handlers.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sentences[index]!);
    index += 1;
    utterance.lang = voice?.lang ?? "en-GB";
    utterance.rate = settings.rate;
    utterance.pitch = 1;
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (myGeneration !== speakGeneration) return;
      if (index >= sentences.length) {
        handlers.onEnd?.();
        return;
      }
      // Browser TTS often glues utterances together — insert a real gap.
      const timer = setTimeout(() => {
        pendingPauseTimers.delete(timer);
        queueNext();
      }, SENTENCE_GAP_MS);
      pendingPauseTimers.add(timer);
    };
    utterance.onerror = () => {
      if (myGeneration !== speakGeneration) return;
      // cancel() triggers error on the current utterance — ignore if we stopped on purpose
      if (index >= sentences.length) {
        handlers.onEnd?.();
        return;
      }
      handlers.onError?.();
    };

    window.speechSynthesis.speak(utterance);
  };

  queueNext();
  return true;
}


