import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { moveSanMatches, openingNameMatches } from "./openingNameMatch.ts";

describe("openingNameMatches", () => {
  const dragon = { en: "Sicilian Dragon", fr: "Sicilienne Dragon" };

  it("accepts exact and bilingual names", () => {
    assert.equal(openingNameMatches("Sicilian Dragon", dragon), true);
    assert.equal(openingNameMatches("Sicilienne Dragon", dragon), true);
  });

  it("rejects short or overly vague guesses", () => {
    assert.equal(openingNameMatches("Sic", dragon), false);
    assert.equal(openingNameMatches("Sicilian", dragon), false);
    assert.equal(openingNameMatches("Dragon", dragon), false);
  });

  it("accepts all significant tokens in any order", () => {
    assert.equal(openingNameMatches("Dragon Sicilian", dragon), true);
  });
});

describe("moveSanMatches", () => {
  it("ignores check marks and zero castling notation", () => {
    assert.equal(moveSanMatches("Nf3+", "Nf3"), true);
    assert.equal(moveSanMatches("0-0", "O-O"), true);
    assert.equal(moveSanMatches("e4", "d4"), false);
  });
});
