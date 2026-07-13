import type { AlternativeMove, NormalizedCommentary } from "./commentary.ts";

export type CommentaryBeat =
  | { kind: "prose"; text: string }
  | { kind: "alternatives"; intro?: string; alternatives: AlternativeMove[] }
  | { kind: "principle"; text: string };

const QUOTE_RE = /[“"]([^“”"]{12,140})[”"]/g;
const PRINCIPLE_LINE =
  /^(?:[A-Z][^.!?]{10,}[.!]|(?:Sortez|Develop|Castle|Remember|Open lines|Place each|Move each).{8,}[.!])$/;

export function extractTakeaway(normalized: NormalizedCommentary): string | null {
  const first = normalized.main[0]?.trim();
  if (!first) return null;
  const sentence = first.match(/^[^.!?]+[.!?]/)?.[0]?.trim() ?? first;
  if (sentence.length > 140) return `${sentence.slice(0, 137)}…`;
  return sentence;
}

export function extractPrinciples(paragraphs: string[]): string[] {
  const found = new Set<string>();

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (PRINCIPLE_LINE.test(trimmed)) {
      found.add(trimmed);
    }
    for (const match of paragraph.matchAll(QUOTE_RE)) {
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

  for (const text of normalized.main) {
    beats.push({ kind: "prose", text });
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
