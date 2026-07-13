import type { BookId, BookMeta, LessonIndex, LessonSummary } from "../types";

const DEFAULT_BOOKS: Record<BookId, BookMeta> = {
  chernov: {
    id: "chernov",
    title: "Logical Chess: Move By Move",
    author: "Irving Chernev",
    publisher: "Batsford",
    gameCount: 33,
    sections: [
      { title: "The Kingside Attack", range: "1–16", blurb: "e4 openings and kingside attacks" },
      { title: "The Queen\u2019s Pawn Opening", range: "17–23", blurb: "d4 structures and queenside play" },
      {
        title: "The Chess Master Explains his Ideas",
        range: "24–33",
        blurb: "masterclass commentary",
      },
    ],
  },
  nunn: {
    id: "nunn",
    title: "Understanding Chess Move by Move",
    author: "John Nunn",
    publisher: "Gambit",
    gameCount: 30,
    sections: [
      { title: "Opening Themes", range: "1–5", blurb: "Development, king safety, and centre control" },
      { title: "Attacking Play", range: "6–11", blurb: "Sacrifices, reserves, and opposite-side castling" },
      { title: "Defensive Play", range: "12–15", blurb: "Defensive sacrifices and counter-attack" },
      { title: "Positional Play", range: "16–27", blurb: "Structure, space, outposts, and piece play" },
      { title: "Endgame Themes", range: "28–30", blurb: "Active king, passed pawns, rook on the seventh" },
    ],
  },
};

function lessonsForBook(raw: Record<string, unknown>, bookId: BookId): LessonSummary[] {
  const lessons = raw[bookId];
  return Array.isArray(lessons) ? (lessons as LessonSummary[]) : [];
}

export function normalizeLessonIndex(raw: Record<string, unknown>): LessonIndex {
  const chernov = lessonsForBook(raw, "chernov");
  const nunn = lessonsForBook(raw, "nunn");

  let books = Array.isArray(raw.books) ? (raw.books as BookMeta[]) : [];
  if (books.length === 0) {
    books = [];
    if (chernov.length > 0) {
      books.push({ ...DEFAULT_BOOKS.chernov, gameCount: chernov.length });
    }
    if (nunn.length > 0) {
      books.push({ ...DEFAULT_BOOKS.nunn, gameCount: nunn.length });
    }
  } else {
    books = books.map((book) => {
      const lessons = lessonsForBook(raw, book.id as BookId);
      return lessons.length > 0 ? { ...book, gameCount: lessons.length } : book;
    });
  }

  return { books, chernov, nunn };
}
