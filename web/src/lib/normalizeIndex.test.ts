import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { IntentionsCurriculum, LessonSummary, OpeningsRevisionCurriculum } from "../types.ts";
import {
  buildIntentionsBook,
  buildOpeningsRevisionBook,
  matchIntentionOpening,
  normalizeLessonIndex,
} from "./normalizeIndex.ts";

const sampleSource = (
  id: string,
  book: "chernov" | "nunn",
  gameNum: number,
  opening?: string,
): LessonSummary => ({
  id,
  book,
  gameNum,
  title: `Game ${gameNum}`,
  section: "Original section",
  players: { white: "White", black: "Black" },
  opening,
  moveCount: 20,
  file: `${id}.json`,
});

describe("normalizeLessonIndex", () => {
  it("passes through a modern index with books", () => {
    const raw = {
      books: [{ id: "chernov", title: "Logical Chess", author: "Chernev", gameCount: 1 }],
      chernov: [{ id: "chernov-001", book: "chernov", gameNum: 1 }],
      nunn: [],
    };
    const index = normalizeLessonIndex(raw);
    assert.equal(index.books.length, 1);
    assert.equal(index.chernov.length, 1);
    assert.equal(index.intentions.length, 0);
    assert.equal(index["openings-revision"].length, 0);
  });

  it("builds books from legacy chernov-only index", () => {
    const raw = {
      chernov: [{ id: "chernov-001", book: "chernov", gameNum: 1 }],
    };
    const index = normalizeLessonIndex(raw);
    assert.equal(index.books.length, 1);
    assert.equal(index.books[0]?.id, "chernov");
    assert.equal(index.books[0]?.gameCount, 1);
    assert.equal(index.nunn.length, 0);
    assert.equal(index.intentions.length, 0);
  });

  it("appends the intentions book when a curriculum is provided", () => {
    const raw = {
      books: [
        { id: "chernov", title: "Logical Chess", author: "Chernev", gameCount: 1 },
        { id: "nunn", title: "Understanding Chess", author: "Nunn", gameCount: 1 },
      ],
      chernov: [sampleSource("chernov-001", "chernov", 1, "Giuoco Piano")],
      nunn: [sampleSource("nunn-007", "nunn", 7, "Ruy Lopez, Flohr-Zaitsev Variation")],
    };
    const curriculum: IntentionsCurriculum = {
      id: "intentions",
      title: "Initiation par intentions de jeu",
      author: "Curriculum Move-by-Move",
      sections: [
        {
          id: "aile-roi",
          title: "Offensive sur l'aile Roi",
          blurb: "Attack the king",
          openings: [
            { name: "Sicilienne Dragon", idea: "Attaque sur l'aile Roi." },
            { name: "Partie Espagnole", idea: "Contrôle durable du centre." },
          ],
          gameIds: ["chernov-001", "nunn-007"],
        },
      ],
      entries: {
        "chernov-001": { primary: "aile-roi", why: "Classic kingside model." },
        "nunn-007": { primary: "aile-roi", why: "Modern attacking lesson." },
      },
    };
    const index = normalizeLessonIndex(raw, curriculum);
    assert.equal(index.books.length, 3);
    assert.equal(index.books[2]?.id, "intentions");
    assert.equal(index.intentions.length, 2);
    assert.equal(index.intentions[0]?.id, "chernov-001");
    assert.equal(index.intentions[0]?.book, "intentions");
    assert.equal(index.intentions[0]?.sourceBook, "chernov");
    assert.equal(index.intentions[0]?.why, "Classic kingside model.");
    assert.equal(index.intentions[0]?.section, "Offensive sur l'aile Roi");
    assert.equal(index.intentions[0]?.file, "chernov-001.json");
    assert.equal(index.intentions[1]?.openingName, "Partie Espagnole");
    assert.equal(index.books[2]?.sections?.[0]?.openings?.length, 2);
  });

  it("appends the openings-revision book when curriculum is provided", () => {
    const raw = {
      books: [{ id: "chernov", title: "Logical Chess", author: "Chernev", gameCount: 1 }],
      chernov: [sampleSource("chernov-001", "chernov", 1)],
      nunn: [],
    };
    const openings: OpeningsRevisionCurriculum = {
      id: "openings-revision",
      title: { en: "Opening Revision", fr: "Révision" },
      author: { en: "Curriculum", fr: "Parcours" },
      principles: [],
      sections: [
        { id: "open-games", title: { en: "Open", fr: "Ouvertes" }, refs: [1] },
      ],
      modules: [
        {
          id: "giuoco-piano",
          bookRef: 1,
          names: { en: "Giuoco Piano", fr: "Giuoco Piano" },
          ecoPrefixes: ["C53"],
          plan: { en: "Develop", fr: "Développer" },
          themes: { en: ["f7"], fr: ["f7"] },
          exampleLine: { san: ["e4", "e5"], startFen: "start" },
          basePositions: [],
          gameIds: [],
        },
      ],
      batteries: { knowledge: [], skill: [] },
    };
    const index = normalizeLessonIndex(raw, null, openings);
    assert.equal(index.books.at(-1)?.id, "openings-revision");
    assert.equal(index.books.at(-1)?.gameCount, 1);
    assert.equal(buildOpeningsRevisionBook(openings).gameCount, 1);
  });
});

describe("buildIntentionsBook", () => {
  it("skips missing lesson ids and renumbers curriculum games", () => {
    const curriculum: IntentionsCurriculum = {
      id: "intentions",
      title: "Initiation",
      author: "Curriculum",
      sections: [
        {
          id: "centre",
          title: "Contrôle du centre",
          blurb: "Centre",
          gameIds: ["missing-id", "nunn-003"],
        },
      ],
      entries: {
        "nunn-003": { primary: "centre", why: "Centre control." },
      },
    };
    const sources = new Map<string, LessonSummary>([
      ["nunn-003", sampleSource("nunn-003", "nunn", 3)],
    ]);
    const { book, lessons } = buildIntentionsBook(curriculum, sources);
    assert.equal(lessons.length, 1);
    assert.equal(lessons[0]?.gameNum, 1);
    assert.equal(lessons[0]?.sourceLessonId, "nunn-003");
    assert.equal(book.gameCount, 1);
    assert.equal(book.sections?.[0]?.range, "1");
  });
});

describe("matchIntentionOpening", () => {
  it("matches English and French opening labels", () => {
    const openings = [
      { name: "Sicilienne Dragon", idea: "Attaque sur l'aile Roi." },
      { name: "Gambit Benko", idea: "Pression à l'aile Dame." },
    ];
    const dragon = matchIntentionOpening("Sicilian Defence, Dragon Variation", openings);
    assert.equal(dragon?.name, "Sicilienne Dragon");
    const benko = matchIntentionOpening("Benko Gambit", openings);
    assert.equal(benko?.name, "Gambit Benko");
  });
});
