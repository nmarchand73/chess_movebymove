const KEY = "move-by-move-listen";

export const LISTEN_RATE_MIN = 0.6;
export const LISTEN_RATE_MAX = 1.4;
export const LISTEN_RATE_DEFAULT = 1;

/**
 * Preferred Chrome locutor. Not available in Safari — Apple voices are used instead
 * (Daniel Enhanced is the closest British male quality on macOS).
 */
export const DEFAULT_VOICE_NAME = "Google UK English Male";
export const SAFARI_PREFERRED_VOICE_NAME = "Daniel";

export type ListenSettings = {
  /** SpeechSynthesisVoice.voiceURI, or empty for preferred default. */
  voiceURI: string;
  rate: number;
};

function clampRate(rate: number): number {
  if (!Number.isFinite(rate)) return LISTEN_RATE_DEFAULT;
  return Math.min(LISTEN_RATE_MAX, Math.max(LISTEN_RATE_MIN, Math.round(rate * 100) / 100));
}

export function defaultListenSettings(): ListenSettings {
  return { voiceURI: "", rate: LISTEN_RATE_DEFAULT };
}

export function loadListenSettings(): ListenSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultListenSettings();
    const parsed = JSON.parse(raw) as Partial<ListenSettings>;
    return {
      voiceURI: typeof parsed.voiceURI === "string" ? parsed.voiceURI : "",
      rate: clampRate(typeof parsed.rate === "number" ? parsed.rate : LISTEN_RATE_DEFAULT),
    };
  } catch {
    return defaultListenSettings();
  }
}

export function saveListenSettings(settings: ListenSettings): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    KEY,
    JSON.stringify({
      voiceURI: settings.voiceURI,
      rate: clampRate(settings.rate),
    }),
  );
}

export function listSpeechVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices();
}

function isEnGb(voice: SpeechSynthesisVoice): boolean {
  return /^en-GB/i.test(voice.lang) || /british|uk english/i.test(voice.name);
}

/** Higher = better default locutor for chess commentary. */
export function voicePreferenceScore(voice: SpeechSynthesisVoice): number {
  const name = voice.name;
  let score = 0;

  if (/google\s+uk\s+english\s+male/i.test(name)) score += 1000;
  // Safari / macOS: Enhanced/Premium Daniel is the best British male stand-in.
  if (/^daniel\b/i.test(name) && /enhanced|premium|siri/i.test(name)) score += 920;
  if (/^daniel\b/i.test(name)) score += 880;
  if (/arthur/i.test(name) && /enhanced|premium/i.test(name)) score += 860;
  if (/arthur/i.test(name)) score += 820;
  if (/thomas|george|rishi|oliver|jamie/i.test(name)) score += 760;
  if (/google\s+uk\s+english\s+female/i.test(name)) score += 700;
  if (/serena|martha|kate/i.test(name)) score += 650;

  if (isEnGb(voice)) score += 200;
  else if (/^en(-|$)/i.test(voice.lang)) score += 80;

  // Prefer higher-quality / local neural voices when tagged.
  if (/enhanced|premium|neural|siri/i.test(name)) score += 40;
  if (voice.localService) score += 15;

  return score;
}

/** Best available British male voice for this browser. */
export function findPreferredDefaultVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const voice of voices) {
    const score = voicePreferenceScore(voice);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

/** Prefer saved voice when still installed, else best browser default. */
export function resolveSpeechVoice(
  voiceURI: string,
  voices: SpeechSynthesisVoice[] = listSpeechVoices(),
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  if (voiceURI) {
    const exact = voices.find((voice) => voice.voiceURI === voiceURI);
    if (exact) return exact;
  }

  const preferred = findPreferredDefaultVoice(voices);
  if (preferred) return preferred;

  const en = voices.find((voice) => /^en(-|$)/i.test(voice.lang));
  return en ?? voices[0] ?? null;
}

/**
 * Lock in a usable default: empty, or a Chrome-only voiceURI missing on Safari.
 */
export function ensureDefaultVoiceSelected(
  settings: ListenSettings,
  voices: SpeechSynthesisVoice[],
): ListenSettings {
  if (voices.length === 0) return settings;

  const stillAvailable =
    Boolean(settings.voiceURI) &&
    voices.some((voice) => voice.voiceURI === settings.voiceURI);

  if (stillAvailable) return settings;

  const preferred = findPreferredDefaultVoice(voices);
  if (!preferred) return settings;
  const next = { ...settings, voiceURI: preferred.voiceURI };
  saveListenSettings(next);
  return next;
}

export function formatVoiceLabel(voice: SpeechSynthesisVoice): string {
  const lang = voice.lang.replace("_", "-");
  const quality = /enhanced|premium|neural|siri/i.test(voice.name)
    ? " · high quality"
    : voice.localService
      ? ""
      : " · online";
  return `${voice.name} (${lang})${quality}`;
}

export function isPreferredDefaultVoice(voice: SpeechSynthesisVoice): boolean {
  return voicePreferenceScore(voice) >= 880;
}

export function englishSpeechVoices(
  voices: SpeechSynthesisVoice[] = listSpeechVoices(),
): SpeechSynthesisVoice[] {
  const english = voices.filter((voice) => /^en(-|$)/i.test(voice.lang));
  const list = english.length > 0 ? english : voices;
  return [...list].sort((a, b) => {
    const scoreDiff = voicePreferenceScore(b) - voicePreferenceScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    return a.name.localeCompare(b.name);
  });
}

/** Short tip when Google's Chrome voice is missing (typical on Safari). */
export function listenVoicePlatformTip(voices: SpeechSynthesisVoice[]): string | null {
  const hasGoogleMale = voices.some((voice) =>
    /google\s+uk\s+english\s+male/i.test(voice.name),
  );
  if (hasGoogleMale) return null;

  const hasDaniel = voices.some((voice) => /^daniel\b/i.test(voice.name));
  if (hasDaniel) {
    return "Safari cannot use Google voices. Daniel (British) is selected instead — download Daniel Enhanced in macOS System Settings → Accessibility → Spoken Content for the best quality.";
  }

  return "Safari cannot use Google voices. Pick a British voice such as Daniel or Arthur, and install the Enhanced version in macOS System Settings → Accessibility → Spoken Content.";
}
