import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Chess } from "chess.js";
import {
  buildBoardGuide,
  guideLedSquares,
  isExpectedPieceInHand,
  isProgressTowardExpectedMove,
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

  it("asks to set up when board differs unrelated to the next move", () => {
    const chess = new Chess();
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    // a-pawn pushed — not part of expected e4
    const wrong = "rnbqkbnr/pppppppp/8/8/P7/8/1PPPPPPP/RNBQKBNR";
    const guide = buildBoardGuide({
      boardPlacement: wrong,
      lessonPlacement: start,
      nextSan: "e4",
      chess,
      atEnd: false,
    });
    assert.equal(guide.kind, "setup");
    if (guide.kind === "setup") {
      assert.ok(guide.mismatchCount >= 2);
      assert.ok(guideLedSquares(guide).includes("a2"));
      assert.ok(guideLedSquares(guide).includes("a4"));
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

  it("keeps move guide LEDs when the expected piece is lifted", () => {
    const chess = new Chess();
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    const liftedE2 = "rnbqkbnr/pppppppp/8/8/8/8/PPPP1PPP/RNBQKBNR";
    assert.equal(isProgressTowardExpectedMove(chess, start, liftedE2, "e4"), true);

    const guide = buildBoardGuide({
      boardPlacement: liftedE2,
      lessonPlacement: start,
      nextSan: "e4",
      chess,
      atEnd: false,
    });
    assert.equal(guide.kind, "play_move");
    assert.deepEqual(guideLedSquares(guide), ["e2", "e4"]);
  });

  it("keeps lesson move LEDs on a clean lift of a wrong piece (no setup flood)", () => {
    const chess = new Chess();
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    const liftedA2 = "rnbqkbnr/pppppppp/8/8/8/8/1PPPPPPP/RNBQKBNR";
    assert.equal(isProgressTowardExpectedMove(chess, start, liftedA2, "e4"), false);
    assert.equal(isExpectedPieceInHand(start, liftedA2, "e2", "e4", ["e2", "e4"]), false);

    const guide = buildBoardGuide({
      boardPlacement: liftedA2,
      lessonPlacement: start,
      nextSan: "e4",
      chess,
      atEnd: false,
    });
    // Still guide the expected move — do not light the wrong lifted square as setup.
    assert.equal(guide.kind, "play_move");
    assert.deepEqual(guideLedSquares(guide), ["e2", "e4"]);
  });

  it("asks to reset when the board is already ahead (rewind to start)", () => {
    const chess = new Chess();
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    const afterE4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR";
    assert.equal(isProgressTowardExpectedMove(chess, start, afterE4, "e4"), false);

    const guide = buildBoardGuide({
      boardPlacement: afterE4,
      lessonPlacement: start,
      nextSan: "e4",
      chess,
      atEnd: false,
    });
    assert.equal(guide.kind, "setup");
    assert.deepEqual(guideLedSquares(guide).sort(), ["e2", "e4"]);
  });

  it("keeps move LEDs when expected piece is lifted (move-diff only)", () => {
    const chess = new Chess();
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    const liftedE2 = "rnbqkbnr/pppppppp/8/8/8/8/PPPP1PPP/RNBQKBNR";
    assert.equal(isExpectedPieceInHand(start, liftedE2, "e2", "e4", ["e2", "e4"]), true);

    const guide = buildBoardGuide({
      boardPlacement: liftedE2,
      lessonPlacement: start,
      nextSan: "e4",
      chess,
      atEnd: false,
    });
    assert.equal(guide.kind, "play_move");
    assert.deepEqual(guideLedSquares(guide), ["e2", "e4"]);
  });

  it("forces full setup check after rewind when requireExactSync", () => {
    const chess = new Chess();
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    // Mid-game-ish: e-pawn advanced and a-pawn too — must reset, not guide e4.
    const ahead = "rnbqkbnr/pppppppp/8/8/P3P3/8/1PPP1PPP/RNBQKBNR";
    const guide = buildBoardGuide({
      boardPlacement: ahead,
      lessonPlacement: start,
      nextSan: "e4",
      chess,
      atEnd: false,
      requireExactSync: true,
    });
    assert.equal(guide.kind, "setup");
    assert.ok(guideLedSquares(guide).length >= 2);
    assert.ok(guideLedSquares(guide).includes("a2") || guideLedSquares(guide).includes("a4"));
  });

  it("hides the book move in quiz mode when synced", () => {
    const chess = new Chess();
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    const guide = buildBoardGuide({
      boardPlacement: start,
      lessonPlacement: start,
      nextSan: "e4",
      chess,
      atEnd: false,
      hideNextMove: true,
    });
    assert.deepEqual(guide, { kind: "guess_waiting", side: "white" });
    assert.deepEqual(guideLedSquares(guide), []);
  });

  it("still shows setup LEDs in quiz mode when the board is off-diagram", () => {
    const chess = new Chess();
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    const wrong = "rnbqkbnr/pppppppp/8/8/P7/8/1PPPPPPP/RNBQKBNR";
    const guide = buildBoardGuide({
      boardPlacement: wrong,
      lessonPlacement: start,
      nextSan: "e4",
      chess,
      atEnd: false,
      hideNextMove: true,
    });
    assert.equal(guide.kind, "setup");
    assert.ok(guideLedSquares(guide).length >= 2);
  });
});
