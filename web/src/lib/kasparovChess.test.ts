import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { KasparovChessCurriculum } from "../types.ts";
import { buildKasparovChessBook, normalizeLessonIndex } from "./normalizeIndex.ts";
import { pointsForAttempt } from "./kasparovChessProgress.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const curriculum = JSON.parse(
  readFileSync(join(root, "data/kasparov-chess.json"), "utf8"),
) as KasparovChessCurriculum;

describe("kasparov-chess curriculum", () => {
  it("has 64 exercises across 8 games without book prose", () => {
    assert.equal(curriculum.id, "kasparov-chess");
    assert.equal(curriculum.exercises.length, 64);
    assert.equal(curriculum.games.length, 8);
    for (const ex of curriculum.exercises) {
      assert.ok(ex.fen.includes("/"));
      assert.ok(ex.expectedSan);
      assert.ok(ex.expectedUci);
      assert.equal("prompt" in ex, false);
      assert.equal("solution" in ex, false);
    }
  });

  it("appends the kasparov-chess book in the library index", () => {
    const index = normalizeLessonIndex(
      {
        books: [{ id: "chernov", title: "Logical Chess", author: "Chernev", gameCount: 1 }],
        chernov: [{ id: "chernov-001", book: "chernov", gameNum: 1 }],
        nunn: [],
      },
      null,
      null,
      curriculum,
    );
    assert.equal(index.books.at(-1)?.id, "kasparov-chess");
    assert.equal(index.books.at(-1)?.gameCount, 64);
    assert.equal(buildKasparovChessBook(curriculum).sections.length, 8);
    assert.equal(index["kasparov-chess"].length, 0);
  });
});

describe("kasparovChessProgress scoring", () => {
  it("uses 3 / 2 / 1 / 0", () => {
    assert.equal(pointsForAttempt(0, false), 3);
    assert.equal(pointsForAttempt(1, false), 2);
    assert.equal(pointsForAttempt(2, false), 1);
    assert.equal(pointsForAttempt(0, true), 0);
  });
});
