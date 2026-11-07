#!/usr/bin/env node
/**
 * Merge literary FR batch translations into fr-literary.json for the tactics build.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const batchDir = join(root, "docs/tactics/extract/winning-chess/fr-batches");
const outPath = join(root, "docs/tactics/extract/winning-chess/fr-literary.json");

const captionsByEn = {};
const captionsById = {};
const chaptersByTitle = {};

for (const name of readdirSync(batchDir).sort()) {
  if (!name.endsWith(".fr.json")) continue;
  const data = JSON.parse(readFileSync(join(batchDir, name), "utf8"));
  for (const t of data.translations || []) {
    if (t.captionFr && (t.captionEn || t.id)) {
      if (t.captionEn) captionsByEn[t.captionEn] = t.captionFr;
      if (t.id) captionsById[t.id] = t.captionFr;
    }
    if (t.textFr && t.title) {
      chaptersByTitle[t.title] = {
        titleFr: t.titleFr || t.title,
        textFr: t.textFr,
      };
    }
  }
}

const payload = {
  id: "winning-chess-fr-literary",
  captionsById,
  captionsByEn,
  chaptersByTitle,
  stats: {
    captionsById: Object.keys(captionsById).length,
    captionsByEn: Object.keys(captionsByEn).length,
    chapters: Object.keys(chaptersByTitle).length,
  },
};

writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${outPath}`);
console.log(payload.stats);
