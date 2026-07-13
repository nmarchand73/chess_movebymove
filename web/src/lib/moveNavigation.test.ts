import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AnnotationNode } from "../types.ts";
import {
  nextAnnotatedPly,
  parseSanToken,
  previewAlternative,
  resolveSanClick,
} from "./moveNavigation.ts";

const game1Nodes: AnnotationNode[] = [
  { ply: 0, text: "Intro" },
  { ply: 1, san: "e4", text: "Good.", isCritical: true },
  { ply: 2, san: "e5", text: "Also good." },
  { ply: 3, san: "Nf3", text: "Best.", isCritical: true },
  { ply: 4, san: "Nc6", text: "" },
  { ply: 5, san: "Bc4", text: "Attack.", isCritical: true },
];

describe("parseSanToken", () => {
  it("parses black alternative notation", () => {
    assert.deepEqual(parseSanToken("2...c6"), { moveNum: 2, side: "black", san: "c6" });
  });

  it("parses white move with dot", () => {
    assert.deepEqual(parseSanToken("2. d4"), { moveNum: 2, side: "white", san: "d4" });
  });
});

describe("resolveSanClick", () => {
  it("jumps to a main-line move", () => {
    const result = resolveSanClick("2...Nc6", game1Nodes, 3);
    assert.equal(result.kind, "jump");
    if (result.kind === "jump") assert.equal(result.ply, 4);
  });

  it("previews an alternative from current position", () => {
    const result = resolveSanClick("2...d6", game1Nodes, 3);
    assert.equal(result.kind, "preview");
    if (result.kind === "preview") {
      assert.ok(result.fen.length > 10);
      assert.equal(result.label, "2...d6");
    }
  });
});

describe("previewAlternative", () => {
  it("previews chip move", () => {
    const result = previewAlternative(game1Nodes, 3, { label: "2...d6", move: "d6" });
    assert.equal(result.kind, "preview");
  });
});

describe("nextAnnotatedPly", () => {
  it("skips silent moves", () => {
    assert.equal(nextAnnotatedPly(game1Nodes, 3, 5), 5);
    assert.equal(nextAnnotatedPly(game1Nodes, 4, 5), 5);
    assert.equal(nextAnnotatedPly(game1Nodes, 5, 5), null);
  });
});
