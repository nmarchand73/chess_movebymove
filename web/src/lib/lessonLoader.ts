import type { IntentionsCurriculum, Lesson, LessonIndex, PerformanceElo } from "../types";
import type { Lang } from "./lang";
import { normalizeLessonIndex } from "./normalizeIndex";

export type PerformanceEloData = Record<string, PerformanceElo>;

const base = import.meta.env.BASE_URL;

export async function loadIndex(): Promise<LessonIndex> {
  const [indexRes, intentionsRes] = await Promise.all([
    fetch(`${base}data/index.json`),
    fetch(`${base}data/intentions.json`),
  ]);
  if (!indexRes.ok) throw new Error("Failed to load lesson index");
  const raw = (await indexRes.json()) as Record<string, unknown>;
  let curriculum: IntentionsCurriculum | null = null;
  if (intentionsRes.ok) {
    curriculum = (await intentionsRes.json()) as IntentionsCurriculum;
  }
  return normalizeLessonIndex(raw, curriculum);
}

export async function loadPerformanceElos(): Promise<PerformanceEloData> {
  const res = await fetch(`${base}data/performance-elos.json`);
  if (!res.ok) throw new Error("Failed to load performance Elo data");
  return res.json();
}

/** Lesson commentary JSON lives under `data/{lang}/lessons/`. Falls back to English. */
export async function loadLesson(file: string, lang: Lang = "en"): Promise<Lesson> {
  const primary = await fetch(`${base}data/${lang}/lessons/${file}`);
  if (primary.ok) return primary.json();

  if (lang !== "en") {
    const fallback = await fetch(`${base}data/en/lessons/${file}`);
    if (fallback.ok) return fallback.json();
  }

  throw new Error(`Failed to load lesson ${file}`);
}
