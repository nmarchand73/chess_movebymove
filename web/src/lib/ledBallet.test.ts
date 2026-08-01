import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allChessSquares,
  balletCoversAllSquares,
  buildLedBallet,
  spiralOrder,
} from "./ledBallet.ts";

describe("ledBallet", () => {
  it("lists 64 unique squares", () => {
    const squares = allChessSquares();
    assert.equal(squares.length, 64);
    assert.equal(new Set(squares).size, 64);
  });

  it("spirals across every square once", () => {
    const order = spiralOrder();
    assert.equal(order.length, 64);
    assert.equal(new Set(order).size, 64);
    assert.equal(order[0], "a1");
  });

  it("covers every square during the ballet", () => {
    const frames = buildLedBallet();
    assert.ok(frames.length > 20);
    assert.ok(balletCoversAllSquares(frames));
    assert.ok(frames.some((frame) => frame.squares.length === 64));
  });
});
