import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { contextualizeOpeningExplanation, formatOpeningTooltip, getOpeningTooltip } from "./openingTooltips.ts";

describe("getOpeningTooltip", () => {
  it("returns goal-first tooltips for known openings", () => {
    const giuoco = getOpeningTooltip("Giuoco Piano");
    assert.ok(giuoco);
    assert.match(giuoco.goal, /f7|centre|center/i);
    assert.match(giuoco.explanation, /Bc4/);

    const colle = getOpeningTooltip("Colle System");
    assert.ok(colle);
    assert.match(colle.goal, /e4/);
    assert.match(colle.explanation, /Bd3|kingside/i);
  });

  it("normalizes curly apostrophes", () => {
    const qgd = getOpeningTooltip("Queen\u2019s Gambit Declined");
    assert.ok(qgd);
    assert.match(qgd.goal, /d5/);
    assert.match(qgd.explanation, /e6|c8-bishop/i);
  });

  it("matches opening families from variation names", () => {
    const sicilian = getOpeningTooltip("Sicilian Defence, Kalashnikov Variation");
    assert.ok(sicilian);
    assert.match(sicilian.goal, /d4|counterplay/i);
    assert.match(sicilian.explanation, /c5/);

    const french = getOpeningTooltip("French Defence, Classical Variation");
    assert.ok(french);
    assert.match(french.goal, /centre|center|d5/i);

    const semiSlav = getOpeningTooltip("Queen\u2019s Gambit Declined, Semi-Slav Defence");
    assert.ok(semiSlav);
    assert.match(semiSlav.goal, /d5/);

    const kID = getOpeningTooltip("King\u2019s Indian Defence, S\u00e4misch Variation");
    assert.ok(kID);
    assert.match(kID.goal, /centre|center|break/i);

    const sicilianC3 = getOpeningTooltip("Sicilian, 2 c3");
    assert.ok(sicilianC3);
    assert.match(sicilianC3.explanation, /c5/);
  });

  it("formats tooltips for hover text", () => {
    const tip = getOpeningTooltip("English Opening");
    assert.ok(tip);
    const text = formatOpeningTooltip("English Opening", tip);
    assert.ok(text.startsWith(tip.goal));
    assert.match(text, /In the English Opening,/);
  });

  it("weaves the opening title into the explanation", () => {
    const text = contextualizeOpeningExplanation(
      "French Defence, Classical Variation",
      "The e6–d5 wall is slow but resilient.",
    );
    assert.match(text, /In the French Defence, Classical Variation, the e6/);
  });

  it("returns undefined for unknown openings", () => {
    assert.equal(getOpeningTooltip("Polish Opening"), undefined);
    assert.equal(getOpeningTooltip(undefined), undefined);
  });
});
