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

  it("returns undefined for unknown openings", () => {
    assert.equal(getOpeningTooltip("Caro-Kann"), undefined);
    assert.equal(getOpeningTooltip(undefined), undefined);
  });
});
