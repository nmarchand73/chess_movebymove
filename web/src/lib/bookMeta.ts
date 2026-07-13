import type { BookId } from "../types";

const COMMENTATORS: Record<BookId, string> = {
  chernov: "Chernev",
  nunn: "Nunn",
};

export function commentatorName(book: BookId | string): string {
  if (book in COMMENTATORS) {
    return COMMENTATORS[book as BookId];
  }
  return "the author";
}
