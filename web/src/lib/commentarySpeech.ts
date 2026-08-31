import type { CommentaryBeat } from "./commentaryBeats.ts";
import { loadLang, type Lang } from "./lang.ts";
import { loadListenSettings, resolveSpeechVoice, speechVoicesForLang } from "./listenSettings.ts";

type SpeechLexicon = {
  ranks: readonly string[];
  pieces: Record<string, string>;
  annotations: Array<[string, string]>;
  castlesLong: string;
  castlesShort: string;
  move: string;
  forBlack: string;
  takes: string;
  to: string;
  promotesTo: string;
  pawn: string;
  square: string;
  and: string;
  informator: Array<[RegExp, string]>;
  /** Word forms after a spoken move, used to insert a pause before the next numbered move. */
  spokenMoveTailWords: string;
};

const EN_LEXICON: SpeechLexicon = {
  ranks: ["", "one", "two", "three", "four", "five", "six", "seven", "eight"],
  pieces: { N: "knight", B: "bishop", R: "rook", Q: "queen", K: "king" },
  annotations: [
    ["!!", "brilliant"],
    ["??", "blunder"],
    ["!?", "interesting"],
    ["?!", "dubious"],
    ["!", "good"],
    ["?", "mistake"],
    ["#", "checkmate"],
    ["+", "check"],
  ],
  castlesLong: "castles queenside",
  castlesShort: "castles kingside",
  move: "move",
  forBlack: "for black",
  takes: "takes",
  to: "to",
  promotesTo: "promotes to",
  pawn: "pawn",
  square: "square",
  and: "and",
  spokenMoveTailWords:
    "checkmate|check|brilliant|blunder|interesting|dubious|good|mistake|kingside|queenside|knight|bishop|rook|queen|king|one|two|three|four|five|six|seven|eight",
  informator: [
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
    [/(?<=\s|^)→(?=\s|$)/g, "with an attack"],
  ],
};

const FR_LEXICON: SpeechLexicon = {
  ranks: ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit"],
  pieces: { N: "cavalier", B: "fou", R: "tour", Q: "dame", K: "roi" },
  annotations: [
    ["!!", "brillant"],
    ["??", "gaffe"],
    ["!?", "intéressant"],
    ["?!", "douteux"],
    ["!", "bon"],
    ["?", "erreur"],
    ["#", "mat"],
    ["+", "échec"],
  ],
  castlesLong: "grand roque",
  castlesShort: "petit roque",
  move: "coup",
  forBlack: "des Noirs",
  takes: "prend",
  to: "en",
  promotesTo: "promu en",
  pawn: "pion",
  square: "case",
  and: "et",
  spokenMoveTailWords:
    "mat|échec|brillant|gaffe|intéressant|douteux|bon|erreur|aile|roi|dame|cavalier|fou|tour|un|deux|trois|quatre|cinq|six|sept|huit|roque",
  informator: [
    [/\+\-\-/g, "les Blancs gagnent"],
    [/--\+/g, "les Noirs gagnent"],
    [/\+\/\-/g, "les Blancs sont mieux"],
    [/-\/\+/g, "les Noirs sont mieux"],
    [/\+\/=/g, "les Blancs sont légèrement mieux"],
    [/=\/\+/g, "les Noirs sont légèrement mieux"],
    [/=\/∞/g, "avec compensation"],
    [/∞\/=/g, "avec compensation"],
    [/±/g, "les Blancs sont mieux"],
    [/∓/g, "les Noirs sont mieux"],
    [/⩲/g, "les Blancs sont légèrement mieux"],
    [/⩱/g, "les Noirs sont légèrement mieux"],
    [/∞/g, "peu clair"],
    [/△/g, "avec l'idée"],
    [/▲/g, "avec l'idée"],
    [/□/g, "seul coup"],
    [/⊙/g, "zugzwang"],
    [/◯/g, "zugzwang"],
    [/↑/g, "avec l'initiative"],
    [/↓/g, "avec un désavantage"],
    [/⇄/g, "avec contrejeu"],
    [/⊕/g, "en zeitnot"],
    [/†/g, "échec"],
    [/‡/g, "mat"],
    [/(?<=\s|^)→(?=\s|$)/g, "avec une attaque"],
  ],
};

