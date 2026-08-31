import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_VOICE_NAME,
  DEFAULT_VOICE_NAME_FR,
  defaultListenSettings,
  ensureDefaultVoiceSelected,
  findPreferredDefaultVoice,
  LISTEN_RATE_DEFAULT,
  LISTEN_RATE_MAX,
  LISTEN_RATE_MIN,
  listenVoicePlatformTip,
  resolveSpeechVoice,
  speechVoicesForLang,
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
    assert.equal(DEFAULT_VOICE_NAME_FR, "Google français");
  });

  it("prefers Google UK English Male on Chrome-like voice lists", () => {
    const voices = [
      fakeVoice({ name: "Google US English", lang: "en-US" }),
      fakeVoice({ name: "Google UK English Female", lang: "en-GB" }),
      fakeVoice({ name: "Google UK English Male", lang: "en-GB" }),
      fakeVoice({ name: "Samantha", lang: "en-US" }),
    ];
    assert.equal(findPreferredDefaultVoice(voices, "en")?.name, "Google UK English Male");
    assert.equal(resolveSpeechVoice("", voices, "en")?.name, "Google UK English Male");
  });

  it("prefers Google français for French UI", () => {
    const voices = [
      fakeVoice({ name: "Google UK English Male", lang: "en-GB" }),
      fakeVoice({ name: "Amélie", lang: "fr-CA" }),
      fakeVoice({ name: "Google français", lang: "fr-FR" }),
      fakeVoice({ name: "Thomas", lang: "fr-FR" }),
    ];
    const frList = speechVoicesForLang("fr", voices);
    assert.ok(frList.every((v) => /^fr/i.test(v.lang)));
    assert.equal(findPreferredDefaultVoice(frList, "fr")?.name, "Google français");
    assert.equal(resolveSpeechVoice("", frList, "fr")?.name, "Google français");
  });

  it("falls back to Daniel Enhanced on Safari-like voice lists", () => {
    const voices = [
      fakeVoice({ name: "Samantha", lang: "en-US", localService: true }),
      fakeVoice({ name: "Daniel", lang: "en-GB", localService: true }),
      fakeVoice({ name: "Daniel (Enhanced)", lang: "en-GB", localService: true }),
      fakeVoice({ name: "Arthur", lang: "en-GB", localService: true }),
    ];
    assert.equal(findPreferredDefaultVoice(voices, "en")?.name, "Daniel (Enhanced)");
    assert.match(listenVoicePlatformTip(voices, "en") ?? "", /Safari cannot use Google/);
  });

  it("falls back to Thomas for French Safari-like lists", () => {
    const voices = [
      fakeVoice({ name: "Thomas (Enhanced)", lang: "fr-FR", localService: true }),
      fakeVoice({ name: "Amélie", lang: "fr-FR", localService: true }),
    ];
    assert.equal(findPreferredDefaultVoice(voices, "fr")?.name, "Thomas (Enhanced)");
    assert.match(listenVoicePlatformTip(voices, "fr") ?? "", /Thomas/);
  });

  it("replaces a missing Chrome voiceURI with the Safari default", () => {
    const voices = [
      fakeVoice({ name: "Daniel (Enhanced)", lang: "en-GB", voiceURI: "daniel-enhanced" }),
    ];
    const next = ensureDefaultVoiceSelected(
      { voiceURI: "google-uk-male-missing", rate: 0.9 },
      voices,
      "en",
    );
    assert.equal(next.voiceURI, "daniel-enhanced");
  });

  it("switches default when UI language changes and saved voice is other-language", () => {
    const voices = [
      fakeVoice({ name: "Google UK English Male", lang: "en-GB", voiceURI: "uk-male" }),
      fakeVoice({ name: "Google français", lang: "fr-FR", voiceURI: "fr-google" }),
    ];
    const frOnly = speechVoicesForLang("fr", voices);
    const next = ensureDefaultVoiceSelected({ voiceURI: "uk-male", rate: 1 }, frOnly, "fr");
    assert.equal(next.voiceURI, "fr-google");
  });

  it("keeps an explicitly saved voice when still installed", () => {
    const voices = [
      fakeVoice({ name: "Google UK English Male", lang: "en-GB", voiceURI: "uk-male" }),
      fakeVoice({ name: "Samantha", lang: "en-US", voiceURI: "samantha" }),
    ];
    assert.equal(resolveSpeechVoice("samantha", voices, "en")?.name, "Samantha");
  });
});
