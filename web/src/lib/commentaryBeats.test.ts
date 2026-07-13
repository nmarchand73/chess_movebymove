import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeCommentary } from "./commentary.ts";
import { buildCommentaryBeats, beatsNeedStepping, extractTakeaway } from "./commentaryBeats.ts";

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
});
