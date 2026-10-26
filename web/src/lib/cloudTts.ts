/**
 * Online Google TTS fallback for browsers that lack Google system voices
 * (iPhone Safari/Chrome, desktop Safari). Uses the same translate_tts endpoint
 * Chrome's "Google …" SpeechSynthesis voices are backed by — no API key.
 *
 * Unofficial; keep chunks short. Prefer system SpeechSynthesis when available.
 */

export const CLOUD_VOICE_URI_PREFIX = "cloud:google:";

export type CloudGoogleVoice = {
  voiceURI: string;
  name: string;
  lang: string;
  /** translate_tts `tl` parameter */
  tl: string;
};

export const CLOUD_GOOGLE_EN: CloudGoogleVoice = {
  voiceURI: `${CLOUD_VOICE_URI_PREFIX}en-GB`,
  name: "Google UK English Male",
  lang: "en-GB",
  tl: "en-GB",
};

export const CLOUD_GOOGLE_FR: CloudGoogleVoice = {
  voiceURI: `${CLOUD_VOICE_URI_PREFIX}fr-FR`,
  name: "Google français",
  lang: "fr-FR",
  tl: "fr",
};

const CLOUD_VOICES: readonly CloudGoogleVoice[] = [CLOUD_GOOGLE_EN, CLOUD_GOOGLE_FR];

/** Soft limit for translate_tts query length (bytes/chars). */
export const CLOUD_TTS_MAX_CHARS = 180;

export function isCloudVoiceURI(voiceURI: string): boolean {
  return voiceURI.startsWith(CLOUD_VOICE_URI_PREFIX);
}

export function cloudVoiceByURI(voiceURI: string): CloudGoogleVoice | null {
  return CLOUD_VOICES.find((voice) => voice.voiceURI === voiceURI) ?? null;
}

export function cloudVoicesForLang(lang: "en" | "fr"): CloudGoogleVoice[] {
  return lang === "fr" ? [CLOUD_GOOGLE_FR] : [CLOUD_GOOGLE_EN];
}

export function buildGoogleTtsUrl(text: string, tl: string): string {
  const params = new URLSearchParams({
    ie: "UTF-8",
    client: "tw-ob",
    q: text,
    tl,
  });
  return `https://translate.google.com/translate_tts?${params.toString()}`;
}

/** Split long sentences so each chunk fits translate_tts. */
export function chunkForCloudTts(
  text: string,
  maxChars: number = CLOUD_TTS_MAX_CHARS,
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChars) return [trimmed];

  const chunks: string[] = [];
  let remaining = trimmed;

  while (remaining.length > maxChars) {
    const slice = remaining.slice(0, maxChars);
    const cuts: number[] = [];
    const dot = slice.lastIndexOf(". ");
    if (dot >= 0) cuts.push(dot + 1);
    const semi = slice.lastIndexOf("; ");
    if (semi >= 0) cuts.push(semi + 1);
    const comma = slice.lastIndexOf(", ");
    if (comma >= 0) cuts.push(comma + 1);
    const space = slice.lastIndexOf(" ");
    if (space >= 0) cuts.push(space);

    let cut = cuts.length > 0 ? Math.max(...cuts) : maxChars;
    if (cut < maxChars * 0.35) cut = maxChars;
    const piece = remaining.slice(0, cut).trim();
    if (piece) chunks.push(piece);
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}
