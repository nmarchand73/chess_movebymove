import type { Lang } from "./lang.ts";
import {
  isLegacyCloudVoiceURI,
  isOnlineVoiceURI,
  isPremiumVoiceURI,
  premiumTtsConfigured,
  premiumVoicesForLang,
} from "./premiumTts.ts";

const KEY = "move-by-move-listen";

export const LISTEN_RATE_MIN = 0.6;
export const LISTEN_RATE_MAX = 1.4;
export const LISTEN_RATE_DEFAULT = 1;

/**
 * Preferred Chrome locutor (EN). On iPhone / Safari without Google system voices,
 * Settings offers Workers AI neural voices when `VITE_TTS_URL` is configured.
 */
export const DEFAULT_VOICE_NAME = "Google UK English Male";
export const DEFAULT_VOICE_NAME_FR = "Google français";
export const SAFARI_PREFERRED_VOICE_NAME = "Daniel";
export const SAFARI_PREFERRED_VOICE_NAME_FR = "Thomas";

export type ListenSettings = {
  /** SpeechSynthesisVoice.voiceURI, premium:… URI, or empty for preferred default. */
  voiceURI: string;
  rate: number;
};

/** Unified picker row for Settings (system + optional real-time neural). */
export type ListenVoiceOption = {
  voiceURI: string;
  name: string;
  lang: string;
  kind: "system" | "premium";
  recommended: boolean;
  localService: boolean;
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

function isFrLocale(voice: SpeechSynthesisVoice): boolean {
  return /^fr(-|_|$)/i.test(voice.lang) || /fran[cç]ais|french/i.test(voice.name);
}

function matchesLang(voice: SpeechSynthesisVoice, lang: Lang): boolean {
  return lang === "fr" ? isFrLocale(voice) : /^en(-|_|$)/i.test(voice.lang);
}

/** Higher = better default locutor for chess commentary in `lang`. */
export function voicePreferenceScore(voice: SpeechSynthesisVoice, lang: Lang = "en"): number {
  const name = voice.name;
  let score = 0;

  if (lang === "fr") {
    if (/google\s+fran[cç]ais/i.test(name) && !/female|féminin|femme/i.test(name)) score += 1000;
    if (/google\s+fran[cç]ais/i.test(name)) score += 920;
    if (/^thomas\b/i.test(name) && /enhanced|premium|siri/i.test(name)) score += 900;
    if (/^thomas\b/i.test(name)) score += 860;
    if (/am[eé]lie/i.test(name) && /enhanced|premium|siri/i.test(name)) score += 820;
    if (/am[eé]lie/i.test(name)) score += 780;
    if (/audrey|marie|julie|virginie|claire/i.test(name)) score += 720;
    if (/^fr-FR/i.test(voice.lang)) score += 200;
    else if (/^fr(-|_|$)/i.test(voice.lang)) score += 140;
  } else {
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
    else if (/^en(-|_|$)/i.test(voice.lang)) score += 80;
  }

  // Prefer higher-quality / local neural voices when tagged.
  if (/enhanced|premium|neural|siri/i.test(name)) score += 40;
  if (voice.localService) score += 15;

  return score;
}

/** Best available voice for this browser and UI language. */
export function findPreferredDefaultVoice(
  voices: SpeechSynthesisVoice[],
  lang: Lang = "en",
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const voice of voices) {
    const score = voicePreferenceScore(voice, lang);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

/** Prefer saved voice when still installed, else best browser default for `lang`. */
export function resolveSpeechVoice(
  voiceURI: string,
  voices: SpeechSynthesisVoice[] = listSpeechVoices(),
  lang: Lang = "en",
): SpeechSynthesisVoice | null {
  if (isOnlineVoiceURI(voiceURI)) return null;
  if (voices.length === 0) return null;
  if (voiceURI) {
    const exact = voices.find((voice) => voice.voiceURI === voiceURI);
    if (exact) return exact;
  }

  const preferred = findPreferredDefaultVoice(voices, lang);
  if (preferred) return preferred;

  const matched = voices.find((voice) => matchesLang(voice, lang));
  return matched ?? voices[0] ?? null;
}

export function hasSystemGoogleVoice(voices: SpeechSynthesisVoice[], lang: Lang): boolean {
  if (lang === "fr") {
    return voices.some((voice) => /google\s+fran[cç]ais/i.test(voice.name));
  }
  return voices.some((voice) => /google\s+uk\s+english\s+male/i.test(voice.name));
}

/**
 * Lock in a usable default: empty, missing, or a retired online URI
 * (legacy cloud:google:…, or premium:… when Worker URL is unset).
 */
export function ensureDefaultVoiceSelected(
  settings: ListenSettings,
  voices: SpeechSynthesisVoice[],
  lang: Lang = "en",
): ListenSettings {
  const options = listenVoiceOptions(lang, voices);
  if (options.length === 0) return settings;

  const stillAvailable =
    Boolean(settings.voiceURI) &&
    !isLegacyCloudVoiceURI(settings.voiceURI) &&
    !(isPremiumVoiceURI(settings.voiceURI) && !premiumTtsConfigured()) &&
    options.some((option) => option.voiceURI === settings.voiceURI);

  if (stillAvailable) return settings;

  const preferred = options.find((option) => option.recommended) ?? options[0];
  if (!preferred) return settings;
  const next = { ...settings, voiceURI: preferred.voiceURI };
  saveListenSettings(next);
  return next;
}

export function formatVoiceLabel(voice: SpeechSynthesisVoice, lang: Lang = "en"): string {
  const locale = voice.lang.replace("_", "-");
  const quality = /enhanced|premium|neural|siri/i.test(voice.name)
    ? lang === "fr"
      ? " · haute qualité"
      : " · high quality"
    : voice.localService
      ? ""
      : lang === "fr"
        ? " · en ligne"
        : " · online";
  return `${voice.name} (${locale})${quality}`;
}

export function formatListenVoiceOption(option: ListenVoiceOption, lang: Lang = "en"): string {
  const locale = option.lang.replace("_", "-");
  if (option.kind === "premium") {
    return lang === "fr"
      ? `${option.name} (${locale}) · premium · temps réel`
      : `${option.name} (${locale}) · premium · real-time`;
  }
  const quality = /enhanced|premium|neural|siri/i.test(option.name)
    ? lang === "fr"
      ? " · haute qualité"
      : " · high quality"
    : option.localService
      ? ""
      : lang === "fr"
        ? " · en ligne"
        : " · online";
  return `${option.name} (${locale})${quality}`;
}

export function isPreferredDefaultVoice(voice: SpeechSynthesisVoice, lang: Lang = "en"): boolean {
  return voicePreferenceScore(voice, lang) >= (lang === "fr" ? 860 : 880);
}

/** Voices suitable for the current UI language (EN or FR), best first. */
export function speechVoicesForLang(
  lang: Lang,
  voices: SpeechSynthesisVoice[] = listSpeechVoices(),
): SpeechSynthesisVoice[] {
  const filtered = voices.filter((voice) => matchesLang(voice, lang));
  const list = filtered.length > 0 ? filtered : voices;
  return [...list].sort((a, b) => {
    const scoreDiff = voicePreferenceScore(b, lang) - voicePreferenceScore(a, lang);
    if (scoreDiff !== 0) return scoreDiff;
    return a.name.localeCompare(b.name);
  });
}

/**
 * System voices for `lang`, plus real-time neural premium voices when the
 * Cloudflare Worker URL is configured (`VITE_TTS_URL`).
 */
export function listenVoiceOptions(
  lang: Lang,
  voices: SpeechSynthesisVoice[] = listSpeechVoices(),
): ListenVoiceOption[] {
  const system = speechVoicesForLang(lang, voices).map((voice) => ({
    voiceURI: voice.voiceURI,
    name: voice.name,
    lang: voice.lang,
    kind: "system" as const,
    recommended: isPreferredDefaultVoice(voice, lang),
    localService: voice.localService,
  }));

  if (!premiumTtsConfigured()) {
    return system;
  }

  const preferPremium =
    isAppleMobileWeb() || !hasSystemGoogleVoice(voices, lang);

  const premium = premiumVoicesForLang(lang).map((voice) => ({
    voiceURI: voice.voiceURI,
    name: voice.name,
    lang: voice.lang,
    kind: "premium" as const,
    recommended: preferPremium,
    localService: false,
  }));

  if (!preferPremium) {
    return [...system, ...premium.map((option) => ({ ...option, recommended: false }))];
  }

  return [
    ...premium,
    ...system.map((option) => ({ ...option, recommended: false })),
  ];
}

export function resolveListenVoiceOption(
  voiceURI: string,
  lang: Lang,
  voices: SpeechSynthesisVoice[] = listSpeechVoices(),
): ListenVoiceOption | null {
  const options = listenVoiceOptions(lang, voices);
  if (voiceURI && !isLegacyCloudVoiceURI(voiceURI)) {
    const exact = options.find((option) => option.voiceURI === voiceURI);
    if (exact) return exact;
  }
  return options.find((option) => option.recommended) ?? options[0] ?? null;
}

export { isOnlineVoiceURI, isPremiumVoiceURI };

/** @deprecated Use speechVoicesForLang("en") */
export function englishSpeechVoices(
  voices: SpeechSynthesisVoice[] = listSpeechVoices(),
): SpeechSynthesisVoice[] {
  return speechVoicesForLang("en", voices);
}

/**
 * iPhone / iPad browsers all use WebKit for speechSynthesis — including Chrome.
 * Apple Premium / Enhanced packs are for system Spoken Content and are not exposed
 * to the Web Speech API (and downloading them can even hide compact voices).
 */
export function isAppleMobileWeb(
  userAgent: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && /Mobile/i.test(userAgent));
}

/** Short tip when the preferred cloud voice is missing (Safari / iOS WebKit). */
export function listenVoicePlatformTip(
  voices: SpeechSynthesisVoice[],
  lang: Lang = "en",
  userAgent?: string,
): string | null {
  if (premiumTtsConfigured()) {
    if (isAppleMobileWeb(userAgent)) {
      return lang === "fr"
        ? "Voix neuronale en temps réel (Workers AI). Nécessite le réseau — désactivez le mode silencieux. Les voix système restent disponibles hors ligne."
        : "Real-time neural voice (Workers AI). Needs network — turn Silent Mode off. System voices remain available offline.";
    }
    if (!hasSystemGoogleVoice(voices, lang)) {
      return lang === "fr"
        ? "Voix neuronale en temps réel disponible (réseau requis). Les voix Apple Enhanced restent optionnelles via Réglages système."
        : "Real-time neural voice available (needs network). Apple Enhanced voices remain optional via System Settings.";
    }
    return null;
  }

  if (isAppleMobileWeb(userAgent)) {
    if (lang === "fr") {
      return "Sur iPhone, Safari et Chrome partagent WebKit. Sans serveur TTS configuré, seules les voix compactes système sont disponibles — désactivez le mode silencieux.";
    }
    return "On iPhone, Safari and Chrome share WebKit. Without a TTS Worker configured, only compact system voices are available — turn Silent Mode off.";
  }

  if (lang === "fr") {
    if (hasSystemGoogleVoice(voices, "fr")) return null;
    return "Safari ne peut pas utiliser les voix Google. Choisissez Thomas ou Amélie — téléchargez la version Enhanced dans Réglages système → Accessibilité → Contenu énoncé pour une meilleure qualité.";
  }

  if (hasSystemGoogleVoice(voices, "en")) return null;
  return "Safari cannot use Google voices. Pick Daniel or Arthur — download the Enhanced version in macOS System Settings → Accessibility → Spoken Content for better quality.";
}

export function listenPreviewLine(lang: Lang): string {
  if (lang === "fr") {
    return "Les Blancs ancrent un pion au centre. Leur prochain coup sera cavalier en f trois.";
  }
  return "White anchors a pawn in the centre. His next move will be knight to f three.";
}
