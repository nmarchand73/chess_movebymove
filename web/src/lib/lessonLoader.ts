import type { IntentionsCurriculum, Lesson, LessonIndex, PerformanceElo } from "../types";
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

export async function loadLesson(file: string): Promise<Lesson> {
  const res = await fetch(`${base}data/lessons/${file}`);
  if (!res.ok) throw new Error(`Failed to load lesson ${file}`);
  return res.json();
}
