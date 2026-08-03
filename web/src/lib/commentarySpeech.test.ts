import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  commentaryToSpeechText,
  joinSpeechParts,
  prepareCommentarySpeech,
  speakableSan,
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
});