function lexiconFor(lang: Lang): SpeechLexicon {
  return lang === "fr" ? FR_LEXICON : EN_LEXICON;
}

/** One SAN / castling token (no move number). */
const SAN_TOKEN =
  "(?:O-O-O|O-O|0-0-0|0-0|[NBRQK][a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQK])?|[a-h]x[a-h][1-8](?:=[NBRQK])?|[a-h][1-8]=[NBRQK]|x[a-h][1-8](?:=[NBRQK])?|[a-h][1-8])[+#?!‼⁇⁉⁈]*";

/** Full move pair: "28 f3 exf3+" / "28. f3 exf3+". */
const FULL_MOVE_PAIR = new RegExp(`\\b(\\d+)\\s*\\.?\\s*(${SAN_TOKEN})\\s+(${SAN_TOKEN})`, "gi");

/** Move tokens worth expanding for TTS (with optional move-number prefix). */
const SPEECH_MOVE_PATTERN = new RegExp(
  `(?:\\d+\\s*\\.{2,3}\\s*|\\d+\\.\\s*|\\b\\d+\\s+)?(?:${SAN_TOKEN})`,
  "gi",
);

/** Unicode NAG glyphs → ASCII, so one suffix parser covers both. */
export function normalizeEvalMarks(text: string): string {
  return text
    .replace(/‼/g, "!!")
    .replace(/⁇/g, "??")
    .replace(/⁉/g, "!?")
    .replace(/⁈/g, "?!");
}

function speakAnnotationSuffix(raw: string, lex: SpeechLexicon): string {
  const words: string[] = [];
  let rest = normalizeEvalMarks(raw);
  while (rest.length > 0) {
    const hit = lex.annotations.find(([token]) => rest.startsWith(token));
    if (!hit) break;
    words.push(hit[1]);
    rest = rest.slice(hit[0].length);
  }
  return words.join(" ");
}

export function speakInformatorSymbols(text: string, lang: Lang = "en"): string {
  let out = text;
  for (const [pattern, spoken] of lexiconFor(lang).informator) {
    out = out.replace(pattern, ` ${spoken} `);
  }
  return out;
}

function speakRank(rank: string, lex: SpeechLexicon): string {
  return lex.ranks[Number(rank)] ?? rank;
}

function speakSquare(square: string, lex: SpeechLexicon): string {
  return `${square[0]!.toLowerCase()} ${speakRank(square[1]!, lex)}`;
}

function speakPiece(letter: string, lex: SpeechLexicon): string {
  return lex.pieces[letter.toUpperCase()] ?? letter;
}

