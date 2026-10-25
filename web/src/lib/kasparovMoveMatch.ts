/**
 * Move checker for Kasparov Chess study positions.
 * Accepts English SAN, French piece letters, UCI, with or without move numbers.
 */

const PREFIX = /^\s*\d+\s*(?:(?:\.\.\.|\.|…)\s*(?:[—–-]\s*)?|\s(?:[—–-]\s*)?|[—–]\s*)/;

export type KasparovLegalEntry = [uci: string, san: string, fr: string];

export type KasparovCheckResult =
  | { status: "correct"; uci: string; san: string; fr: string }
  | { status: "wrong"; uci?: string; san?: string; fr?: string; ambiguous?: boolean }
  | { status: "unknown" };

export function normalizeKasparovMove(raw: string): string {
  let s = String(raw || "").trim();
  s = s.replace(/\s*e\.?\s?p\.?\s*$/i, "");
  s = s.replace(/[!?+#‼⁇]+\s*$/g, "").trim();
  s = s.replace(PREFIX, "").trim();
  if (/^[0Oo]\s*[-–—]?\s*[0Oo](\s*[-–—]?\s*[0Oo])?$/.test(s)) {
    return s.replace(/[^0Oo]/g, "").length === 3 ? "O-O-O" : "O-O";
  }
  return s.replace(/[\s×x:\-–—=+#!?()]/g, "");
}

function keysFor(entry: KasparovLegalEntry): string[] {
  const out = new Set<string>();
  out.add(normalizeKasparovMove(entry[0]).toLowerCase());
  out.add(normalizeKasparovMove(entry[1]));
  out.add(normalizeKasparovMove(entry[2]));
  return [...out];
}

export function checkKasparovMove(
  input: string,
  legal: KasparovLegalEntry[],
  expectedUci: string,
): KasparovCheckResult {
  const n = normalizeKasparovMove(input);
  if (!n) return { status: "unknown" };

  const exact: KasparovLegalEntry[] = [];
  const loose: KasparovLegalEntry[] = [];
  for (const entry of legal) {
    const ks = keysFor(entry);
    if (ks.includes(n)) exact.push(entry);
    else if (ks.some((k) => k.toLowerCase() === n.toLowerCase())) loose.push(entry);
  }
  const cands = exact.length ? exact : loose;
  if (!cands.length) return { status: "unknown" };

  const hit = cands.filter((e) => e[0] === expectedUci);
  if (hit.length) {
    return { status: "correct", uci: hit[0]![0], san: hit[0]![1], fr: hit[0]![2] };
  }

  const uniq = new Map<string, KasparovLegalEntry>();
  for (const e of cands) uniq.set(e[0], e);
  if (uniq.size === 1) {
    const only = [...uniq.values()][0]!;
    return { status: "wrong", uci: only[0], san: only[1], fr: only[2] };
  }
  return {
    status: "wrong",
    ambiguous: true,
    san: cands.map((e) => e[1]).join(" / "),
  };
}
