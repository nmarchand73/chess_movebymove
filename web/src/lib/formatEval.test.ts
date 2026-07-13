import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evalBarPercent,
  formatEval,
  hasDisplayableEval,
  normalizeEvalFromSideToMove,
} from "./formatEval.ts";

describe("normalizeEvalFromSideToMove", () => {
  it("flips cp and mate for black to move", () => {
    assert.deepEqual(normalizeEvalFromSideToMove(40, null, "b"), { cp: -40, mate: null });
    assert.deepEqual(normalizeEvalFromSideToMove(null, 2, "b"), { cp: null, mate: -2 });
  });
});

describe("formatEval", () => {
  it("formats centipawns from white perspective", () => {
    assert.equal(formatEval({ cp: 34, mate: null, depth: 14, bestMoveUci: null, pvUci: [], lines: [] }), "+0.34");
    assert.equal(formatEval({ cp: -125, mate: null, depth: 14, bestMoveUci: null, pvUci: [], lines: [] }), "-1.25");
  });

  it("formats mate scores", () => {
    assert.equal(formatEval({ cp: null, mate: 3, depth: 14, bestMoveUci: null, pvUci: [], lines: [] }), "+#3");
    assert.equal(formatEval({ cp: null, mate: -2, depth: 14, bestMoveUci: null, pvUci: [], lines: [] }), "-#2");
  });

  it("maps eval to bar height", () => {
    assert.equal(evalBarPercent({ cp: 0, mate: null, depth: 14, bestMoveUci: null, pvUci: [], lines: [] }), 50);
    assert.equal(evalBarPercent({ cp: null, mate: 1, depth: 14, bestMoveUci: null, pvUci: [], lines: [] }), 100);
    assert.equal(evalBarPercent({ cp: null, mate: -1, depth: 14, bestMoveUci: null, pvUci: [], lines: [] }), 0);
  });
});

describe("hasDisplayableEval", () => {
  it("requires a PV or best move", () => {
    assert.equal(hasDisplayableEval({ cp: 30, mate: null, depth: 8, bestMoveUci: null, pvUci: [], lines: [] }), false);
    assert.equal(
      hasDisplayableEval({
        cp: 30,
        mate: null,
        depth: 8,
        bestMoveUci: "e2e4",
        pvUci: [],
        lines: [],
      }),
      true,
    );
  });
});
