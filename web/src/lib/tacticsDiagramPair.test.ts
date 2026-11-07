import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { TacticsExample } from "../types.ts";
import {
  findPairedExample,
  groupExampleNav,
  parseDiagramPairLabel,
  teachLineSource,
} from "./tacticsDiagramPair.ts";

function ex(
  label: string,
  fen: string,
  sans: string[] = [],
): TacticsExample {
  return {
    id: `id-${label}`,
    fen,
    sans,
    coach: { en: label, fr: label },
    label,
  };
}

describe("parseDiagramPairLabel", () => {
  it("parses A/B figure labels", () => {
    assert.deepEqual(parseDiagramPairLabel("12A"), { num: "12", side: "A" });
    assert.deepEqual(parseDiagramPairLabel("3b"), { num: "3", side: "B" });
    assert.equal(parseDiagramPairLabel("12"), null);
    assert.equal(parseDiagramPairLabel("A"), null);
  });
});

describe("teachLineSource", () => {
  const fenA = "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1";
  const fenB = "4k3/8/8/8/8/8/8/4K3 b - - 0 1";
  const examples = [ex("12A", fenA, ["e4"]), ex("12B", fenB)];

  it("puts the A move arrow on B", () => {
    const onB = teachLineSource(examples, examples[1]!);
    assert.equal(onB.fen, fenA);
    assert.deepEqual(onB.sans, ["e4"]);
    assert.equal(onB.arrowOnOpen, true);
  });

  it("hides the move scrubber arrow on A when B exists", () => {
    const onA = teachLineSource(examples, examples[0]!);
    assert.equal(onA.fen, fenA);
    assert.deepEqual(onA.sans, []);
    assert.equal(onA.arrowOnOpen, false);
  });

  it("keeps unpaired diagrams unchanged", () => {
    const solo = ex("12A", fenA, ["e4"]);
    const line = teachLineSource([solo], solo);
    assert.deepEqual(line.sans, ["e4"]);
    assert.equal(line.arrowOnOpen, false);
  });

  it("finds the paired sibling", () => {
    assert.equal(findPairedExample(examples, examples[0]!)?.label, "12B");
    assert.equal(findPairedExample(examples, examples[1]!)?.label, "12A");
  });

  it("groups A/B figures in the navigator", () => {
    const fen = "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1";
    const items = [
      { ex: ex("1", fen), i: 0 },
      { ex: ex("12A", fen, ["e4"]), i: 1 },
      { ex: ex("12B", fen), i: 2 },
      { ex: ex("13", fen), i: 3 },
    ];
    const groups = groupExampleNav(items);
    assert.equal(groups.length, 3);
    assert.equal(groups[0]?.kind, "solo");
    assert.equal(groups[1]?.kind, "pair");
    if (groups[1]?.kind === "pair") {
      assert.equal(groups[1].num, "12");
      assert.equal(groups[1].a.i, 1);
      assert.equal(groups[1].b.i, 2);
    }
    assert.equal(groups[2]?.kind, "solo");
  });
});
