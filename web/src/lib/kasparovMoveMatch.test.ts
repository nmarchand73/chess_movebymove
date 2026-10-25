import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkKasparovMove, normalizeKasparovMove } from "./kasparovMoveMatch.ts";

const legal: [string, string, string][] = [
  ["d4e5", "dxe5", "dxe5"],
  ["f3g5", "Ng5", "Cg5"],
  ["e1g1", "O-O", "O-O"],
];

describe("kasparovMoveMatch", () => {
  it("normalizes castling and move prefixes", () => {
    // Capture marks (x/:) are stripped so EN/FR/UCI compare on the same key.
    assert.equal(normalizeKasparovMove("4. dxe5"), "de5");
    assert.equal(normalizeKasparovMove("0-0"), "O-O");
    assert.equal(normalizeKasparovMove("O–O–O"), "O-O-O");
  });

  it("accepts English SAN, French letters, and UCI", () => {
    assert.equal(checkKasparovMove("dxe5", legal, "d4e5").status, "correct");
    assert.equal(checkKasparovMove("Cg5", legal, "f3g5").status, "correct");
    assert.equal(checkKasparovMove("d4e5", legal, "d4e5").status, "correct");
  });

  it("marks a legal but wrong move as wrong", () => {
    const result = checkKasparovMove("Ng5", legal, "d4e5");
    assert.equal(result.status, "wrong");
  });

  it("returns unknown for garbage", () => {
    assert.equal(checkKasparovMove("xyz", legal, "d4e5").status, "unknown");
  });
});
