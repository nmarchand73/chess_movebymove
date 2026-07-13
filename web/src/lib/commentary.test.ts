import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  coalesceProseParagraphs,
  dedupeAlternatives,
  extractAlternatives,
  formatSanWithSymbols,
  hasSubstantiveAltQuote,
  highlightChessNotation,
  isBoilerplateAltQuote,
  mergeOrphanMoveNumbers,
  normalizeCommentary,
  splitPreludeParagraphs,
} from "./commentary.ts";

describe("normalizeCommentary", () => {
  const ply3Raw =
    "f3!\n\n(D)\n\nAbsolutely the best move on the board!\n\nThe knight develops with a threat – attack on a pawn. This gains time as Black is not free to develop as he pleases. He must save the pawn before he does anything else,\n\nand this cuts down his choice of reply.\n\nAt this point there are several ways in which Black might reply.\n\n2...f6: “A feeble move.”\n\n2...c6: “A solid move.”";

  it("strips f3! and (D) from Game 1 ply 3 blob", () => {
    const { main, hadDiagram } = normalizeCommentary(ply3Raw, "Nf3");
    assert.equal(hadDiagram, true);
    assert.ok(main[0]?.startsWith("Absolutely the best move"));
    assert.ok(!main.join(" ").includes("f3!"));
    assert.ok(!main.join(" ").includes("(D)"));
  });

  it("puts alternative replies in alternatives array", () => {
    const { main, alternatives } = normalizeCommentary(ply3Raw, "Nf3");
    assert.ok(main.every((p) => !p.startsWith("2...f6")));
    assert.ok(alternatives.some((a) => a.label.includes("f6")));
  });
});

describe("mergeOrphanMoveNumbers", () => {
  it("joins split move number and continuation", () => {
    const merged = mergeOrphanMoveNumbers([
      "3...",
      "b4: Inferior, because Black’s bishop takes no part in the struggle.",
      "3...",
      "d6: Poor, since the d-pawn is blocked.",
    ]);
    assert.equal(merged[0], "3...b4: Inferior, because Black’s bishop takes no part in the struggle.");
    assert.equal(merged[1], "3...d6: Poor, since the d-pawn is blocked.");
  });

  it("joins inline or-list split across paragraphs", () => {
    const merged = mergeOrphanMoveNumbers([
      "Black must defend his pawn with 2...",
      "c6 or 2...d6 or he may decide to counterattack by 2...",
      "f6.",
    ]);
    assert.equal(
      merged[0],
      "Black must defend his pawn with 2...c6 or 2...d6 or he may decide to counterattack by 2...f6.",
    );
  });

  it("joins capture continuation after move number ellipsis", () => {
    const merged = mergeOrphanMoveNumbers(["34...", "xd7 is no better since the recapture"]);
    assert.equal(merged[0], "34...xd7 is no better since the recapture");
  });
});

describe("isBoilerplateAltQuote", () => {
  it("flags generic placeholder quotes", () => {
    assert.equal(isBoilerplateAltQuote("One option considered here."), true);
    assert.equal(isBoilerplateAltQuote("A good alternative."), true);
    assert.equal(isBoilerplateAltQuote("A feeble move."), false);
  });

  it("detects substantive quotes on alternatives", () => {
    const { alternatives } = extractAlternatives(
      ["Black must defend his pawn with 2...c6 or 2...d6 or he may decide to counterattack by 2...f6."],
      "Nc6",
    );
    assert.equal(alternatives.every((alt) => !hasSubstantiveAltQuote(alt)), true);

    const { alternatives: rich } = normalizeCommentary(
      "2...f6: “A feeble move.”\n\n2...c6: “A solid move.”",
      "Nf3",
    );
    assert.ok(rich.every((alt) => hasSubstantiveAltQuote(alt)));
  });
});

describe("extractAlternatives", () => {
  it("extracts Bc5-style alternatives from merged paragraphs", () => {
    const paragraphs = [
      "Is this the most suitable square for the bishop? Let us look at the alternatives:",
      "3...b4: Inferior, because Black’s bishop takes no part in the struggle.",
      "3...d6: Poor, since the d-pawn is blocked.",
      "3...e7: Not too bad, because the bishop looks out on two diagonals.",
      "The important thing to remember is that every piece must be put in motion.",
    ];
    const { prose, alternatives, tail } = extractAlternatives(paragraphs, "Bc5");
    assert.equal(prose.length, 1);
    assert.equal(alternatives.length, 3);
    assert.equal(alternatives[0]?.label, "3...b4");
    assert.equal(alternatives[0]?.verdict, "Inferior");
    assert.ok(tail.some((p) => p.includes("important thing")));
  });

  it("extracts inline or-list alternatives", () => {
    const { alternatives } = extractAlternatives(
      ["Black must defend his pawn with 2...c6 or 2...d6 or he may decide to counterattack by 2...f6."],
      "Nc6",
    );
    assert.equal(alternatives.length, 3);
    assert.deepEqual(
      alternatives.map((a) => a.label),
      ["2...c6", "2...d6", "2...f6"],
    );
  });
});

describe("coalesceProseParagraphs", () => {
  it("merges mid-sentence EPUB paragraph breaks", () => {
    const merged = coalesceProseParagraphs([
      "The important thing to remember is that every",
      "piece must be put in motion.",
      "Absolutely the best move on the board!",
      "The knight develops towards the centre,",
      "which increases the scope of his attack.",
    ]);
    assert.equal(merged.length, 3);
    assert.equal(merged[0], "The important thing to remember is that every piece must be put in motion.");
    assert.equal(merged[2], "The knight develops towards the centre, which increases the scope of his attack.");
  });
});

describe("dedupeAlternatives", () => {
  it("merges duplicate labels keeping richer quotes", () => {
    const merged = dedupeAlternatives([
      { label: "2...f6", move: "f6", quote: "Short.", tone: "bad", isPlayed: false },
      { label: "2...f6", move: "f6", quote: "Much longer explanation of why f6 fails.", tone: "bad", isPlayed: false },
    ]);
    assert.equal(merged.length, 1);
    assert.ok(merged[0]?.quote.includes("Much longer"));
  });
});

describe("splitPreludeParagraphs", () => {
  it("keeps main commentary before At this point", () => {
    const paragraphs = ["Main line.", "At this point there are several ways.", "2...f6: bad."];
    const { main, prelude } = splitPreludeParagraphs(paragraphs);
    assert.deepEqual(main, ["Main line."]);
    assert.equal(prelude.length, 2);
  });
});

describe("formatSanWithSymbols", () => {
  it("replaces piece letters with Unicode symbols in alternative labels", () => {
    assert.equal(formatSanWithSymbols("2...Nc6"), "2...♘c6");
    assert.equal(formatSanWithSymbols("3...Bxc5"), "3...♗xc5");
    assert.equal(formatSanWithSymbols("3...b4"), "3...b4");
  });
});

describe("highlightChessNotation", () => {
  it("wraps inline move tokens", () => {
    const segments = highlightChessNotation("His next move will be 2 d4.");
    assert.deepEqual(segments, [
      { type: "text", value: "His next move will be " },
      { type: "san", value: "2 d4" },
      { type: "text", value: "." },
    ]);
  });
});
