import type { BookId } from "../types";

const COMMENTATORS: Record<"chernov" | "nunn", string> = {
  chernov: "Chernev",
  nunn: "Nunn",
};

export function commentatorName(book: BookId | string, sourceBook?: string): string {
  const key = sourceBook === "chernov" || sourceBook === "nunn"
    ? sourceBook
    : book === "chernov" || book === "nunn"
      ? book
      : null;
  if (key) return COMMENTATORS[key];
  return "the author";
}

export function sourceBookLabel(sourceBook?: string): string | null {
  if (sourceBook === "chernov") return "Chernev";
  if (sourceBook === "nunn") return "Nunn";
  return null;
}
