import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  commentaryToSpeechText,
  joinSpeechParts,
  normalizeEvalMarks,
  prepareCommentarySpeech,
  speakableSan,
  speakInformatorSymbols,
  splitIntoSpeechSentences,
} from "./commentarySpeech.ts";
import type { CommentaryBeat } from "./commentaryBeats.ts";

describe("speakableSan", () => {
  it("speaks pieces, captures, checks and mates", () => {
    assert.equal(speakableSan("Nf3"), "knight to f three");
    assert.equal(speakableSan("Nxf7+"), "knight takes f seven check");
    assert.equal(speakableSan("exd4"), "e takes d four");
    assert.equal(speakableSan("Qh4#"), "queen to h four checkmate");
    assert.equal(speakableSan("e8=Q+"), "e eight promotes to queen check");
  });

  it("speaks castling and move numbers", () => {
    assert.equal(speakableSan("O-O"), "castles kingside");
    assert.equal(speakableSan("0-0-0+"), "castles queenside check");
    assert.equal(speakableSan("5...exd4"), "move 5 for black, e takes d four");
    assert.equal(speakableSan("2.d4"), "move 2, d four");
  });

  it("speaks ASCII and Unicode evaluation marks", () => {
    assert.equal(speakableSan("Nf3!!"), "knight to f three brilliant");
    assert.equal(speakableSan("Nf3‼"), "knight to f three brilliant");
    assert.equal(speakableSan("e5??"), "e five blunder");
    assert.equal(speakableSan("e5⁇"), "e five blunder");
    assert.equal(speakableSan("Bd6!?"), "bishop to d six interesting");
    assert.equal(speakableSan("Bd6⁉"), "bishop to d six interesting");
    assert.equal(speakableSan("Nc6?!"), "knight to c six dubious");
    assert.equal(speakableSan("Nc6⁈"), "knight to c six dubious");
  });

  it("speaks French pieces, captures, checks and mates", () => {
    assert.equal(speakableSan("Nf3", "fr"), "cavalier en f trois");
    assert.equal(speakableSan("Nxf7+", "fr"), "cavalier prend f sept échec");
    assert.equal(speakableSan("exd4", "fr"), "e prend d quatre");
    assert.equal(speakableSan("Qh4#", "fr"), "dame en h quatre mat");
    assert.equal(speakableSan("e8=Q+", "fr"), "e huit promu en dame échec");
  });

  it("speaks French castling and move numbers", () => {
    assert.equal(speakableSan("O-O", "fr"), "petit roque");
    assert.equal(speakableSan("0-0-0+", "fr"), "grand roque échec");
    assert.equal(speakableSan("5...exd4", "fr"), "coup 5 des Noirs, e prend d quatre");
    assert.equal(speakableSan("2.d4", "fr"), "coup 2, d quatre");
  });

  it("speaks French ASCII and Unicode evaluation marks", () => {
    assert.equal(speakableSan("Nf3!!", "fr"), "cavalier en f trois brillant");
    assert.equal(speakableSan("Nf3‼", "fr"), "cavalier en f trois brillant");
    assert.equal(speakableSan("e5??", "fr"), "e cinq gaffe");
    assert.equal(speakableSan("e5⁇", "fr"), "e cinq gaffe");
    assert.equal(speakableSan("Bd6!?", "fr"), "fou en d six intéressant");
    assert.equal(speakableSan("Bd6⁉", "fr"), "fou en d six intéressant");
    assert.equal(speakableSan("Nc6?!", "fr"), "cavalier en c six douteux");
    assert.equal(speakableSan("Nc6⁈", "fr"), "cavalier en c six douteux");
  });
});

