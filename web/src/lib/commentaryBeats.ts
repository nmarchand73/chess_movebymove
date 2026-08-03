import type { AlternativeMove, NormalizedCommentary } from "./commentary.ts";

export type CommentaryBeat =
  | { kind: "heading"; text: string }
  | { kind: "prose"; text: string }
  | { kind: "alternatives"; intro?: string; alternatives: AlternativeMove[] }
  | { kind: "principle"; text: string };

const QUOTE_RE = /[“"]([^“”"]{12,140})[”"]/g;
const PRINCIPLE_LINE =
  /^(?:[A-Z][^.!?]{10,}[.!]|(?:Sortez|Develop|Castle|Remember|Open lines|Place each|Move each).{8,}[.!])$/;

export function isSectionTitle(text: string): boolean {
  const headline = text.trim().split(/\n+/)[0]?.trim() ?? "";
  if (!headline || headline.length > 72) return false;
  if (headline.endsWith("!") && !headline.slice(0, -1).includes(".") && headline.length <= 56) {
    return true;
  }
  if (
    headline.length <= 40 &&
    text.trim().includes("\n\n") &&
    headline.split(/\s+/).length <= 8 &&
    !headline.endsWith(".")
  ) {
    return true;
  }
  return false;
}

export function splitSectionTitle(text: string): { title: string | null; body: string } {
  const trimmed = text.trim();
  if (!isSectionTitle(trimmed)) return { title: null, body: trimmed };
  const newline = trimmed.indexOf("\n");
  const title = (newline === -1 ? trimmed : trimmed.slice(0, newline)).trim();
  const body = (newline === -1 ? "" : trimmed.slice(newline + 1)).trim();
  return { title, body };
}

function firstSentence(text: string): string | null {
  const sentence = text.match(/^[^.!?]+[.!?]/)?.[0]?.trim();
  if (sentence) return sentence;
  const line = text.split("\n")[0]?.trim();
  return line || null;
}

export function extractTakeaway(normalized: NormalizedCommentary): string | null {
  const first = normalized.main[0]?.trim();
  if (!first) return null;

  let source: string;
  if (isSectionTitle(first)) {
    const { body } = splitSectionTitle(first);
    source = body.trim() || normalized.main[1]?.trim() || "";
  } else {
    const { title, body } = splitSectionTitle(first);
    source = title ? body : first;
  }

  if (!source) return null;

  const sentence = firstSentence(source);
  if (!sentence || sentence.length < 12) return null;
  if (isSectionTitle(sentence)) return null;
  if (sentence.length > 140) return `${sentence.slice(0, 137)}…`;
  return sentence;
}

function normalizeSentenceKey(text: string): string {
  return text
    .trim()
    .replace(/…$/u, "")
    .replace(/[.!?]+$/u, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Remove a leading sentence from prose when it already appears as the takeaway. */
export function stripLeadingTakeaway(text: string, takeaway: string): string {
  const key = normalizeSentenceKey(takeaway);
  if (!key) return text;

  const trimmed = text.trim();
  if (!trimmed) return text;

  if (normalizeSentenceKey(trimmed) === key) return "";

  const leading = firstSentence(trimmed);
  if (leading && normalizeSentenceKey(leading) === key) {
    return trimmed.slice(leading.length).trim();
  }

  // Truncated takeaways ("…") — strip the matching prefix sentence if present.
  if (takeaway.trim().endsWith("…") && normalizeSentenceKey(trimmed).startsWith(key)) {
    const leadingPrefix = firstSentence(trimmed);
    if (leadingPrefix) return trimmed.slice(leadingPrefix.length).trim();
  }

  return text;
}

/** Drop the takeaway sentence from the first prose/principle beat so UI never repeats it. */
export function beatsWithoutTakeawayDuplicate(
  beats: CommentaryBeat[],
  takeaway: string | null | undefined,
): CommentaryBeat[] {
  if (!takeaway?.trim()) return beats;

  let stripped = false;
  const out: CommentaryBeat[] = [];

  for (const beat of beats) {
    if (stripped || (beat.kind !== "prose" && beat.kind !== "principle")) {
      out.push(beat);
      continue;
    }

    stripped = true;
    const nextText = stripLeadingTakeaway(beat.text, takeaway);
    if (!nextText.trim()) continue;
    out.push(nextText === beat.text ? beat : { ...beat, text: nextText });
  }

  return out;
}

export function extractPrinciples(paragraphs: string[]): string[] {
  const found = new Set<string>();

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (isSectionTitle(trimmed)) continue;

    const { title, body } = splitSectionTitle(trimmed);
    const prose = title ? body : trimmed;
    if (!prose) continue;

    if (PRINCIPLE_LINE.test(prose)) {
      found.add(prose);
    }
    for (const match of prose.matchAll(QUOTE_RE)) {
      const quote = match[1].trim();
      if (
        quote.length >= 12 &&
        quote.length <= 100 &&
        /^(Sortez|Develop|Castle|Remember|Open |Place |Move |You should|Always |The chief|In the opening)/i.test(quote)
      ) {
        found.add(quote);
      }
    }
  }

  return [...found].slice(0, 2);
}

export function buildCommentaryBeats(normalized: NormalizedCommentary): CommentaryBeat[] {
  const beats: CommentaryBeat[] = [];

  for (let i = 0; i < normalized.main.length; i++) {
    let text = normalized.main[i];
    if (i === 0) {
      const { title, body } = splitSectionTitle(text);
      if (title) {
        beats.push({ kind: "heading", text: title });
        text = body;
      }
    }
    if (text.trim()) beats.push({ kind: "prose", text });
  }

  if (normalized.alternatives.length > 0) {
    beats.push({
      kind: "alternatives",
      intro: normalized.alternativesIntro,
      alternatives: normalized.alternatives,
    });
  }

  for (const text of normalized.tail) {
    beats.push({ kind: "prose", text });
  }

  return beats;
}

export function beatsNeedStepping(beats: CommentaryBeat[]): boolean {
  return beats.length > 1;
}
