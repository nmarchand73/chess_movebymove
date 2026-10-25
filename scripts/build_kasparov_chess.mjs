#!/usr/bin/env node
/**
 * Build Kasparov Chess curriculum JSON from docs/site/assets/data.js.
 *
 * Committed file: FENs, expected moves, short tasks/cues, metadata — no verbatim book prose.
 * Local overlay (gitignored): full prompt/solution/intro text for personal study.
 *
 * Usage: node scripts/build_kasparov_chess.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const siteDataPath = join(root, "docs/site/assets/data.js");

function loadSiteData() {
  const raw = readFileSync(siteDataPath, "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(raw, sandbox);
  if (!sandbox.window.KC_DATA) {
    throw new Error("KC_DATA not found in docs/site/assets/data.js");
  }
  return sandbox.window.KC_DATA;
}

function sideLabel(side, lang) {
  if (lang === "fr") return side === "white" ? "Blancs" : "Noirs";
  return side === "white" ? "White" : "Black";
}

function taskFor(ex) {
  const n = ex.move_number;
  const fr =
    typeof ex.task_fr === "string" && ex.task_fr.trim()
      ? ex.task_fr.trim()
      : `Trouvez le coup des ${sideLabel(ex.side_to_move, "fr")} (${n}.?).`;
  const en = `Find ${sideLabel(ex.side_to_move, "en")}'s move (${n}.?).`;
  return { en, fr };
}

function cueFor(ex) {
  const sideFr = sideLabel(ex.side_to_move, "fr");
  const sideEn = sideLabel(ex.side_to_move, "en");
  return {
    en: `Game ${ex.game} · study ${ex.study} · ${sideEn} to move · level ${ex.recommended_level}`,
    fr: `Partie ${ex.game} · étude ${ex.study} · trait aux ${sideFr} · niveau ${ex.recommended_level}`,
  };
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main() {
  const data = loadSiteData();
  const exercises = data.exercises;
  if (!Array.isArray(exercises) || exercises.length !== 64) {
    throw new Error(`Expected 64 exercises, got ${exercises?.length ?? 0}`);
  }

  const games = Object.keys(data.games)
    .map(Number)
    .sort((a, b) => a - b)
    .map((id) => {
      const g = data.games[String(id)];
      return {
        id,
        white: g.white,
        black: g.black,
        event: g.event,
        date: g.date,
        opening: { en: g.opening_en || g.opening_fr, fr: g.opening_fr || g.opening_en },
        result: g.result,
        gameIds: [],
      };
    });

  const curriculum = {
    id: "kasparov-chess",
    title: {
      en: "Kasparov Chess — 64 study positions",
      fr: "Kasparov Chess — 64 positions d’étude",
    },
    author: {
      en: "Method inspired by Saitek / Elliott Winslow (1988)",
      fr: "Méthode inspirée de Saitek / Elliott Winslow (1988)",
    },
    publisher: {
      en: "Curriculum · interactive study",
      fr: "Parcours · étude interactive",
    },
    methodNote: {
      en:
        "Play through each classic until a study position. Find the book move. Site scoring: 3 points first try, 2 second, 1 later, 0 if you reveal. Original Saitek ranks used letter bands A–G1 without numeric points.",
      fr:
        "Rejouez chaque classique jusqu’à une position d’étude. Trouvez le coup du livre. Barème du site : 3 points au premier essai, 2 au second, 1 ensuite, 0 si vous affichez. Le Saitek d’origine notait en bandes A–G1 sans points chiffrés.",
    },
    games,
    exercises: exercises.map((ex) => ({
      id: String(ex.id).padStart(2, "0"),
      game: ex.game,
      study: ex.study,
      gameTitle: ex.game_title,
      fen: ex.fen,
      boardOrientation: ex.board_orientation === "black" ? "black" : "white",
      sideToMove: ex.side_to_move === "black" ? "black" : "white",
      moveNumber: ex.move_number,
      expectedSan: ex.expected_move_san,
      expectedUci: ex.expected_move_uci,
      recommendedLevel: ex.recommended_level,
      task: taskFor(ex),
      cue: cueFor(ex),
      legal: Array.isArray(ex.legal) ? ex.legal : [],
      stockfish: ex.stockfish
        ? {
            bookMoveEval: ex.stockfish.book_move_eval ?? null,
            bookMoveRankInTop3: ex.stockfish.book_move_rank_in_top3 ?? null,
          }
        : undefined,
    })),
  };

  const localOverlay = {
    id: "kasparov-chess-local",
    games: Object.fromEntries(
      Object.entries(data.games).map(([id, g]) => [
        id,
        {
          intro: {
            fr: Array.isArray(g.intro_fr) ? g.intro_fr.join("\n\n") : g.intro_fr || "",
            en: Array.isArray(g.intro_en) ? g.intro_en.join("\n\n") : g.intro_en || "",
          },
        },
      ]),
    ),
    exercises: Object.fromEntries(
      exercises.map((ex) => [
        String(ex.id).padStart(2, "0"),
        {
          prompt: {
            fr: ex.prompt_fr || "",
            en: ex.prompt_en || "",
          },
          solution: {
            fr: ex.solution_fr || "",
            en: ex.solution_en || "",
          },
        },
      ]),
    ),
  };

  const committedPath = join(root, "data/kasparov-chess.json");
  const localPath = join(root, "data/kasparov-chess-local.json");
  const publicDir = join(root, "web/public/data");
  writeJson(committedPath, curriculum);
  writeJson(localPath, localOverlay);
  mkdirSync(publicDir, { recursive: true });
  copyFileSync(committedPath, join(publicDir, "kasparov-chess.json"));
  copyFileSync(localPath, join(publicDir, "kasparov-chess-local.json"));

  const hasLocalPublic = existsSync(join(publicDir, "kasparov-chess-local.json"));
  console.log(
    `Wrote ${curriculum.exercises.length} exercises → data/kasparov-chess.json (+ public mirror)`,
  );
  console.log(
    `Wrote local overlay → data/kasparov-chess-local.json${hasLocalPublic ? " (+ public, gitignored)" : ""}`,
  );
}

main();
