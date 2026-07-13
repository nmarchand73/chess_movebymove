const DIAGRAM = /^\(D\)$|^D$/;
const ORPHAN_MOVE = /^[NBRQK]?[a-h]?x?[a-h][1-8](?:=[NBRQK])?[+#?!]*$/i;
const ALT_MOVE_LINE = /^\d+\.{2,3}\s*[a-z0-9]+:/i;
const PRELUDE_START = /^(At this point|There are several ways|How (?:shall|does)|Here is what might go through)/i;
const MOVE_NUM_ONLY = /^\d+\.{2,3}\s*$/;
const WHITE_MOVE_NUM_ONLY = /^\d+\s*$/;

const SAN_PATTERN =
  /\d+\.{2,3}\s*[NBRQK]?[a-h][1-8](?:x[a-h][1-8])?(?:=[NBRQK])?[+#?!]*|\d+\.\s*[NBRQK]?[a-h][1-8](?:x[a-h][1-8])?(?:=[NBRQK])?[+#?!]*|\d+\s+[NBRQK]?[a-h][1-8](?:x[a-h][1-8])?(?:=[NBRQK])?[+#?!]*|[NBRQK][a-h][1-8](?:x[a-h][1-8])?(?:=[NBRQK])?[+#?!]*|[a-h]x[a-h][1-8](?:=[NBRQK])?[+#?!]*|O-O-O(?:[+#])?|O-O(?:[+#])?/g;

const INLINE_MOVE = /(\d+\.{2,3})\s*([NBRQK]?[a-h]?x?[a-h][1-8](?:=[NBRQK])?[+#?!]*|O-O-O|O-O)/g;

export type TextSegment = { type: "text"; value: string } | { type: "san"; value: string };
export type AlternativeTone = "bad" | "ok" | "best" | "neutral";

export { formatSanWithSymbols } from "./sanSymbols.ts";

export type AlternativeMove = {
  label: string;
  move: string;
  quote: string;
  verdict?: string;
  tone: AlternativeTone;
  isPlayed?: boolean;
};

const BOILERPLATE_ALT_QUOTES = new Set([
  "one option considered here.",
  "a good alternative.",
]);

/** Placeholder text from or-list parsing — not worth showing in the UI. */
export function isBoilerplateAltQuote(quote: string): boolean {
  const normalized = quote
    .replace(/^[“"]|[”"]$/g, "")
    .trim()
    .toLowerCase();
  return normalized.length === 0 || BOILERPLATE_ALT_QUOTES.has(normalized);
}

export function hasSubstantiveAltQuote(alt: AlternativeMove): boolean {
  return !isBoilerplateAltQuote(alt.quote);
}

export type NormalizedCommentary = {
  main: string[];
  prelude: string[];
  alternatives: AlternativeMove[];
  alternativesIntro?: string;
  tail: string[];
  hadDiagram: boolean;
};

function moveSuffix(san?: string): string {
  return san?.replace(/[+#!?]+$/, "").replace(/^[NBRQK]/, "") ?? "";
}

function isOrphanLine(line: string, suffix: string): boolean {
  if (!ORPHAN_MOVE.test(line)) return false;
  const token = line.replace(/[!?+#]+$/g, "");
  if (!suffix) return line.length <= 6;
  return token === suffix || suffix.endsWith(token);
}

function cleanLine(line: string, suffix: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || DIAGRAM.test(trimmed)) return null;
  if (isOrphanLine(trimmed, suffix)) return null;
  return trimmed.replace(/^\(D\)\s*/g, "").trim() || null;
}

export function cleanCommentaryParagraphs(paragraphs: string[], san?: string): string[] {
  const suffix = moveSuffix(san);
  const cleaned: string[] = [];

  for (const paragraph of paragraphs) {
    const lines = paragraph.split("\n").map((l) => cleanLine(l, suffix)).filter(Boolean) as string[];
    if (lines.length === 0) continue;
    cleaned.push(lines.join(" "));
  }

  return cleaned;
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function endsIncompleteSentence(p: string): boolean {
  const s = p.trimEnd();
  if (!s) return false;
  if (/[.!?]["”']?\s*$/.test(s)) return false;
  return true;
}

function startsContinuation(p: string): boolean {
  const s = p.trimStart();
  if (/^\d+\.{2,3}/.test(s)) return false;
  if (/^["“']/.test(s)) return true;
  if (/^[a-z]/.test(s)) return true;
  if (/^(and|which|who|but|when|while|not|or|as|to|that|this|also|further|however|be|gives|piece)\b/i.test(s)) return true;
  if (/^[a-h]x[a-h][1-8]/i.test(s)) return true;
  if (/^[NBRQK]?[a-h][1-8][+#?!]*[\s,]/i.test(s)) return true;
  return false;
}

export function coalesceProseParagraphs(paragraphs: string[]): string[] {
  const out: string[] = [];

  for (const p of paragraphs) {
    const trimmed = collapseWhitespace(p);
    if (!trimmed) continue;

    const prev = out[out.length - 1];
    if (prev && endsIncompleteSentence(prev) && startsContinuation(trimmed)) {
      out[out.length - 1] = `${prev} ${trimmed}`;
    } else {
      out.push(trimmed);
    }
  }

  return out;
}

function prepareParagraphs(raw: string, san?: string): string[] {
  const paragraphs = raw.split("\n\n").filter(Boolean);
  const cleaned = cleanCommentaryParagraphs(paragraphs, san);
  return coalesceProseParagraphs(
    mergeVariationContinuations(mergeAltQuoteContinuations(mergeOrphanMoveNumbers(cleaned))),
  );
}

export function splitPreludeParagraphs(paragraphs: string[]): { main: string[]; prelude: string[] } {
  const idx = paragraphs.findIndex((p) => PRELUDE_START.test(p) || ALT_MOVE_LINE.test(p));
  if (idx <= 0) return { main: paragraphs, prelude: [] };
  return { main: paragraphs.slice(0, idx), prelude: paragraphs.slice(idx) };
}

function inferTone(quote: string): AlternativeTone {
  const q = quote.toLowerCase().trim();
  if (/^(terrible|bad|poor|inferior|weak|feeble|not good|worst)/.test(q)) return "bad";
  if (/^(not too bad|passable|reasonable|solid|good alternative)/.test(q)) return "ok";
  if (/^(best|excellent|eureka|strongest|very good|must be best|interesting alternative)/.test(q)) return "best";
  return "neutral";
}

function extractVerdict(quote: string): { verdict?: string; body: string } {
  const trimmed = quote.replace(/^[“"]|[”"]$/g, "").trim();
  const m = trimmed.match(/^([^,!?.]{3,28})(?:[,!.]\s*|\s+)(.+)$/s);
  if (m && /^(inferior|poor|not too bad|terrible|bad|eureka|excellent|interesting)/i.test(m[1])) {
    return { verdict: m[1].replace(/[.!]+$/, ""), body: m[2].trim() };
  }
  return { body: trimmed };
}

function movesMatch(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/[+#!?]+$/, "").replace(/^[NBRQK]/, "").toLowerCase();
  return norm(a) === norm(b);
}

function makeAlternative(num: string, move: string, quote: string): AlternativeMove {
  const label = `${num.replace(/\s/g, "")}${move}`;
  const normalizedQuote = collapseWhitespace(quote);
  const { verdict, body } = extractVerdict(normalizedQuote);
  return { label, move, quote: body, verdict, tone: inferTone(normalizedQuote), isPlayed: false };
}

function parseAlternativeParagraph(p: string): AlternativeMove | null {
  const merged = p.match(/^(\d+\.{2,3})\s*([NBRQK]?[a-h]?x?[a-h][1-8](?:=[NBRQK])?[+#?!]*|O-O-O|O-O):\s*(.+)$/s);
  if (merged) return makeAlternative(merged[1], merged[2], merged[3]);

  const mergedPeriod = p.match(/^(\d+\.{2,3})\s*([NBRQK]?[a-h]?x?[a-h][1-8](?:=[NBRQK])?[+#?!]*|O-O-O|O-O)\.\s*(.+)$/s);
  if (mergedPeriod) return makeAlternative(mergedPeriod[1], mergedPeriod[2], mergedPeriod[3]);

  const inline = p.match(/^(\d+\.{2,3}\s*[NBRQK]?[a-h]?x?[a-h][1-8](?:=[NBRQK])?[+#?!]*|O-O-O|O-O):\s*(.+)$/s);
  if (inline) {
    const label = inline[1].replace(/\s/g, "");
    const move = label.replace(/^\d+\.{2,3}/, "");
    return makeAlternative(label.match(/^(\d+\.{2,3})/)![1], move, inline[2]);
  }

  return null;
}

function isVariationFragment(p: string): boolean {
  const s = p.trim();
  if (MOVE_NUM_ONLY.test(s)) return true;
  if (WHITE_MOVE_NUM_ONLY.test(s)) return true;
  if (/^([a-h]x[a-h][1-8]|[NBRQK][a-h][1-8]|[a-h][1-8])\s+\d+\s*$/i.test(s)) return true;
  if (/^([a-h]x[a-h][1-8]|[NBRQK][a-h][1-8]|[a-h][1-8])$/i.test(s)) return true;
  if (/^([a-h]x[a-h][1-8]|[NBRQK][a-h][1-8]|[a-h][1-8])\s+\d+\s+\S/i.test(s) && s.length < 40) return true;
  return false;
}

function joinNotationFragments(left: string, right: string): string {
  const l = left.trimEnd();
  const r = right.trimStart();
  if (MOVE_NUM_ONLY.test(l)) return l.replace(/\s/g, "") + r;
  if (/\d+\.{2,3}\s*$/.test(l)) return l + r;
  if (/\b\d+\s*$/.test(l)) return `${l} ${r}`;
  if (/\d+\s*$/.test(l) && /^[a-hNBRQKxX1-8O]/i.test(r)) return `${l} ${r}`;
  return `${l} ${r}`;
}

function startsWithMoveToken(p: string): boolean {
  return /^[a-hNBRQKxX1-8O]/i.test(p.trim());
}

function endsWithPendingNotation(p: string): boolean {
  return MOVE_NUM_ONLY.test(p.trim()) || /\d+\.{2,3}\s*$/.test(p) || /\b\d+\s*$/.test(p);
}

export function mergeOrphanMoveNumbers(paragraphs: string[]): string[] {
  const out: string[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    let p = paragraphs[i];

    if (isVariationFragment(p)) {
      let combined = p;
      while (i + 1 < paragraphs.length && isVariationFragment(paragraphs[i + 1])) {
        combined = joinNotationFragments(combined, paragraphs[i + 1]);
        i += 1;
      }
      p = combined;
    }

    if (endsWithPendingNotation(p) && i + 1 < paragraphs.length && startsWithMoveToken(paragraphs[i + 1])) {
      let combined = joinNotationFragments(p, paragraphs[i + 1]);
      i += 1;
      while (i + 1 < paragraphs.length && endsWithPendingNotation(combined) && startsWithMoveToken(paragraphs[i + 1])) {
        combined = joinNotationFragments(combined, paragraphs[i + 1]);
        i += 1;
      }
      out.push(combined);
      continue;
    }

    if (MOVE_NUM_ONLY.test(p) && i + 1 < paragraphs.length) {
      const num = p.trim();
      const next = paragraphs[i + 1];
      const colon = next.match(/^([NBRQK]?[a-h]?x?[a-h][1-8](?:=[NBRQK])?[+#?!]*|O-O-O|O-O)\s*:\s*(.*)$/s);
      if (colon) {
        let quote = colon[2].trim();
        if (!quote && i + 2 < paragraphs.length) {
          quote = paragraphs[i + 2].trim();
          i += 2;
        } else {
          i += 1;
        }
        out.push(`${num}${colon[1]}: ${quote}`);
        continue;
      }

      const period = next.match(/^([NBRQK]?[a-h]?x?[a-h][1-8](?:=[NBRQK])?[+#?!]*|O-O-O|O-O)\.\s*(.+)$/s);
      if (period) {
        out.push(`${num}${period[1]}. ${period[2]}`);
        i += 1;
        continue;
      }

      const bare = next.match(/^([a-h]x[a-h][1-8]|[NBRQK][a-h][1-8]|[a-h][1-8])(.*)$/s);
      if (bare) {
        out.push(`${num}${bare[1]}${bare[2]}`);
        i += 1;
        continue;
      }
    }

    if (WHITE_MOVE_NUM_ONLY.test(p) && i + 1 < paragraphs.length && startsWithMoveToken(paragraphs[i + 1])) {
      let combined = joinNotationFragments(p, paragraphs[i + 1]);
      i += 1;
      while (i + 1 < paragraphs.length && endsWithPendingNotation(combined) && startsWithMoveToken(paragraphs[i + 1])) {
        combined = joinNotationFragments(combined, paragraphs[i + 1]);
        i += 1;
      }
      out.push(combined);
      continue;
    }

    out.push(p);
  }

  return out;
}

function mergeAltQuoteContinuations(paragraphs: string[]): string[] {
  const out: string[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    let p = paragraphs[i];

    const emptyColon = p.match(/^(\d+\.{2,3}\s*[NBRQK]?[a-h]?x?[a-h][1-8](?:=[NBRQK])?[+#?!]*|O-O-O|O-O)\s*:\s*$/);
    if (emptyColon && i + 1 < paragraphs.length) {
      p = `${emptyColon[1].replace(/\s/g, "")}: ${paragraphs[i + 1]}`;
      i += 1;
    }

    while (i + 1 < paragraphs.length) {
      const next = paragraphs[i + 1].trim();
      if (/^\d+\.{2,3}/.test(next) || PRELUDE_START.test(next)) break;
      if (/:\s*[“"]/.test(p) && !/[.!?"”]\s*$/.test(p) && /^[a-z"“]/.test(next)) {
        p = `${p} ${next}`;
        i += 1;
        continue;
      }
      break;
    }

    out.push(p);
  }

  return out;
}

function mergeVariationContinuations(paragraphs: string[]): string[] {
  const out: string[] = [];

  for (const p of paragraphs) {
    const prev = out[out.length - 1];
    if (
      prev &&
      /\d+\.{2,3}/.test(prev) &&
      /^[a-hNBRQK][a-h0-9x]/i.test(p.trim()) &&
      !/alternatives:/i.test(p)
    ) {
      out[out.length - 1] = joinNotationFragments(prev, p);
    } else {
      out.push(p);
    }
  }

  return out;
}

function parseInlineOrAlternatives(p: string): { intro?: string; alts: AlternativeMove[]; remainder?: string } | null {
  if (!/\bor\b/i.test(p) || !/\d+\.{2,3}/.test(p)) return null;

  const parts = p.split(/\s+or\s+/i);
  if (parts.length < 2) return null;

  const alts: AlternativeMove[] = [];
  let intro: string | undefined;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const match = part.match(/(\d+\.{2,3})\s*([NBRQK]?[a-h]?x?[a-h][1-8](?:=[NBRQK])?[+#?!]*|O-O-O|O-O)/);
    if (!match) continue;

    const trailing = part.slice((match.index ?? 0) + match[0].length).replace(/^[,.\s]+/, "").trim();
    const leading = part.slice(0, match.index).trim();

    if (i === 0 && leading) intro = leading;
    alts.push(makeAlternative(match[1], match[2], trailing || "One option considered here."));
  }

  if (alts.length < 2) return null;
  return { intro, alts };
}

function parseInlineGoodAlternative(p: string): { prose: string; alt: AlternativeMove } | null {
  const m = p.match(/^(\d+\.{2,3})\s*([NBRQK]?[a-h]?x?[a-h][1-8](?:=[NBRQK])?[+#?!]*|O-O-O|O-O)\s+is a good alternative\.?\s*(.*)$/is);
  if (!m) return null;
  return {
    prose: m[3]?.trim() ?? "",
    alt: makeAlternative(m[1], m[2], "A good alternative."),
  };
}

function parseNumberedReplyOptions(p: string): { intro?: string; alts: AlternativeMove[] } | null {
  if (!/^\d+\)/m.test(p) && !/\d+\)\s*\d/.test(p)) return null;
  if (!/alternatives|choice|replies|possibilities|method/i.test(p)) return null;

  const items = [...p.matchAll(/(\d+)\)\s*(\d+\.?\.?\.?\s*)?([NBRQK]?[a-h]?x?[a-h][1-8](?:=[NBRQK])?[+#?!]*|O-O-O|O-O|\d+\s+[NBRQK]?[a-h]?x?[a-h][1-8](?:=[NBRQK])?[+#?!]*)([^0-9]*?)(?=\d+\)|$)/gs)];
  if (items.length < 2) return null;

  const introEnd = items[0].index ?? 0;
  const intro = p.slice(0, introEnd).trim() || undefined;
  const alts = items.map((item) => {
    const moveNum = item[1];
    const moveRaw = (item[2] ?? "") + (item[3] ?? "");
    const quote = (item[4] ?? "").replace(/^[,.\s]+/, "").trim() || `Option ${moveNum}.`;
    const black = moveRaw.match(/(\d+\.{2,3})\s*([NBRQK]?[a-h]?x?[a-h][1-8](?:=[NBRQK])?[+#?!]*|O-O-O|O-O)/);
    if (black) return makeAlternative(black[1], black[2], quote);
    const white = moveRaw.match(/(\d+)\.?\s*([NBRQK]?[a-h]?x?[a-h][1-8](?:=[NBRQK])?[+#?!]*|O-O-O|O-O)/);
    if (white) return makeAlternative(`${white[1]}.`, white[2], quote);
    return makeAlternative("?", moveRaw.trim(), quote);
  });

  return { intro, alts };
}

export function dedupeAlternatives(alts: AlternativeMove[]): AlternativeMove[] {
  const map = new Map<string, AlternativeMove>();

  for (const alt of alts) {
    const key = alt.label.replace(/\s/g, "").toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...alt });
      continue;
    }

    const mergedQuote =
      existing.quote === alt.quote
        ? existing.quote
        : existing.quote.includes(alt.quote)
          ? existing.quote
          : alt.quote.includes(existing.quote)
            ? alt.quote
            : `${existing.quote} ${alt.quote}`;

    map.set(key, {
      ...existing,
      quote: mergedQuote,
      verdict: existing.verdict ?? alt.verdict,
      tone: toneRank(existing.tone) >= toneRank(alt.tone) ? existing.tone : alt.tone,
      isPlayed: existing.isPlayed || alt.isPlayed,
    });
  }

  return [...map.values()];
}

function toneRank(tone: AlternativeTone): number {
  switch (tone) {
    case "best":
      return 3;
    case "ok":
      return 2;
    case "bad":
      return 1;
    default:
      return 0;
  }
}

function tryExtractFromParagraph(p: string): {
  prose?: string;
  intro?: string;
  alts: AlternativeMove[];
  tail?: string;
} | null {
  const block = parseAlternativeParagraph(p);
  if (block) return { alts: [block] };

  const good = parseInlineGoodAlternative(p);
  if (good) return { prose: good.prose || undefined, alts: [good.alt] };

  const numbered = parseNumberedReplyOptions(p);
  if (numbered) return { intro: numbered.intro, alts: numbered.alts };

  const inline = parseInlineOrAlternatives(p);
  if (inline) {
    return {
      intro: inline.intro,
      alts: inline.alts,
      prose: inline.intro ? undefined : p.replace(INLINE_MOVE, "").trim() || undefined,
    };
  }

  return null;
}

export function extractAlternatives(
  paragraphs: string[],
  playedSan?: string,
): { prose: string[]; alternativesIntro?: string; alternatives: AlternativeMove[]; tail: string[] } {
  const prose: string[] = [];
  const alternatives: AlternativeMove[] = [];
  const tail: string[] = [];
  let alternativesIntro: string | undefined;
  let phase: "intro" | "alts" | "tail" = "intro";

  for (const p of paragraphs) {
    const extracted = tryExtractFromParagraph(p);

    if (extracted?.alts.length && (extracted.alts.length > 1 || extracted.intro || extracted.alts[0] !== null)) {
      const isBlockAlt = extracted.alts.length === 1 && parseAlternativeParagraph(p);

      if (isBlockAlt) {
        phase = "alts";
        alternatives.push(extracted.alts[0]);
        continue;
      }

      if (extracted.intro && phase === "intro") {
        alternativesIntro = extracted.intro;
      } else if (extracted.intro) {
        tail.push(extracted.intro);
      }

      if (extracted.prose && phase === "intro") prose.push(extracted.prose);
      else if (extracted.prose) tail.push(extracted.prose);

      phase = "alts";
      alternatives.push(...extracted.alts);
      continue;
    }

    if (/alternatives:/i.test(p)) {
      const intro = p.replace(/\s*Let us look at the alternatives:\s*$/i, "").trim();
      if (intro) prose.push(intro);
      alternativesIntro = "Let us look at the alternatives:";
      phase = "alts";
      continue;
    }

    if (PRELUDE_START.test(p) && phase === "intro") {
      alternativesIntro = p;
      phase = "alts";
      continue;
    }

    const chosen = p.match(/^(.*?(?:strongest developing move|best developing move|Eureka).*?)(\d+\.{2,3})\s*([NBRQK]?[a-h]?x?[a-h][1-8][+#?!]*|O-O-O|O-O)\.\s*(.+)$/is);
    if (chosen) {
      const [, lead, num, move, quote] = chosen;
      if (lead.trim()) tail.push(lead.trim());
      alternatives.push({ ...makeAlternative(num, move, quote), tone: "best", isPlayed: true });
      phase = "tail";
      continue;
    }

    if (phase === "alts" && alternatives.length > 0) {
      phase = "tail";
    }

    if (phase === "intro") prose.push(p);
    else if (phase === "alts" && alternatives.length === 0) {
      alternativesIntro = alternativesIntro ? `${alternativesIntro} ${p}` : p;
    } else tail.push(p);
  }

  const deduped = dedupeAlternatives(alternatives);

  if (playedSan) {
    for (const alt of deduped) {
      if (movesMatch(alt.move, playedSan)) alt.isPlayed = true;
    }
  }

  return { prose: coalesceProseParagraphs(prose), alternativesIntro, alternatives: deduped, tail: coalesceProseParagraphs(tail) };
}

export function normalizeCommentary(raw: string, san?: string): NormalizedCommentary {
  const hadDiagram = /(?:^|\n)\(D\)(?:\n|$)|(?:^|\n)D(?:\n|$)/m.test(raw);
  const prepared = prepareParagraphs(raw, san);
  const { main, prelude } = splitPreludeParagraphs(prepared);

  const mainBlock = extractAlternatives(main, san);
  const preludeBlock = extractAlternatives(prelude, san);

  return {
    main: coalesceProseParagraphs(mainBlock.prose),
    prelude: preludeBlock.prose,
    alternatives: dedupeAlternatives([...mainBlock.alternatives, ...preludeBlock.alternatives]),
    alternativesIntro: mainBlock.alternativesIntro ?? preludeBlock.alternativesIntro,
    tail: coalesceProseParagraphs([...mainBlock.tail, ...preludeBlock.tail]),
    hadDiagram,
  };
}

export function highlightChessNotation(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(SAN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, index) });
    }
    segments.push({ type: "san", value: match[0] });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}

export function formatAlternativeLine(text: string): { label?: string; quote: string } {
  const m = text.match(/^(\d+\.{2,3}\s*[^:]+):\s*[“"]?(.+)[”"]?$/s);
  if (m) return { label: m[1].trim(), quote: m[2].trim() };
  return { quote: text };
}
