import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isLegacyCloudVoiceURI,
  isOnlineVoiceURI,
  isPremiumVoiceURI,
  PREMIUM_EN,
  PREMIUM_FR,
  premiumVoiceByURI,
  premiumVoicesForLang,
} from "./premiumTts.ts";

describe("premiumTts", () => {
  it("identifies premium and legacy online voice URIs", () => {
    assert.equal(isPremiumVoiceURI(PREMIUM_EN.voiceURI), true);
    assert.equal(isLegacyCloudVoiceURI("cloud:google:en-GB"), true);
    assert.equal(isOnlineVoiceURI(PREMIUM_FR.voiceURI), true);
    assert.equal(isOnlineVoiceURI("com.apple.speech.voice.Daniel"), false);
  });

  it("resolves curated neural voices per language", () => {
    assert.equal(premiumVoiceByURI(PREMIUM_EN.voiceURI)?.id, "en-orion");
    assert.equal(premiumVoicesForLang("fr")[0]?.id, "fr-melotts");
    assert.equal(premiumVoicesForLang("en")[0]?.name, "Orion (neural)");
  });
});