/** Expand a single SAN / castling token into spoken language. */
export function speakableSan(token: string, lang: Lang = "en"): string {
  const lex = lexiconFor(lang);
  const trimmed = normalizeEvalMarks(token.trim());
  if (!trimmed) return trimmed;

  // Castling before move-number parsing — "0-0" must not become "move 0".
  const castleLong = trimmed.match(/^(?:O-O-O|0-0-0)([+#?!]*)$/i);
  if (castleLong) {
    const ann = speakAnnotationSuffix(castleLong[1] ?? "", lex);
    return ann ? `${lex.castlesLong} ${ann}` : lex.castlesLong;
  }

  const castleShort = trimmed.match(/^(?:O-O|0-0)([+#?!]*)$/i);
  if (castleShort) {
    const ann = speakAnnotationSuffix(castleShort[1] ?? "", lex);
    return ann ? `${lex.castlesShort} ${ann}` : lex.castlesShort;
  }

  const prefixed = trimmed.match(/^([1-9]\d*)\s*(\.{2,3}|\.)?\s*(.+)$/);
  if (prefixed) {
    const rest = prefixed[3]!;
    const restIsMove =
      /^(?:O-O-O|O-O|0-0-0|0-0)/i.test(rest) || /[NBRQKOa-hx]/i.test(rest);
    if (restIsMove) {
      const moveNum = prefixed[1]!;
      const dots = prefixed[2] ?? "";
      const spokenMove = speakableSan(rest, lang);
      if (dots.startsWith("..")) {
        return `${lex.move} ${moveNum} ${lex.forBlack}, ${spokenMove}`;
      }
      return `${lex.move} ${moveNum}, ${spokenMove}`;
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
    parts.push(speakPiece(piece, lex));
    if (disambig) {
      parts.push(/[a-h]/i.test(disambig) ? disambig.toLowerCase() : speakRank(disambig, lex));
    }
    parts.push(capture ? lex.takes : lex.to);
    parts.push(speakSquare(dest, lex));
  } else if (capture && disambig) {
    // French: "e prend d quatre" ; English: "e takes d four"
    parts.push(disambig.toLowerCase(), lex.takes, speakSquare(dest, lex));
  } else if (capture) {
    parts.push(lex.takes, speakSquare(dest, lex));
  } else {
    parts.push(speakSquare(dest, lex));
  }

  if (promo) {
    parts.push(lex.promotesTo, speakPiece(promo, lex));
  }

  const annWords = speakAnnotationSuffix(ann, lex);
  if (annWords) parts.push(annWords);

  return parts.join(" ");
}

/**
 * Rewrite chess notation so browser TTS says "check" / "knight to f three"
 * (or FR: "échec" / "cavalier en f trois") instead of "plus" / "N F three".
 */
export function prepareCommentarySpeech(text: string, lang: Lang = "en"): string {
  const lex = lexiconFor(lang);
  let out = normalizeEvalMarks(text);

  // Hyphenated chess jargon before generic square rewrites.
  if (lang === "fr") {
    out = out.replace(/\b([a-h])-pawn\b/gi, (_, file: string) => `${lex.pawn} ${file.toLowerCase()}`);
    out = out.replace(/\bpion\s+([a-h])\b/gi, (_, file: string) => `${lex.pawn} ${file.toLowerCase()}`);
  } else {
    out = out.replace(/\b([a-h])-pawn\b/gi, (_, file: string) => `${file.toLowerCase()} ${lex.pawn}`);
  }

  // Diagonals / segments: "a2-g8" before bare squares are rewritten.
  out = out.replace(/\b([a-h][1-8])-([a-h][1-8])\b/gi, (_match, a: string, b: string) => {
    const link = lang === "fr" ? "à" : "to";
    return `${speakSquare(a, lex)} ${link} ${speakSquare(b, lex)}`;
  });
  out = out.replace(/\b([a-h][1-8])-square\b/gi, (_, sq: string) => {
    return lang === "fr"
      ? `${lex.square} ${speakSquare(sq, lex)}`
      : `${speakSquare(sq, lex)} ${lex.square}`;
  });

  // Spaced check / mate marks left by EPUB cleanup: "h4 +" / "xe4 #"
  out = out.replace(/\b([NBRQK]?[a-h]?x?[a-h][1-8])\s+\+/gi, "$1+");
  out = out.replace(/\b([NBRQK]?[a-h]?x?[a-h][1-8])\s+#/gi, "$1#");

  // Full move pairs before single moves: "28 f3 exf3+" → clear white / black pause.
  out = out.replace(FULL_MOVE_PAIR, (_match, num: string, white: string, black: string) => {
    return `${lex.move} ${num}, ${speakableSan(white, lang)}, ${speakableSan(black, lang)}`;
  });

  out = out.replace(SPEECH_MOVE_PATTERN, (match) => speakableSan(match, lang));

  // "… check move 17 …" → "… check. move 17 …" (FR: "… échec. coup 17 …")
  const spokenMoveTail = new RegExp(
    `(?:${lex.spokenMoveTailWords})\\s+(?=${lex.move}\\s+\\d+)`,
    "gi",
  );
  out = out.replace(spokenMoveTail, (tail) => `${tail.trimEnd()}. `);

  // "blunder loses" → "blunder and loses" / "gaffe perd" → "gaffe et perd"
  const softAnn =
    lang === "fr"
      ? /\b(brillant|gaffe|intéressant|douteux|bon|erreur)\s+(perd|gagne|donne|mène|autorise|rate|échoue)\b/gi
      : /\b(brilliant|blunder|interesting|dubious|good|mistake)\s+(loses|wins|gives|leads|allows|misses|fails)\b/gi;
  out = out.replace(softAnn, `$1 ${lex.and} $2`);

  out = speakInformatorSymbols(out, lang);

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
  lang: Lang = "en",
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

  return prepareCommentarySpeech(joinSpeechParts(parts), lang);
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Bumped on cancel so in-flight sentence queues stop cleanly. */
let speakGeneration = 0;
let speechHoldPaused = false;
let resumeAfterHold: (() => void) | null = null;
const pendingPauseTimers = new Set<ReturnType<typeof setTimeout>>();

function clearSpeechPauseTimers(): void {
  for (const timer of pendingPauseTimers) clearTimeout(timer);
  pendingPauseTimers.clear();
}

export function stopCommentarySpeech(): void {
  speakGeneration += 1;
  speechHoldPaused = false;
  resumeAfterHold = null;
  clearSpeechPauseTimers();
  if (!speechSupported()) return;
  window.speechSynthesis.cancel();
}

export function pauseCommentarySpeech(): boolean {
  if (!speechSupported()) return false;
  speechHoldPaused = true;
  window.speechSynthesis.pause();
  return true;
}

export function resumeCommentarySpeech(): boolean {
  if (!speechSupported()) return false;
  speechHoldPaused = false;
  window.speechSynthesis.resume();
  if (resumeAfterHold) {
    const cont = resumeAfterHold;
    resumeAfterHold = null;
    cont();
  }
  return true;
}

export function commentarySpeechPaused(): boolean {
  return speechHoldPaused || (speechSupported() && window.speechSynthesis.paused);
}

type SpeakHandlers = {
  onEnd?: () => void;
  onError?: () => void;
};

const SENTENCE_GAP_MS = 320;

function scheduleNextSentence(myGeneration: number, queueNext: () => void): void {
  const timer = setTimeout(() => {
    pendingPauseTimers.delete(timer);
    if (myGeneration !== speakGeneration) return;
    if (speechHoldPaused) {
      resumeAfterHold = () => {
        if (myGeneration === speakGeneration) queueNext();
      };
      return;
    }
    queueNext();
  }, SENTENCE_GAP_MS);
  pendingPauseTimers.add(timer);
}

/** Speak commentary sentence-by-sentence so end-of-sentence pauses are heard. */
export function speakCommentary(text: string, handlers: SpeakHandlers = {}): boolean {
  if (!speechSupported() || !text.trim()) return false;

  stopCommentarySpeech();
  const myGeneration = speakGeneration;
  speechHoldPaused = false;
  const settings = loadListenSettings();
  const lang = loadLang();
  const voice = resolveSpeechVoice(settings.voiceURI, speechVoicesForLang(lang), lang);

  const sentences = splitIntoSpeechSentences(prepareCommentarySpeech(text, lang));
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
    utterance.lang = voice?.lang ?? (lang === "fr" ? "fr-FR" : "en-GB");
    utterance.rate = settings.rate;
    utterance.pitch = 1;
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (myGeneration !== speakGeneration) return;
      if (index >= sentences.length) {
        handlers.onEnd?.();
        return;
      }
      scheduleNextSentence(myGeneration, queueNext);
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
