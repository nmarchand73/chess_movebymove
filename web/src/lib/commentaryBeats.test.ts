import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeCommentary } from "./commentary.ts";
import { buildCommentaryBeats, beatsNeedStepping, extractTakeaway, isSectionTitle, splitSectionTitle } from "./commentaryBeats.ts";

describe("commentaryBeats", () => {
  it("extracts a takeaway from the first sentence", () => {
    const normalized = normalizeCommentary("This is excellent. More detail follows.", "e4");
    assert.equal(extractTakeaway(normalized), "This is excellent.");
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
