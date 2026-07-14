import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Lesson } from "../types.ts";
import { ANALYSIS_PROMPT_INSTRUCTIONS, buildAnalysisPrompt, buildGamePgn } from "./analysisPrompt.ts";

const sampleLesson: Lesson = {
  id: "chernov-001",
  book: "chernov",
  gameNum: 1,
  title: "Game 1: von Scheve vs Teichmann",
  section: "The Kingside Attack",
  players: { white: "von Scheve", black: "Teichmann" },
  event: "Berlin 1907",
  opening: "Giuoco Piano",
  eco: "C53",
  result: "0-1",
  moveCount: 34,
  nodes: [
    { ply: 0, text: "Intro" },
    { ply: 1, san: "e4", text: "White opens" },
    { ply: 2, san: "e5", text: "Black replies" },
    { ply: 3, san: "Nf3", text: "Knight out" },
  ],
};

describe("buildGamePgn", () => {
  it("exports headers and moves up to the current ply", () => {
    const pgn = buildGamePgn(sampleLesson, 3);
    assert.match(pgn, /\[White "von Scheve"\]/);
    assert.match(pgn, /\[Black "Teichmann"\]/);
    assert.match(pgn, /\[ECO "C53"\]/);
    assert.match(pgn, /1\. e4 e5 2\. Nf3/);
    assert.match(pgn, /\[Result "\*"\]/);
  });

  it("uses the game result when the position is complete", () => {
    const completeLesson: Lesson = {
      ...sampleLesson,
      moveCount: 2,
      result: "1-0",
      nodes: [
        { ply: 0, text: "Intro" },
        { ply: 1, san: "e4", text: "White opens" },
        { ply: 2, san: "e5", text: "Black replies" },
      ],
    };
    const pgn = buildGamePgn(completeLesson, completeLesson.moveCount);
    assert.match(pgn, /\[Result "1-0"\]/);
  });
});

describe("buildAnalysisPrompt", () => {
  it("wraps the current game PGN with the French analysis instructions", () => {
    const prompt = buildAnalysisPrompt(sampleLesson, 2);
    assert.ok(prompt.startsWith(ANALYSIS_PROMPT_INSTRUCTIONS));
    assert.match(prompt, /Act as an International Master of chess\./);
    assert.match(prompt, /The answer must be in Français\./);
    assert.match(prompt, /The game is:/);
    assert.match(prompt, /1\. e4 e5/);
  });
});
