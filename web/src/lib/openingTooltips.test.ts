import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getOpeningTooltip } from "./openingTooltips.ts";

describe("getOpeningTooltip", () => {
  it("returns tooltip for known openings", () => {
    assert.match(getOpeningTooltip("Giuoco Piano") ?? "", /f7/);
    assert.match(getOpeningTooltip("Colle System") ?? "", /e4/);
  });

  it("normalizes curly apostrophes", () => {
    assert.match(getOpeningTooltip("Queen\u2019s Gambit Declined") ?? "", /c-pawn/);
  });

  it("matches opening families from variation names", () => {
    assert.match(getOpeningTooltip("Sicilian Defence, Kalashnikov Variation") ?? "", /c5/);
    assert.match(getOpeningTooltip("French Defence, Classical Variation") ?? "", /d5/);
    assert.match(getOpeningTooltip("Queen\u2019s Gambit Declined, Semi-Slav Defence") ?? "", /e6/);
    assert.match(getOpeningTooltip("King\u2019s Indian Defence, S\u00e4misch Variation") ?? "", /centre/);
    assert.match(getOpeningTooltip("Sicilian, 2 c3") ?? "", /c5/);
  });

  it("returns undefined for unknown openings", () => {
    assert.equal(getOpeningTooltip("Polish Opening"), undefined);
    assert.equal(getOpeningTooltip(undefined), undefined);
  });
});
