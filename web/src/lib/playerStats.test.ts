import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aggregatePlayerElos,
  formatGameElos,
  formatPlayerWithElo,
  gamesWithPerformanceElo,
} from "./playerStats.ts";
import type { LessonSummary } from "../types.ts";

const sampleLessons: LessonSummary[] = [
  {
    id: "a",
    book: "chernov",
    gameNum: 1,
    title: "Game 1",
    section: "S",
    players: { white: "Alice", black: "Bob" },
    moveCount: 30,
    file: "a.json",
    performanceElo: { white: 1800, black: 2200, whiteAcpl: 50, blackAcpl: 20 },
  },
  {
    id: "b",
    book: "chernov",
    gameNum: 2,
    title: "Game 2",
    section: "S",
    players: { white: "Bob", black: "Carol" },
    moveCount: 28,
    file: "b.json",
    performanceElo: { white: 2100, black: 1900 },
  },
];

test("aggregatePlayerElos averages per player across games", () => {
  const stats = aggregatePlayerElos(sampleLessons);
  const bob = stats.find((entry) => entry.name === "Bob");
  assert.ok(bob);
  assert.equal(bob.games, 2);
  assert.equal(bob.avgElo, 2150);
  assert.equal(bob.asWhite, 1);
  assert.equal(bob.asBlack, 1);
});

test("formatPlayerWithElo and formatGameElos", () => {
  assert.equal(formatPlayerWithElo("Alice", 1800), "Alice (~1800)");
  assert.equal(formatPlayerWithElo("Alice", undefined), "Alice");
  assert.equal(formatGameElos({ white: 1800, black: 2200 }), "1800 · 2200");
  assert.equal(formatGameElos(undefined), null);
});

test("gamesWithPerformanceElo counts entries with ratings", () => {
  assert.equal(gamesWithPerformanceElo(sampleLessons), 2);
  assert.equal(gamesWithPerformanceElo([sampleLessons[0]!, { ...sampleLessons[1]!, performanceElo: undefined }]), 1);
});
