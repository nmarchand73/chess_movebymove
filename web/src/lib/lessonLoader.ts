import type { Lesson, LessonIndex, PerformanceElo } from "../types";
import { normalizeLessonIndex } from "./normalizeIndex";

export type PerformanceEloData = Record<string, PerformanceElo>;

const base = import.meta.env.BASE_URL;

export async function loadIndex(): Promise<LessonIndex> {
  const res = await fetch(`${base}data/index.json`);
  if (!res.ok) throw new Error("Failed to load lesson index");
  const raw = (await res.json()) as Record<string, unknown>;
  return normalizeLessonIndex(raw);
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
