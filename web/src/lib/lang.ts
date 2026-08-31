export type Lang = "en" | "fr";

const KEY = "move-by-move-lang";

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "fr";
}

export function loadLang(): Lang {
  try {
    const raw = localStorage.getItem(KEY);
    if (isLang(raw)) return raw;
  } catch {
    /* ignore */
  }
  if (typeof navigator !== "undefined" && /^fr\b/i.test(navigator.language)) return "fr";
  return "en";
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* ignore */
  }
}
