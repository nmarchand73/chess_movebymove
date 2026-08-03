/** Text-presentation VS15 — keeps pieces as glyphs, not emoji, on iOS Safari. */
const TEXT = "\uFE0E";

const PIECE_SYMBOL: Record<string, string> = {
  K: `♔${TEXT}`,
  Q: `♕${TEXT}`,
  R: `♖${TEXT}`,
  B: `♗${TEXT}`,
  N: `♘${TEXT}`,
};

/** Display SAN with Unicode piece symbols (Nf3 → ♘f3). Pawn moves unchanged. */
export function formatSanWithSymbols(san: string): string {
  return san.replace(/([KQRBN])(?=[a-hxO])/g, (ch) => PIECE_SYMBOL[ch] ?? ch);
}
