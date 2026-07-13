import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeLessonIndex } from "./normalizeIndex.ts";

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
  });
});
