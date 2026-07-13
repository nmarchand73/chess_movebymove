import type { BookId } from "../types";

export type BookDetails = {
  published: string;
  tagline: string;
  description: string;
  audience: string;
  highlights: string[];
  famousFor?: string;
};

export const BOOK_DETAILS: Record<BookId, BookDetails> = {
  chernov: {
    published: "1957 · Batsford (algebraic ed.)",
    tagline: "The classic that explains every move of every game.",
    description:
      "Irving Chernev walks through 33 complete games from the late 1800s to the 1950s in plain, witty prose. "
      + "He explains why each move was played — development, king safety, pawn structure, and when to attack — "
      + "so you absorb fundamentals by reading rather than memorizing theory.",
    audience: "Beginners to ~1400 · first full games",
    highlights: [
      "Every single move commented — a format Chernev virtually invented for learners",
      "16 kingside attacking games (mostly 1.e4), then queen\u2019s-pawn structures, then masterclass finales",
      "Famous names: Capablanca, Alekhine, Tarrasch, Rubinstein, and Chernev himself",
      "Timeless advice on piece activity; openings are dated but ideas are not",
    ],
    famousFor:
      "Leonard Barden: \u201cThe novice who plays through Logical Chess can learn an ocean of basic chess wisdom.\u201d",
  },
  nunn: {
    published: "2001 · Gambit Publications",
    tagline: "A modern grandmaster updates the move-by-move idea for today\u2019s chess.",
    description:
      "Grandmaster John Nunn annotates 30 games from the 1990s — Kasparov, Kramnik, Shirov, Polgar, and others — "
      + "with the same move-by-move clarity as Chernev, but focused on how strong players think now. "
      + "Jargon is kept to a minimum; principles come first, deep variations only when they matter.",
    audience: "Club players ~1200–2000 · after basic tactics",
    highlights: [
      "Grouped by theme: opening ideas, middlegame (attack, defence, positional), then endgames",
      "Modern structures: Gr\u00fcnfeld, Nimzo-Indian, Sicilian systems, Catalan, and more",
      "Written by an Olympiad gold medallist and three-time BCF Book of the Year winner",
      "Often recommended as the \u201cgrown-up\u201d companion to Chernev\u2019s classic",
    ],
    famousFor:
      "Gambit: \u201cA top-class grandmaster explains step-by-step how chess games are won.\u201d",
  },
};

export function getBookDetails(bookId: BookId | string): BookDetails | undefined {
  if (bookId in BOOK_DETAILS) {
    return BOOK_DETAILS[bookId as BookId];
  }
  return undefined;
}
