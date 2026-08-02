import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Chess } from "chess.js";
import { legalMoveMatchingPlacement } from "./physicalGuess.ts";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR";
const AFTER_D4 = "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR";
const LIFTED_E2 = "rnbqkbnr/pppppppp/8/8/8/8/PPPP1PPP/RNBQKBNR";

describe("legalMoveMatchingPlacement", () => {
  it("returns e4 when the board matches that move from the start", () => {
    const fen = new Chess().fen();
    const result = legalMoveMatchingPlacement(fen, AFTER_E4);
    assert.deepEqual(result, { san: "e4", from: "e2", to: "e4" });
  });

  it("returns a different legal move when that placement is on the board", () => {
    const fen = new Chess().fen();
    const result = legalMoveMatchingPlacement(fen, AFTER_D4);
    assert.deepEqual(result, { san: "d4", from: "d2", to: "d4" });
  });

  it("returns null for an incomplete lift", () => {
    const fen = new Chess().fen();
    assert.equal(legalMoveMatchingPlacement(fen, LIFTED_E2), null);
  });

  it("returns null when the board still matches the current position", () => {
    const fen = new Chess().fen();
    assert.equal(legalMoveMatchingPlacement(fen, START), null);
  });
});
