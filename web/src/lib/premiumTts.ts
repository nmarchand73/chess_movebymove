/**
 * Real-time premium TTS via our Cloudflare Worker (Workers AI neural voices).
 * The client pipelines one sentence at a time — Listen starts on the first reply.
 */

export const PREMIUM_VOICE_URI_PREFIX = "premium:";

/** Retired unofficial Google translate_tts URIs (blocked on iPhone). */
export const LEGACY_CLOUD_VOICE_URI_PREFIX = "cloud:google:";

export type PremiumVoiceId = "en-orion" | "fr-melotts";

export type PremiumVoice = {
  voiceURI: string;
  id: PremiumVoiceId;
  name: string;
  lang: string;
};

export const PREMIUM_EN: PremiumVoice = {
  voiceURI: `${PREMIUM_VOICE_URI_PREFIX}en-orion`,
  id: "en-orion",
  name: "Orion (neural)",
  lang: "en-GB",
};

export const PREMIUM_FR: PremiumVoice = {
  voiceURI: `${PREMIUM_VOICE_URI_PREFIX}fr-melotts`,
  id: "fr-melotts",
  name: "Henri (neural)",
  lang: "fr-FR",
};

const PREMIUM_VOICES: readonly PremiumVoice[] = [PREMIUM_EN, PREMIUM_FR];

export function isPremiumVoiceURI(voiceURI: string): boolean {
  return voiceURI.startsWith(PREMIUM_VOICE_URI_PREFIX);
}

export function isLegacyCloudVoiceURI(voiceURI: string): boolean {
  return voiceURI.startsWith(LEGACY_CLOUD_VOICE_URI_PREFIX);
}

/** Any non-system online voice URI we should not pass to speechSynthesis. */
export function isOnlineVoiceURI(voiceURI: string): boolean {
  return isPremiumVoiceURI(voiceURI) || isLegacyCloudVoiceURI(voiceURI);
}

export function premiumVoiceByURI(voiceURI: string): PremiumVoice | null {
  return PREMIUM_VOICES.find((voice) => voice.voiceURI === voiceURI) ?? null;
}

export function premiumVoicesForLang(lang: "en" | "fr"): PremiumVoice[] {
  return lang === "fr" ? [PREMIUM_FR] : [PREMIUM_EN];
}

function viteEnv(name: "VITE_TTS_URL" | "VITE_TTS_KEY"): string {
  try {
    const env = (import.meta as ImportMeta & { env?: ImportMetaEnv }).env;
    const raw = env?.[name];
    return typeof raw === "string" ? raw.trim() : "";
  } catch {
    return "";
  }
}

/** Build-time Workers TTS endpoint (empty ⇒ premium disabled). */
export function premiumTtsEndpoint(): string {
  return viteEnv("VITE_TTS_URL").replace(/\/$/, "");
}

export function premiumTtsConfigured(): boolean {
  return Boolean(premiumTtsEndpoint());
}

export function premiumTtsKey(): string {
  return viteEnv("VITE_TTS_KEY");
}

export type FetchPremiumAudioArgs = {
  text: string;
  voice: PremiumVoiceId;
  rate: number;
  signal?: AbortSignal;
};

/** Fetch one sentence of neural audio (real-time path). */
export async function fetchPremiumAudio(
  args: FetchPremiumAudioArgs,
): Promise<Blob> {
  const base = premiumTtsEndpoint();
  if (!base) throw new Error("Premium TTS is not configured");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "audio/mpeg",
  };
  const key = premiumTtsKey();
  if (key) headers["X-TTS-Key"] = key;

  const response = await fetch(`${base}/tts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      text: args.text,
      voice: args.voice,
      rate: args.rate,
    }),
    signal: args.signal,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `TTS HTTP ${response.status}`);
  }

  const blob = await response.blob();
  if (!blob.size) throw new Error("Empty TTS audio");
  return blob;
}
