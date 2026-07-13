import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeFullGamePerformance } from "../src/lib/performanceRating.ts";
import type { Lesson, LessonIndex, PerformanceElo } from "../src/types.ts";
import { analyzeFenNode, initStockfishNode, quitStockfishNode } from "./stockfishNode.ts";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(ROOT, "../public/data");
const LESSONS_DIR = path.join(DATA_DIR, "lessons");
const INDEX_PATH = path.join(DATA_DIR, "index.json");
const OUTPUT_PATH = path.join(DATA_DIR, "performance-elos.json");

function parseArgs(): { gameNum: number | null; bookId: string | null } {
  const args = process.argv.slice(2);
  let gameNum: number | null = null;
  let bookId: string | null = null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--game" && args[i + 1]) {
      gameNum = Number.parseInt(args[i + 1] ?? "", 10);
      i += 1;
    } else if (arg === "--book" && args[i + 1]) {
      bookId = args[i + 1] ?? null;
      i += 1;
    }
  }

  return { gameNum, bookId };
}

function lessonsForIndex(index: LessonIndex, bookId: string | null): LessonIndex["chernov"] {
  if (bookId) {
    const lessons = index[bookId as keyof LessonIndex];
    return Array.isArray(lessons) ? lessons : [];
  }
  return index.books.flatMap((book) => {
    const lessons = index[book.id as keyof LessonIndex];
    return Array.isArray(lessons) ? lessons : [];
  });
}

async function loadLesson(file: string): Promise<Lesson> {
  const raw = await fs.readFile(path.join(LESSONS_DIR, file), "utf8");
  return JSON.parse(raw) as Lesson;
}

function toPerformanceElo(
  whiteElo: number | null,
  blackElo: number | null,
  whiteAcpl: number | null,
  blackAcpl: number | null,
): PerformanceElo | null {
  if (whiteElo === null || blackElo === null) return null;
  return {
    white: whiteElo,
    black: blackElo,
    whiteAcpl: whiteAcpl === null ? undefined : Math.round(whiteAcpl),
    blackAcpl: blackAcpl === null ? undefined : Math.round(blackAcpl),
  };
}

async function stripCachedElosFromIndex(): Promise<void> {
  const indexRaw = await fs.readFile(INDEX_PATH, "utf8");
  const index = JSON.parse(indexRaw) as LessonIndex;
  let changed = false;

  for (const book of index.books) {
    const lessons = index[book.id as keyof LessonIndex];
    if (!Array.isArray(lessons)) continue;
    index[book.id] = lessons.map((entry) => {
      if (!entry.performanceElo) return entry;
      changed = true;
      const { performanceElo: _removed, ...rest } = entry;
      return rest;
    });
  }

  if (changed) {
    await fs.writeFile(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`, "utf8");
    console.log(`Removed cached performanceElo from ${INDEX_PATH}`);
  }
}

async function main(): Promise<void> {
  const { gameNum, bookId } = parseArgs();
  const indexRaw = await fs.readFile(INDEX_PATH, "utf8");
  const index = JSON.parse(indexRaw) as LessonIndex;
  const targets = lessonsForIndex(index, bookId).filter(
    (entry) => gameNum === null || entry.gameNum === gameNum,
  );

  if (targets.length === 0) {
    console.error(gameNum === null ? "No games found in index." : `Game ${gameNum} not found.`);
    process.exit(1);
  }

  console.log(`Computing performance Elo for ${targets.length} game(s) at depth 14…`);
  await initStockfishNode();

  const results: Record<string, PerformanceElo> = {};

  for (const summary of targets) {
    const started = Date.now();
    const lesson = await loadLesson(summary.file);
    const performance = await computeFullGamePerformance(lesson.nodes, analyzeFenNode);
    const performanceElo = toPerformanceElo(
      performance.white.elo,
      performance.black.elo,
      performance.white.acpl,
      performance.black.acpl,
    );

    if (!performanceElo) {
      console.warn(`Game ${summary.gameNum}: no Elo result`);
      continue;
    }

    results[summary.id] = performanceElo;

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log(
      `Game ${summary.gameNum}: W ${performanceElo.white} (${performance.white.acpl ?? "?"} ACPL) · B ${performanceElo.black} (${performance.black.acpl ?? "?"} ACPL) — ${elapsed}s`,
    );
  }

  await quitStockfishNode();

  let existing: Record<string, PerformanceElo> = {};
  try {
    existing = JSON.parse(await fs.readFile(OUTPUT_PATH, "utf8")) as Record<string, PerformanceElo>;
  } catch {
    existing = {};
  }

  const merged = { ...existing, ...results };
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_PATH}`);
  await stripCachedElosFromIndex();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
