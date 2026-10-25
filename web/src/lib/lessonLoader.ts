import type {
  IntentionsCurriculum,
  KasparovChessCurriculum,
  KasparovChessLocalOverlay,
  Lesson,
  LessonIndex,
  OpeningsRevisionCurriculum,
  OpeningsRevisionLocalOverlay,
  PerformanceElo,
} from "../types";
import type { Lang } from "./lang";
import { normalizeLessonIndex } from "./normalizeIndex";

export type PerformanceEloData = Record<string, PerformanceElo>;

const base = import.meta.env.BASE_URL;

let openingsRevisionCache: OpeningsRevisionCurriculum | null | undefined;
let kasparovChessCache: KasparovChessCurriculum | null | undefined;

function mergeOpeningsLocalOverlay(
  curriculum: OpeningsRevisionCurriculum,
  overlay: OpeningsRevisionLocalOverlay | null,
): OpeningsRevisionCurriculum {
  // Curriculum may already embed book excerpts (committed). Overlay only refreshes/overrides.
  if (!overlay?.modules) return curriculum;
  const modules = curriculum.modules.map((mod) => {
    const excerpt = overlay.modules[mod.id];
    if (!excerpt) return mod;
    const { basePositions: overlayQuizzes, ...bookExcerpt } = excerpt;
    return {
      ...mod,
      tagline: mod.tagline ?? (excerpt.subtitle
        ? { en: excerpt.subtitle, fr: excerpt.subtitle }
        : undefined),
      bookExcerpt: mod.bookExcerpt ?? bookExcerpt,
      basePositions:
        overlayQuizzes && overlayQuizzes.length > 0
          ? overlayQuizzes
          : mod.basePositions,
    };
  });
  const principles =
    overlay.principles && overlay.principles.length > 0
      ? [
          ...overlay.principles,
          ...curriculum.principles.filter(
            (p) => !overlay.principles!.some((op) => op.id === p.id),
          ),
        ]
      : curriculum.principles;
  return { ...curriculum, modules, principles };
}

export async function loadOpeningsRevision(): Promise<OpeningsRevisionCurriculum | null> {
  if (openingsRevisionCache !== undefined) return openingsRevisionCache;
  const [res, localRes] = await Promise.all([
    fetch(`${base}data/openings-revision.json`),
    fetch(`${base}data/openings-revision-local.json`),
  ]);
  if (!res.ok) {
    openingsRevisionCache = null;
    return null;
  }
  let curriculum = (await res.json()) as OpeningsRevisionCurriculum;
  let overlay: OpeningsRevisionLocalOverlay | null = null;
  if (localRes.ok) {
    try {
      overlay = (await localRes.json()) as OpeningsRevisionLocalOverlay;
    } catch {
      overlay = null;
    }
  }
  curriculum = mergeOpeningsLocalOverlay(curriculum, overlay);
  openingsRevisionCache = curriculum;
  return openingsRevisionCache;
}

function mergeKasparovLocalOverlay(
  curriculum: KasparovChessCurriculum,
  overlay: KasparovChessLocalOverlay | null,
): KasparovChessCurriculum {
  if (!overlay) return curriculum;
  const exercises = curriculum.exercises.map((ex) => {
    const extra = overlay.exercises?.[ex.id];
    if (!extra) return ex;
    return {
      ...ex,
      prompt: ex.prompt ?? extra.prompt,
      solution: ex.solution ?? extra.solution,
    };
  });
  const games = curriculum.games.map((game) => {
    const extra = overlay.games?.[String(game.id)];
    if (!extra?.intro) return game;
    return { ...game, intro: game.intro ?? extra.intro };
  });
  return { ...curriculum, exercises, games };
}

export async function loadKasparovChess(): Promise<KasparovChessCurriculum | null> {
  if (kasparovChessCache !== undefined) return kasparovChessCache;
  const [res, localRes] = await Promise.all([
    fetch(`${base}data/kasparov-chess.json`),
    fetch(`${base}data/kasparov-chess-local.json`),
  ]);
  if (!res.ok) {
    kasparovChessCache = null;
    return null;
  }
  let curriculum = (await res.json()) as KasparovChessCurriculum;
  let overlay: KasparovChessLocalOverlay | null = null;
  if (localRes.ok) {
    try {
      overlay = (await localRes.json()) as KasparovChessLocalOverlay;
    } catch {
      overlay = null;
    }
  }
  curriculum = mergeKasparovLocalOverlay(curriculum, overlay);
  kasparovChessCache = curriculum;
  return kasparovChessCache;
}

export async function loadIndex(): Promise<LessonIndex> {
  const [indexRes, intentionsRes, openingsRevision, kasparovChess] = await Promise.all([
    fetch(`${base}data/index.json`),
    fetch(`${base}data/intentions.json`),
    loadOpeningsRevision(),
    loadKasparovChess(),
  ]);
  if (!indexRes.ok) throw new Error("Failed to load lesson index");
  const raw = (await indexRes.json()) as Record<string, unknown>;
  let curriculum: IntentionsCurriculum | null = null;
  if (intentionsRes.ok) {
    curriculum = (await intentionsRes.json()) as IntentionsCurriculum;
  }
  return normalizeLessonIndex(raw, curriculum, openingsRevision, kasparovChess);
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
