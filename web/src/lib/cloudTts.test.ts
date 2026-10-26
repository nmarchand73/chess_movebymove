import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGoogleTtsUrl,
  chunkForCloudTts,
  CLOUD_GOOGLE_EN,
  CLOUD_TTS_MAX_CHARS,
  cloudVoiceByURI,
  cloudVoicesForLang,
  isCloudVoiceURI,
} from "./cloudTts.ts";

describe("cloudTts", () => {
  it("identifies cloud voice URIs", () => {
    assert.equal(isCloudVoiceURI(CLOUD_GOOGLE_EN.voiceURI), true);
    assert.equal(isCloudVoiceURI("com.apple.voice.compact.en-GB.Daniel"), false);
    assert.equal(cloudVoiceByURI(CLOUD_GOOGLE_EN.voiceURI)?.tl, "en-GB");
    assert.equal(cloudVoicesForLang("fr")[0]?.lang, "fr-FR");
  });

  it("builds a translate_tts URL", () => {
    const url = buildGoogleTtsUrl("White anchors a pawn", "en-GB");
    assert.match(url, /^https:\/\/translate\.google\.com\/translate_tts\?/);
    assert.match(url, /tl=en-GB/);
    assert.match(url, /client=tw-ob/);
    assert.match(url, /q=White/);
  });

  it("leaves short text as one chunk", () => {
    assert.deepEqual(chunkForCloudTts("Knight to f three."), ["Knight to f three."]);
  });

  it("splits long text under the TTS character cap", () => {
    const long = Array.from({ length: 40 }, (_, i) => `Clause number ${i} about the centre`).join(", ");
    assert.ok(long.length > CLOUD_TTS_MAX_CHARS);
    const chunks = chunkForCloudTts(long);
    assert.ok(chunks.length > 1);
    for (const chunk of chunks) {
      assert.ok(chunk.length <= CLOUD_TTS_MAX_CHARS, chunk);
    }
    const rejoined = chunks.join(" ");
    assert.ok(rejoined.includes("Clause number 0"));
    assert.ok(rejoined.includes("Clause number 39"));
  });
});
