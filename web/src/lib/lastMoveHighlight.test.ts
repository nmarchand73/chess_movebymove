import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Chess } from "chess.js";
import { arrowColorForSide, getLastMoveHighlight } from "./lastMoveHighlight.ts";

describe("arrowColorForSide", () => {
  it("uses orange for white and slate blue for black", () => {
    assert.equal(arrowColorForSide("w"), "#c45c1a");
    assert.equal(arrowColorForSide("b"), "#2b5278");
  });
});

describe("getLastMoveHighlight", () => {
  it("returns empty highlight at starting position", () => {
    const chess = new Chess();
    const result = getLastMoveHighlight(chess);
    assert.equal(result.arrows.length, 0);
    assert.deepEqual(result.squareStyles, {});
  });

  it("uses white arrow color for white moves", () => {
    const chess = new Chess();
    chess.move("e4");
    const result = getLastMoveHighlight(chess);
    assert.equal(result.arrows.length, 1);
    assert.equal(result.arrows[0]?.color, "#c45c1a");
    assert.equal(result.arrows[0]?.startSquare, "e2");
    assert.equal(result.arrows[0]?.endSquare, "e4");
  });

  it("uses black arrow color for black moves", () => {
    const chess = new Chess();
    chess.move("e4");
    chess.move("e5");
    const result = getLastMoveHighlight(chess);
    assert.equal(result.arrows.length, 1);
    assert.equal(result.arrows[0]?.color, "#2b5278");
    assert.equal(result.arrows[0]?.startSquare, "e7");
    assert.equal(result.arrows[0]?.endSquare, "e5");
  });
});
