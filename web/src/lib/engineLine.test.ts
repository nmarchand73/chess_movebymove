import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatEngineLine, formatEngineLines } from "./engineLine.ts";

const START =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("formatEngineLine", () => {
  it("formats a numbered PV from the starting position", () => {
    const line = formatEngineLine(START, ["e2e4", "e7e5", "g1f3"]);
    assert.equal(line, "1.e4 e5 2.Nf3");
  });
});

describe("formatEngineLines", () => {
  it("formats multiple PV move sequences", () => {
    const lines = formatEngineLines(START, [
      { cp: 34, mate: null, pvUci: ["e2e4", "e7e5"] },
      { cp: 28, mate: null, pvUci: ["d2d4", "d7d5"] },
    ]);

    assert.equal(lines.length, 2);
    assert.equal(lines[0]?.cp, 34);
    assert.equal(lines[0]?.moves, "1.e4 e5");
    assert.equal(lines[1]?.cp, 28);
    assert.equal(lines[1]?.moves, "1.d4 d5");
  });
});
