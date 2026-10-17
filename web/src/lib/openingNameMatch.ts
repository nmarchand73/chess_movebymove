import type { LocalizedText } from "../types";

function normalizeOpeningGuess(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(defence|defense|opening|debut|partie|systeme|system|variante|variation)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function significantTokens(value: string): string[] {
  return value.split(" ").filter((t) => t.length > 2);
}

/** Strict-enough match for quiz answers: full name or all significant tokens. */
export function openingNameMatches(guess: string, answer: LocalizedText): boolean {
  const g = normalizeOpeningGuess(guess);
  if (g.length < 4) return false;
  for (const name of [answer.en, answer.fr]) {
    const n = normalizeOpeningGuess(name);
    if (!n) continue;
    if (g === n) return true;
    const nTokens = significantTokens(n);
    const gTokens = significantTokens(g);
    if (nTokens.length === 0) continue;
    if (nTokens.every((token) => gTokens.includes(token) || g.includes(token))) return true;
    if (nTokens.length === 1 && n.startsWith(g) && g.length >= Math.min(6, n.length)) return true;
  }
  return false;
}

export function moveSanMatches(guess: string, expected: string): boolean {
  const norm = (s: string) =>
    s
      .trim()
      .replace(/[+#?!]+$/g, "")
      .replace(/0-0-0/gi, "O-O-O")
      .replace(/0-0/gi, "O-O");
  return norm(guess).toLowerCase() === norm(expected).toLowerCase();
}
