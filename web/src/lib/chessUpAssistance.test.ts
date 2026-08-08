import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Chess } from "chess.js";
import { chessUpAssistanceClear, chessUpAssistanceForMove } from "./chessUpAssistance.ts";

describe("chessUpAssistanceForMove", () => {
  it("marks e2e4 green among starting pawn pushes", () => {
    const chess = new Chess();
    const colours = chessUpAssistanceForMove(chess, "e2", "e4");
    assert.ok(colours.includes("green"));
    assert.ok(colours.includes("red"));
    assert.equal(colours.filter((c) => c === "green").length, 1);
  });
});

describe("chessUpAssistanceClear", () => {
  it("returns an empty vector", () => {
    assert.deepEqual(chessUpAssistanceClear(), []);
  });
});
