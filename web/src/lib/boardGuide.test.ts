import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Chess } from "chess.js";
import {
  buildBoardGuide,
  guideLedSquares,
  mismatchedSquares,
  placementToMap,
} from "./boardGuide.ts";

describe("boardGuide", () => {
  it("maps placement to squares", () => {
    const map = placementToMap("8/8/8/8/4P3/8/8/8");
    assert.equal(map.e4, "P");
    assert.equal(map.e2, undefined);
  });

  it("finds mismatched squares", () => {
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    const afterE4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR";
    const mismatches = mismatchedSquares(start, afterE4);
    assert.deepEqual(mismatches, ["e2", "e4"]);
  });

  it("asks to set up when board differs from lesson", () => {
    const chess = new Chess();
    const guide = buildBoardGuide({
      boardPlacement: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR",
      lessonPlacement: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
      nextSan: "e4",
      chess,
      atEnd: false,
    });
    assert.equal(guide.kind, "setup");
    if (guide.kind === "setup") {
      assert.ok(guide.mismatchCount >= 2);
      assert.deepEqual(guideLedSquares(guide).sort(), ["e2", "e4"]);
    }
  });

  it("guides the next move when synced", () => {
    const chess = new Chess();
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    const guide = buildBoardGuide({
      boardPlacement: start,
      lessonPlacement: start,
      nextSan: "e4",
      chess,
      atEnd: false,
    });
    assert.deepEqual(guide, {
      kind: "play_move",
      san: "e4",
      from: "e2",
      to: "e4",
      side: "white",
    });
    assert.deepEqual(guideLedSquares(guide), ["e2", "e4"]);
  });
});
