import type {
  BookId,
  BookMeta,
  IntentionsCurriculum,
  IntentionsOpening,
  LessonIndex,
  LessonSummary,
} from "../types";

const DEFAULT_BOOKS: Record<"chernov" | "nunn", BookMeta> = {
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

function lessonsForBook(raw: Record<string, unknown>, bookId: "chernov" | "nunn"): LessonSummary[] {
  const lessons = raw[bookId];
  return Array.isArray(lessons) ? (lessons as LessonSummary[]) : [];
}

function sourceLessonMap(chernov: LessonSummary[], nunn: LessonSummary[]): Map<string, LessonSummary> {
  const map = new Map<string, LessonSummary>();
  for (const lesson of chernov) map.set(lesson.id, lesson);
  for (const lesson of nunn) map.set(lesson.id, lesson);
  return map;
}

function normalizeOpeningKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const OPENING_SYNONYMS: Record<string, string[]> = {
  "partie espagnole": ["ruy lopez", "spanish"],
  "partie italienne": ["giuoco piano", "italian", "giuoco"],
  "gambit du roi": ["king s gambit", "kings gambit"],
  "sicilienne dragon": ["dragon"],
  "gambit benko": ["benko", "volga"],
  "defense grunfeld": ["grunfeld"],
  "defense scandinave": ["scandinavian", "center counter"],
  "defense nimzo indienne": ["nimzo indian", "nimzo"],
  "defense indienne de la dame": ["queen s indian", "queens indian"],
  "partie catalane": ["catalan"],
  "defense caro kann": ["caro kann"],
  "defense caro kann classique": ["caro kann"],
  "defense francaise": ["french"],
  "defense pirc": ["pirc"],
  "defense slave": ["slav", "semi slav"],
  "defense sicilienne": ["sicilian"],
  "sicilienne scheveningen": ["scheveningen"],
  "sicilienne najdorf": ["najdorf"],
  "defense alekhine": ["alekhine"],
  "defense moderne": ["modern defence", "modern defense", "austrian attack"],
  "partie anglaise": ["english"],
  "defense anglaise 1 c4 e5": ["english"],
  "systeme colle": ["colle"],
  "systeme reti": ["reti"],
  "systeme de londres": ["london"],
  "ouverture du centre": ["center game", "centre game", "scotch"],
  "debut bird": ["bird"],
  "defense hollandaise": ["dutch"],
  "gambit evans": ["evans"],
  "ouverture orang outan": ["orangutan", "sokolsky", "polish"],
  "variante d echange de la francaise": ["french exchange", "exchange variation french"],
  "caro kann": ["caro kann"],
};

function openingAliasKeys(name: string): string[] {
  const key = normalizeOpeningKey(name);
  return [key, ...(OPENING_SYNONYMS[key] ?? [])];
}

const GENERIC_OPENING_TOKENS = new Set([
  "gambit",
  "defense",
  "defence",
  "partie",
  "systeme",
  "system",
  "ouverture",
  "opening",
  "variante",
  "variation",
  "debut",
  "classique",
]);

function significantTokens(value: string): string[] {
  return value.split(" ").filter((t) => t.length > 3 && !GENERIC_OPENING_TOKENS.has(t));
}

/** Match a lesson opening against the intention→opening table. */
export function matchIntentionOpening(
  lessonOpening: string | undefined,
  openings: IntentionsOpening[] | undefined,
): IntentionsOpening | undefined {
  if (!lessonOpening || !openings?.length) return undefined;
  const hay = normalizeOpeningKey(lessonOpening);
  const hayTokens = new Set(significantTokens(hay));
  let best: IntentionsOpening | undefined;
  let bestScore = 0;
  for (const opening of openings) {
    const aliases = openingAliasKeys(opening.name);
    for (const needle of aliases) {
      if (!needle) continue;
      if (hay === needle) return opening;
      if (hay.includes(needle) || (needle.length > 6 && needle.includes(hay))) {
        const score = Math.min(hay.length, needle.length) + 5;
        if (score > bestScore) {
          best = opening;
          bestScore = score;
        }
        continue;
      }
      const needleTokens = significantTokens(needle);
      if (needleTokens.length === 0) continue;
      const overlap = needleTokens.filter(
        (t) => hayTokens.has(t) || [...hayTokens].some((h) => h.includes(t) || t.includes(h)),
      );
      const needed = Math.min(2, needleTokens.length);
      if (overlap.length >= needed) {
        const score = overlap.join("").length;
        if (score > bestScore) {
          best = opening;
          bestScore = score;
        }
      }
    }
  }
  return best;
}

export function buildIntentionsBook(
  curriculum: IntentionsCurriculum,
  sources: Map<string, LessonSummary>,
): { book: BookMeta; lessons: LessonSummary[] } {
  const lessons: LessonSummary[] = [];
  const sections: BookMeta["sections"] = [];

  for (const section of curriculum.sections) {
    const start = lessons.length + 1;
    for (const gameId of section.gameIds) {
      const source = sources.get(gameId);
      if (!source) continue;
      const entry = curriculum.entries[gameId];
      const sourceBook = source.book === "nunn" ? "nunn" as const : "chernov" as const;
      const matched = matchIntentionOpening(source.opening, section.openings);
      lessons.push({
        ...source,
        book: "intentions",
        gameNum: lessons.length + 1,
        section: section.title,
        sourceBook,
        sourceLessonId: source.id,
        why: entry?.why,
        intentionId: section.id,
        openingName: matched?.name,
        openingIdea: matched?.idea,
        file: source.file ?? `${source.id}.json`,
      });
    }
    const end = lessons.length;
    if (end >= start) {
      sections.push({
        title: section.title,
        range: start === end ? `${start}` : `${start}–${end}`,
        blurb: section.blurb,
        openings: section.openings,
      });
    }
  }

  return {
    book: {
      id: "intentions",
      title: curriculum.title,
      author: curriculum.author,
      publisher: curriculum.publisher,
      gameCount: lessons.length,
      sections,
    },
    lessons,
  };
}

export function normalizeLessonIndex(
  raw: Record<string, unknown>,
  curriculum?: IntentionsCurriculum | null,
): LessonIndex {
  const chernov = lessonsForBook(raw, "chernov");
  const nunn = lessonsForBook(raw, "nunn");

  let books = Array.isArray(raw.books) ? (raw.books as BookMeta[]) : [];
  books = books.filter((book) => book.id === "chernov" || book.id === "nunn");

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
      if (book.id !== "chernov" && book.id !== "nunn") return book;
      const lessons = lessonsForBook(raw, book.id);
      return lessons.length > 0 ? { ...book, gameCount: lessons.length } : book;
    });
  }

  let intentions: LessonSummary[] = [];
  if (curriculum?.sections?.length) {
    const built = buildIntentionsBook(curriculum, sourceLessonMap(chernov, nunn));
    intentions = built.lessons;
    books = [...books, built.book];
  }

  return { books, chernov, nunn, intentions };
}

export function isSourceBookId(bookId: BookId | string): bookId is "chernov" | "nunn" {
  return bookId === "chernov" || bookId === "nunn";
}
