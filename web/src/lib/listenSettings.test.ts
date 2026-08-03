import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_VOICE_NAME,
  defaultListenSettings,
  ensureDefaultVoiceSelected,
  findPreferredDefaultVoice,
  LISTEN_RATE_DEFAULT,
  LISTEN_RATE_MAX,
  LISTEN_RATE_MIN,
  listenVoicePlatformTip,
  resolveSpeechVoice,
} from "./listenSettings.ts";

function fakeVoice(partial: {
  name: string;
  lang: string;
  voiceURI?: string;
  localService?: boolean;
}): SpeechSynthesisVoice {
  return {
    name: partial.name,
    lang: partial.lang,
    voiceURI: partial.voiceURI ?? `${partial.name}-${partial.lang}`,
    localService: partial.localService ?? false,
    default: false,
  } as SpeechSynthesisVoice;
}

describe("listenSettings", () => {
  it("defaults to automatic voice and a calm rate", () => {
    assert.deepEqual(defaultListenSettings(), {
      voiceURI: "",
      rate: LISTEN_RATE_DEFAULT,
    });
    assert.ok(LISTEN_RATE_DEFAULT >= LISTEN_RATE_MIN);
    assert.ok(LISTEN_RATE_DEFAULT <= LISTEN_RATE_MAX);
    assert.equal(DEFAULT_VOICE_NAME, "Google UK English Male");
  });

  it("prefers Google UK English Male on Chrome-like voice lists", () => {
    const voices = [
      fakeVoice({ name: "Google US English", lang: "en-US" }),
      fakeVoice({ name: "Google UK English Female", lang: "en-GB" }),
      fakeVoice({ name: "Google UK English Male", lang: "en-GB" }),
      fakeVoice({ name: "Samantha", lang: "en-US" }),
    ];
    assert.equal(findPreferredDefaultVoice(voices)?.name, "Google UK English Male");
    assert.equal(resolveSpeechVoice("", voices)?.name, "Google UK English Male");
  });

  it("falls back to Daniel Enhanced on Safari-like voice lists", () => {
    const voices = [
      fakeVoice({ name: "Samantha", lang: "en-US", localService: true }),
      fakeVoice({ name: "Daniel", lang: "en-GB", localService: true }),
      fakeVoice({ name: "Daniel (Enhanced)", lang: "en-GB", localService: true }),
      fakeVoice({ name: "Arthur", lang: "en-GB", localService: true }),
    ];
    assert.equal(findPreferredDefaultVoice(voices)?.name, "Daniel (Enhanced)");
    assert.match(listenVoicePlatformTip(voices) ?? "", /Safari cannot use Google/);
  });

  it("replaces a missing Chrome voiceURI with the Safari default", () => {
    const voices = [
      fakeVoice({ name: "Daniel (Enhanced)", lang: "en-GB", voiceURI: "daniel-enhanced" }),
    ];
    const next = ensureDefaultVoiceSelected(
      { voiceURI: "google-uk-male-missing", rate: 0.9 },
      voices,
    );
    assert.equal(next.voiceURI, "daniel-enhanced");
  });

  it("keeps an explicitly saved voice when still installed", () => {
    const voices = [
      fakeVoice({ name: "Google UK English Male", lang: "en-GB", voiceURI: "uk-male" }),
      fakeVoice({ name: "Samantha", lang: "en-US", voiceURI: "samantha" }),
    ];
    assert.equal(resolveSpeechVoice("samantha", voices)?.name, "Samantha");
  });
});