describe("prepareCommentarySpeech", () => {
  it("expands inline checks instead of reading plus or hash", () => {
    const text = prepareCommentarySpeech(
      "Black plays Bb4+ and later threatens xh7#. Also 9 0-0 e7.",
    );
    assert.match(text, /bishop to b four check/);
    assert.match(text, /takes h seven checkmate/);
    assert.match(text, /castles kingside/);
    assert.doesNotMatch(text, /\+/);
    assert.doesNotMatch(text, /#/);
  });

  it("softens hyphenated pawn jargon", () => {
    assert.match(prepareCommentarySpeech("guards the e-pawn"), /e pawn/);
  });

  it("speaks Informator evaluation symbols in prose", () => {
    const text = prepareCommentarySpeech(
      "After the exchange White is ± and Black has ⇄. The idea △ Nf3 is □.",
    );
    assert.match(text, /White is better/);
    assert.match(text, /with counterplay/);
    assert.match(text, /with the idea/);
    assert.match(text, /only move/);
    assert.equal(normalizeEvalMarks("g3‼"), "g3!!");
    assert.match(speakInformatorSymbols("unclear ∞ position"), /unclear/);
  });

  it("speaks full move pairs with a pause between white and black", () => {
    assert.equal(
      prepareCommentarySpeech("28 f3 exf3+"),
      "move 28, f three, e takes f three check",
    );
    assert.equal(
      prepareCommentarySpeech("28. f3 exf3+"),
      "move 28, f three, e takes f three check",
    );
    assert.match(
      prepareCommentarySpeech("by 28 f3 exf3+ 29 Kxf3, followed by d4"),
      /move 28, f three, e takes f three check\. move 29, king takes f three/,
    );
  });

  it("handles promotions, diagonals, and glued move sequences", () => {
    assert.equal(
      prepareCommentarySpeech("e8=Q+"),
      "e eight promotes to queen check",
    );
    assert.match(
      prepareCommentarySpeech("a2-g8 diagonals"),
      /a two to g eight diagonals/,
    );
    assert.match(
      prepareCommentarySpeech("16...Nxf3+ 17 exf3"),
      /check\. move 17/,
    );
    assert.match(
      prepareCommentarySpeech("45 Bxa7?? loses"),
      /blunder and loses/,
    );
  });

  it("expands French inline checks instead of reading plus or hash", () => {
    const text = prepareCommentarySpeech(
      "Les Noirs jouent Bb4+ puis menacent xh7#. Aussi 9 0-0 e7.",
      "fr",
    );
    assert.match(text, /fou en b quatre échec/);
    assert.match(text, /prend h sept mat/);
    assert.match(text, /petit roque/);
    assert.doesNotMatch(text, /\+/);
    assert.doesNotMatch(text, /#/);
  });

  it("softens French pawn jargon", () => {
    assert.match(prepareCommentarySpeech("protège le e-pawn", "fr"), /pion e/);
    assert.match(prepareCommentarySpeech("protège le pion e", "fr"), /pion e/);
  });

  it("speaks French Informator evaluation symbols in prose", () => {
    const text = prepareCommentarySpeech(
      "Après l'échange les Blancs sont ± et les Noirs ont ⇄. L'idée △ Nf3 est □.",
      "fr",
    );
    assert.match(text, /les Blancs sont mieux/);
    assert.match(text, /avec contrejeu/);
    assert.match(text, /avec l'idée/);
    assert.match(text, /seul coup/);
    assert.equal(normalizeEvalMarks("g3‼"), "g3!!");
    assert.match(speakInformatorSymbols("position ∞", "fr"), /peu clair/);
  });

  it("speaks French full move pairs with a pause between white and black", () => {
    assert.equal(
      prepareCommentarySpeech("28 f3 exf3+", "fr"),
      "coup 28, f trois, e prend f trois échec",
    );
    assert.equal(
      prepareCommentarySpeech("28. f3 exf3+", "fr"),
      "coup 28, f trois, e prend f trois échec",
    );
    assert.match(
      prepareCommentarySpeech("par 28 f3 exf3+ 29 Kxf3, suivi de d4", "fr"),
      /coup 28, f trois, e prend f trois échec\. coup 29, roi prend f trois/,
    );
  });

  it("handles French promotions, diagonals, and glued move sequences", () => {
    assert.equal(
      prepareCommentarySpeech("e8=Q+", "fr"),
      "e huit promu en dame échec",
    );
    assert.match(
      prepareCommentarySpeech("a2-g8 diagonales", "fr"),
      /a deux à g huit diagonales/,
    );
    assert.match(
      prepareCommentarySpeech("16...Nxf3+ 17 exf3", "fr"),
      /échec\. coup 17/,
    );
    assert.match(
      prepareCommentarySpeech("45 Bxa7?? perd", "fr"),
      /gaffe et perd/,
    );
  });
});

describe("splitIntoSpeechSentences", () => {
  it("keeps each sentence separate for utterance pauses", () => {
    const sentences = splitIntoSpeechSentences(
      "White anchors a pawn. His next move will be d four. Black must reply.",
    );
    assert.deepEqual(sentences, [
      "White anchors a pawn.",
      "His next move will be d four.",
      "Black must reply.",
    ]);
  });
});

describe("joinSpeechParts", () => {
  it("inserts a period between bare commentary chunks", () => {
    assert.equal(
      joinSpeechParts(["White strikes in the middle", "Black holds the centre."]),
      "White strikes in the middle. Black holds the centre.",
    );
  });
});

describe("commentaryToSpeechText", () => {
  it("joins prose beats and a non-duplicate takeaway", () => {
    const beats: CommentaryBeat[] = [
      { kind: "heading", text: "The centre opens" },
      { kind: "prose", text: "White strikes in the middle." },
    ];
    const text = commentaryToSpeechText(beats, "Hope Black exchanges.");
    assert.match(text, /Hope Black exchanges/);
    assert.match(text, /The centre opens/);
    assert.match(text, /White strikes in the middle/);
  });

  it("does not repeat a takeaway already in the prose", () => {
    const beats: CommentaryBeat[] = [
      { kind: "prose", text: "Practically forced, since 5...d6 is clumsy." },
    ];
    const text = commentaryToSpeechText(beats, "Practically forced, since 5...d6 is clumsy.");
    assert.equal(
      text.match(/Practically forced/g)?.length,
      1,
    );
    assert.match(text, /move 5 for black, d six/);
  });

  it("includes spoken alternatives", () => {
    const beats: CommentaryBeat[] = [
      {
        kind: "alternatives",
        intro: "Black might try",
        alternatives: [
          {
            label: "6...exd4",
            move: "exd4",
            quote: "This opens the centre.",
            tone: "neutral",
            isPlayed: false,
          },
        ],
      },
    ];
    const text = commentaryToSpeechText(beats);
    assert.match(text, /Black might try/);
    assert.match(text, /move 6 for black, e takes d four/);
    assert.match(text, /opens the centre/);
  });

  it("returns empty string for empty beats", () => {
    assert.equal(commentaryToSpeechText([]), "");
  });

  it("joins French prose beats and a non-duplicate takeaway", () => {
    const beats: CommentaryBeat[] = [
      { kind: "heading", text: "Le centre s'ouvre" },
      { kind: "prose", text: "Les Blancs frappent au centre." },
    ];
    const text = commentaryToSpeechText(beats, "Espérons un échange.", "fr");
    assert.match(text, /Espérons un échange/);
    assert.match(text, /Le centre s'ouvre/);
    assert.match(text, /Les Blancs frappent au centre/);
  });

  it("does not repeat a French takeaway already in the prose", () => {
    const beats: CommentaryBeat[] = [
      { kind: "prose", text: "Pratiquement forcé, car 5...d6 est maladroit." },
    ];
    const text = commentaryToSpeechText(
      beats,
      "Pratiquement forcé, car 5...d6 est maladroit.",
      "fr",
    );
    assert.equal(text.match(/Pratiquement forcé/g)?.length, 1);
    assert.match(text, /coup 5 des Noirs, d six/);
  });

  it("includes spoken French alternatives", () => {
    const beats: CommentaryBeat[] = [
      {
        kind: "alternatives",
        intro: "Les Noirs peuvent essayer",
        alternatives: [
          {
            label: "6...exd4",
            move: "exd4",
            quote: "Cela ouvre le centre.",
            tone: "neutral",
            isPlayed: false,
          },
        ],
      },
    ];
    const text = commentaryToSpeechText(beats, null, "fr");
    assert.match(text, /Les Noirs peuvent essayer/);
    assert.match(text, /coup 6 des Noirs, e prend d quatre/);
    assert.match(text, /ouvre le centre/);
  });
});
