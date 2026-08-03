import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeCommentary } from "./commentary.ts";
import { buildCommentaryBeats, beatsNeedStepping, beatsWithoutTakeawayDuplicate, extractTakeaway, isSectionTitle, splitSectionTitle, stripLeadingTakeaway } from "./commentaryBeats.ts";

describe("commentaryBeats", () => {
  it("extracts a takeaway from the first sentence", () => {
    const normalized = normalizeCommentary("This is excellent. More detail follows.", "e4");
    assert.equal(extractTakeaway(normalized), "This is excellent.");
  });

  it("removes the takeaway sentence from following prose", () => {
    const text =
      "The development of a bishop at g2 (or the corresponding squares b2, b7 and g7) is called a fianchetto. At one time, this type of bishop development was frowned upon.";
    const normalized = normalizeCommentary(text, "g3");
    const takeaway = extractTakeaway(normalized);
    assert.equal(
      takeaway,
      "The development of a bishop at g2 (or the corresponding squares b2, b7 and g7) is called a fianchetto.",
    );
    const beats = beatsWithoutTakeawayDuplicate(buildCommentaryBeats(normalized), takeaway);
    const prose = beats.find((beat) => beat.kind === "prose");
    assert.ok(prose && prose.kind === "prose");
    assert.match(prose.text, /^At one time/);
    assert.doesNotMatch(prose.text, /called a fianchetto/i);
    assert.equal(
      stripLeadingTakeaway(text, takeaway!),
      "At one time, this type of bishop development was frowned upon.",
    );
  });

  it("splits long commentary into multiple beats", () => {
    const normalized = normalizeCommentary(
      "First idea.\n\nSecond idea.\n\nThird idea.",
      "Nf3",
    );
    const beats = buildCommentaryBeats(normalized);
    assert.ok(beats.length >= 3);
    assert.equal(beatsNeedStepping(beats), true);
  });

  it("includes alternatives as a beat", () => {
    const normalized = normalizeCommentary(
      "Main text.\n\n2...f6: “A feeble move.”\n\n2...c6: “A solid move.”",
      "Nc6",
    );
    const beats = buildCommentaryBeats(normalized);
    assert.ok(beats.some((beat) => beat.kind === "alternatives"));
  });

  it("shows chapter titles once as a heading beat", () => {
    const intro = normalizeCommentary(
      "Get the Pieces Out!\n\nOne of the main objectives in the opening is to bring the pieces into play.",
      undefined,
    );
    const beats = buildCommentaryBeats(intro);
    assert.equal(beats[0]?.kind, "heading");
    assert.equal(beats[0]?.kind === "heading" ? beats[0].text : "", "Get the Pieces Out!");
    assert.equal(extractTakeaway(intro), "One of the main objectives in the opening is to bring the pieces into play.");
    assert.equal(isSectionTitle("Get the Pieces Out!\n\nBody text."), true);
    assert.equal(splitSectionTitle("Get the Pieces Out!\n\nBody text.").body, "Body text.");
  });
});
