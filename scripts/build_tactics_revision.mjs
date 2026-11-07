#!/usr/bin/env node
/**
 * Build tactics-revision curriculum JSON from the hybrid seed.
 *
 * Committed: FENs, expected moves, short tasks/cues — no verbatim book prose.
 * Local overlay (gitignored): optional longer prompt/solution text.
 *
 * Usage: node scripts/build_tactics_revision.mjs
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Chess } from "../web/node_modules/chess.js/dist/esm/chess.js";
import { MODULES, SECTIONS } from "./tactics_curriculum_seed.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sanToFr(san) {
  return san
    .replace(/N/g, "C")
    .replace(/B/g, "F")
    .replace(/R/g, "T")
    .replace(/Q/g, "D")
    .replace(/K/g, "R");
}

function legalFor(fen, expectedSan) {
  const chess = new Chess(fen);
  let played;
  try {
    played = chess.move(expectedSan);
  } catch {
    played = null;
  }
  if (!played) {
    throw new Error(`Illegal ${expectedSan} from ${fen}`);
  }
  const uci = `${played.from}${played.to}${played.promotion ?? ""}`;
  return {
    expectedSan: played.san,
    expectedUci: uci,
    legal: [[uci, played.san, sanToFr(played.san)]],
    sideToMove: fen.includes(" b ") ? "black" : "white",
    boardOrientation: fen.includes(" b ") ? "black" : "white",
  };
}

function assertLine(fen, sans) {
  const chess = new Chess(fen);
  for (const san of sans) {
    try {
      chess.move(san);
    } catch {
      throw new Error(`Illegal line move ${san} from ${fen}`);
    }
  }
}

function main() {
  const exercises = [];
  const modules = [];
  const localExercises = {};

  for (const mod of MODULES) {
    const exerciseIds = [];
    for (const example of mod.examples) {
      assertLine(example.fen, example.sans);
    }
    for (const q of mod.quizzes) {
      const resolved = legalFor(q.fen, q.expectedSan);
      const id = q.id;
      exerciseIds.push(id);
      exercises.push({
        id,
        moduleId: mod.id,
        fen: q.fen,
        boardOrientation: resolved.boardOrientation,
        sideToMove: resolved.sideToMove,
        expectedSan: resolved.expectedSan,
        expectedUci: resolved.expectedUci,
        task: q.task,
        cue: q.cue,
        legal: resolved.legal,
        source: mod.sources[0] ?? { book: "winning-chess", ref: "?" },
        role: "quiz",
      });
      localExercises[id] = {
        prompt: q.task,
        solution: {
          en: `The key move is ${resolved.expectedSan}.`,
          fr: `Le coup clé est ${resolved.expectedSan}.`,
        },
      };
    }
    modules.push({
      id: mod.id,
      names: mod.names,
      plan: mod.plan,
      themes: {
        en: mod.sources.map((s) => `${s.book} ${s.ref}`),
        fr: mod.sources.map((s) => `${s.book} ${s.ref}`),
      },
      sources: mod.sources,
      examples: mod.examples,
      exerciseIds,
    });
  }

  const sections = SECTIONS.map((s, i) => ({
    id: s.id,
    title: s.title,
    refs: s.moduleIds.map((_, j) => i * 10 + j + 1),
    moduleIds: s.moduleIds,
  }));

  const curriculum = {
    id: "tactics-revision",
    title: {
      en: "Tactics Revision — Winning Chess × Predator",
      fr: "Révision tactiques — Winning Chess × Predator",
    },
    author: {
      en: "Hybrid curriculum (Chernev/Reinfeld + Farnsworth method)",
      fr: "Curriculum hybride (méthode Chernev/Reinfeld + Farnsworth)",
    },
    publisher: {
      en: "Curriculum · interactive study",
      fr: "Parcours · étude interactive",
    },
    methodNote: {
      en: "Coach explains each motif with worked examples, then you revise on the board. Scoring 3·2·1·0 like Kasparov Chess.",
      fr: "Le coach explique chaque motif avec des exemples, puis vous révisez sur l’échiquier. Barème 3·2·1·0 comme Kasparov Chess.",
    },
    sections,
    modules,
    exercises,
  };

  const localOverlay = {
    id: "tactics-revision-local",
    modules: {},
    exercises: localExercises,
  };

  const committedPath = join(root, "data/tactics-revision.json");
  const localPath = join(root, "data/tactics-revision-local.json");
  const publicDir = join(root, "web/public/data");
  writeJson(committedPath, curriculum);
  writeJson(localPath, localOverlay);
  mkdirSync(publicDir, { recursive: true });
  copyFileSync(committedPath, join(publicDir, "tactics-revision.json"));
  copyFileSync(localPath, join(publicDir, "tactics-revision-local.json"));

  console.log(
    `Wrote ${modules.length} modules / ${exercises.length} exercises → data/tactics-revision.json`,
  );
  console.log(
    `Wrote local overlay → data/tactics-revision-local.json${existsSync(join(publicDir, "tactics-revision-local.json")) ? " (+ public)" : ""}`,
  );
}

main();
