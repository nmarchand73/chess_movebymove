const PIECE_SYMBOL: Record<string, string> = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
};

/** Display SAN with Unicode piece symbols (Nf3 → ♘f3). Pawn moves unchanged. */
export function formatSanWithSymbols(san: string): string {
  return san.replace(/([KQRBN])(?=[a-hxO])/g, (ch) => PIECE_SYMBOL[ch] ?? ch);
}
