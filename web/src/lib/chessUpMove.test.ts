import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Chess } from "chess.js";
import { chessUpMoveMatchesSan, squaresForSan } from "./chessUpMove.ts";

describe("squaresForSan", () => {
  it("resolves e4 from the start", () => {
    const chess = new Chess();
    assert.deepEqual(squaresForSan(chess, "e4"), {
      from: "e2",
      to: "e4",
      san: "e4",
    });
  });
});

describe("chessUpMoveMatchesSan", () => {
  it("accepts the matching board move", () => {
    const chess = new Chess();
    assert.equal(chessUpMoveMatchesSan(chess, "e4", { from: "e2", to: "e4" }), true);
  });

  it("rejects a different move", () => {
    const chess = new Chess();
    assert.equal(chessUpMoveMatchesSan(chess, "e4", { from: "d2", to: "d4" }), false);
  });
});
