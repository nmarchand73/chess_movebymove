import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";
import type { TacticsRevisionCurriculum } from "../types.ts";
import { buildTacticsRevisionBook, normalizeLessonIndex } from "./normalizeIndex.ts";
import { pointsForAttempt } from "./tacticsRevisionProgress.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const curriculum = JSON.parse(
  readFileSync(join(root, "data/tactics-revision.json"), "utf8"),
) as TacticsRevisionCurriculum;

describe("tactics-revision curriculum", () => {
  it("has hybrid modules and legal quiz moves", () => {
    assert.equal(curriculum.id, "tactics-revision");
    assert.ok(curriculum.modules.length >= 15);
    assert.ok(curriculum.exercises.length >= 48);
    assert.ok(curriculum.sections.length >= 4);
    for (const ex of curriculum.exercises) {
      assert.ok(ex.fen.includes("/"));
      assert.ok(ex.expectedSan);
      assert.ok(ex.expectedUci);
      assert.equal("prompt" in ex, false);
      const board = new Chess(ex.fen);
      assert.ok(board.move(ex.expectedSan));
    }
    for (const mod of curriculum.modules) {
      assert.ok(mod.sources.some((s) => s.book === "winning-chess" || s.book === "predator"));
      assert.ok(mod.examples.length >= 1);
      for (const example of mod.examples) {
        const board = new Chess(example.fen);
        for (const san of example.sans) {
          assert.ok(board.move(san), `${mod.id} ${example.id} ${san}`);
        }
      }
    }
  });

  it("appends the tactics-revision book in the library index", () => {
    const index = normalizeLessonIndex(
      {
        books: [{ id: "chernov", title: "Logical Chess", author: "Chernev", gameCount: 1 }],
        chernov: [{ id: "chernov-001", book: "chernov", gameNum: 1 }],
        nunn: [],
      },
      null,
      null,
      null,
      curriculum,
    );
    assert.equal(index.books.at(-1)?.id, "tactics-revision");
    assert.equal(index.books.at(-1)?.gameCount, curriculum.modules.length);
    assert.equal(buildTacticsRevisionBook(curriculum).sections.length, curriculum.sections.length);
    assert.equal(index["tactics-revision"].length, 0);
  });
});

describe("tacticsRevisionProgress scoring", () => {
  it("uses 3 / 2 / 1 / 0", () => {
    assert.equal(pointsForAttempt(0, false), 3);
    assert.equal(pointsForAttempt(1, false), 2);
    assert.equal(pointsForAttempt(2, false), 1);
    assert.equal(pointsForAttempt(0, true), 0);
  });
});
