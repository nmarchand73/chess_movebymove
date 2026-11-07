#!/usr/bin/env node
/**
 * Rebuild tactics-revision curriculum from Winning Chess extract (+ optional Predator).
 * Public JSON: FENs + short cues. Local overlay: book captions / chapter excerpts.
 *
 * Usage: node scripts/build_tactics_from_extract.mjs
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Chess } from "../web/node_modules/chess.js/dist/esm/chess.js";
import { frenchOrOriginal, toFrenchChessProse } from "./lib/winningChessFr.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wcManifestPath = join(root, "docs/tactics/extract/winning-chess/manifest.json");
const wcChaptersPath = join(root, "docs/tactics/extract/winning-chess/chapters.json");
const wcLiteraryFrPath = join(root, "docs/tactics/extract/winning-chess/fr-literary.json");

function loadLiteraryFr() {
  if (!existsSync(wcLiteraryFrPath)) return null;
  try {
    return JSON.parse(readFileSync(wcLiteraryFrPath, "utf8"));
  } catch {
    return null;
  }
}

function captionFr(caption, id, literary) {
  if (!caption) return "";
  if (literary?.captionsById?.[id]) return literary.captionsById[id];
  if (literary?.captionsByEn?.[caption]) return literary.captionsByEn[caption];
  return toFrenchChessProse(caption);
}

function chapterExcerptFr(title, englishBody, literary) {
  const hit = literary?.chaptersByTitle?.[title];
  if (hit?.textFr) return hit.textFr.slice(0, 16000);
  const joined = englishBody.slice(0, 16000);
  const fr = frenchOrOriginal(joined);
  return fr === joined
    ? `〔Texte original anglais — traduction littéraire en cours〕\n\n${joined}`
    : fr;
}
/** More specific patterns first — every fen_ok diagram must land in a motif. */
const MOTIF_MAP = [
  { id: "discovered-check", match: /discovered check/i },
  { id: "discovered-attack", match: /discovered attack/i },
  { id: "double-check", match: /double check/i },
  { id: "knight-fork", match: /knight fork|fork and the pin|breaking a knight fork/i },
  { id: "double-attack", match: /double attack/i },
  { id: "pin", match: /breaking a pin|\bpin/i },
  { id: "skewer", match: /skewer/i },
  { id: "no-retreat", match: /no retreat|flight.?square|cul-de-sac/i },
  { id: "overworked", match: /overworked/i },
  { id: "removing-the-guard", match: /removing the guard/i },
  { id: "breaking-communication", match: /breaking communication/i },
  { id: "defensive-play", match: /defensive play|defense to|declining a sacrifice/i },
  { id: "queening", match: /queening/i },
  { id: "vulnerable-first-rank", match: /vulnerable first rank|back.?rank/i },
  { id: "combined-operations", match: /combined operations|analyzing/i },
  { id: "attack-counterattack", match: /attack and counterattack/i },
  { id: "dont-grab", match: /don[’']?\s*t grab/i },
  { id: "design-for-checkmate", match: /mating pattern|skeleton pattern|designs? for checkmate|checkmate|\bmate\b/i },
  { id: "introduction", match: /^introduction$/i },
  { id: "misc-tactics", match: /tactical play|basic patterns for tactical/i },
];

const MOTIF_NAMES = {
  introduction: { en: "Introduction", fr: "Introduction" },
  "misc-tactics": { en: "Basic tactical patterns", fr: "Motifs tactiques de base" },
  pin: { en: "The pin", fr: "Le clouage" },
  "knight-fork": { en: "The knight fork", fr: "La fourchette de cavalier" },
  "double-attack": { en: "Double attack", fr: "L’attaque double" },
  "discovered-attack": { en: "Discovered attack", fr: "L’attaque à découverte" },
  "discovered-check": { en: "Discovered check", fr: "L’échec à découverte" },
  "double-check": { en: "Double check", fr: "Le double échec" },
  overworked: { en: "The overworked piece", fr: "La pièce surchargée" },
  "removing-the-guard": { en: "Removing the guard", fr: "Éliminer le défenseur" },
  "no-retreat": { en: "No retreat", fr: "Sans retraite" },
  skewer: { en: "The skewer", fr: "L’enfilade" },
  queening: { en: "Queening combinations", fr: "Combinaisons de promotion" },
  "vulnerable-first-rank": { en: "Vulnerable first rank", fr: "Le premier rang vulnérable" },
  "breaking-communication": { en: "Breaking communication", fr: "Couper la communication" },
  "combined-operations": { en: "Combined operations", fr: "Opérations combinées" },
  "design-for-checkmate": { en: "Mating patterns", fr: "Mats modèles" },
  "defensive-play": { en: "Defensive play", fr: "Le jeu défensif" },
  "dont-grab": { en: "Don’t grab!", fr: "Ne prenez pas tout !" },
  "attack-counterattack": { en: "Attack and counterattack", fr: "Attaque et contre-attaque" },
};

const MOTIF_PLANS = {
  introduction: {
    en: "Warm-up diagrams that introduce Winning Chess tactical thinking.",
    fr: "Diagrammes d’échauffement qui introduisent le raisonnement tactique de Winning Chess.",
  },
  "misc-tactics": {
    en: "Core patterns before diving into each motif in depth.",
    fr: "Motifs de base avant d’approfondir chaque thème.",
  },
  pin: {
    en: "Line up king and piece, then pile on the pinned unit.",
    fr: "Alignez roi et pièce, puis renforcez la pression sur l’unité clouée.",
  },
  "knight-fork": {
    en: "Force two targets onto knight-check geometry.",
    fr: "Forcez deux cibles sur la géométrie de fourchette du cavalier.",
  },
  "double-attack": {
    en: "One move, two threats — often mate plus material.",
    fr: "Un coup, deux menaces — souvent mat plus matériel.",
  },
  "discovered-attack": {
    en: "Move the masking piece with tempo to unveil a battery.",
    fr: "Déplacez la pièce-masque avec tempo pour dévoiler la batterie.",
  },
  "discovered-check": {
    en: "Unmask a check so the moving piece wins material for free.",
    fr: "Découvrez un échec pour que la pièce qui bouge gagne du matériel.",
  },
  "double-check": {
    en: "Two checks at once — only a king move can answer.",
    fr: "Deux échecs à la fois — seul un coup de roi peut répondre.",
  },
  overworked: {
    en: "A defender guarding two duties cannot do both.",
    fr: "Un défenseur à deux tâches ne peut pas toutes les remplir.",
  },
  "removing-the-guard": {
    en: "Eliminate or deflect the piece that holds the position together.",
    fr: "Éliminez ou déviez la pièce qui tient la position.",
  },
  "no-retreat": {
    en: "Trap a piece with no flight square, often with a quiet pawn prod.",
    fr: "Piégez une pièce sans case de fuite, souvent par une poussée de pion.",
  },
  skewer: {
    en: "Attack through a valuable piece to win the one behind it.",
    fr: "Attaquez à travers une pièce de valeur pour gagner celle derrière.",
  },
  queening: {
    en: "Clear the path or overload the blockade of a passed pawn.",
    fr: "Ouvrez la voie ou surchargez le blocus d’un pion passé.",
  },
  "vulnerable-first-rank": {
    en: "Exploit an unguarded back rank, often with a heavy-piece invasion.",
    fr: "Exploitez un dernier rang non défendu, souvent par une invasion lourde.",
  },
  "breaking-communication": {
    en: "Cut the line that lets a defender protect a key unit.",
    fr: "Coupez la ligne qui permet à un défenseur de protéger une unité clé.",
  },
  "combined-operations": {
    en: "Chain motifs: analyze checks, captures, and threats in order.",
    fr: "Enchaînez les motifs : analysez échecs, prises et menaces dans l’ordre.",
  },
  "design-for-checkmate": {
    en: "Recognize classic mating nets and force the pattern.",
    fr: "Reconnaissez les filets de mat classiques et forcez le schéma.",
  },
  "defensive-play": {
    en: "Parry combinations: decline sacrifices, meet threats, stay solid.",
    fr: "Parer les combinaisons : refuser les sacrifices, répondre aux menaces.",
  },
  "dont-grab": {
    en: "Refuse poisoned material that walks into a tactic.",
    fr: "Refusez le matériel empoisonné qui tombe dans une tactique.",
  },
  "attack-counterattack": {
    en: "Meet an attack with a stronger counter-threat.",
    fr: "Répondez à une attaque par une contre-menace plus forte.",
  },
};

/** Winning Chess book order → catalog sections. */
const CURRICULUM_SECTIONS = [
  {
    id: "foundations",
    title: { en: "1 · Foundations", fr: "1 · Fondations" },
    moduleIds: ["introduction", "misc-tactics"],
  },
  {
    id: "pins",
    title: { en: "2 · Pins", fr: "2 · Clouages" },
    moduleIds: ["pin"],
  },
  {
    id: "forks-doubles",
    title: { en: "3 · Forks & double attacks", fr: "3 · Fourchettes & attaques doubles" },
    moduleIds: ["knight-fork", "double-attack"],
  },
  {
    id: "discoveries",
    title: { en: "4 · Discoveries & double check", fr: "4 · Découvertes & double échec" },
    moduleIds: ["discovered-attack", "discovered-check", "double-check"],
  },
  {
    id: "guards",
    title: { en: "5 · Guards & overload", fr: "5 · Défenseurs & surcharge" },
    moduleIds: ["overworked", "removing-the-guard", "breaking-communication"],
  },
  {
    id: "traps",
    title: { en: "6 · No retreat & skewer", fr: "6 · Sans retraite & enfilade" },
    moduleIds: ["no-retreat", "skewer"],
  },
  {
    id: "promotion-mate",
    title: { en: "7 · Promotion, back rank & mates", fr: "7 · Promotion, dernier rang & mats" },
    moduleIds: ["queening", "vulnerable-first-rank", "design-for-checkmate", "combined-operations"],
  },
  {
    id: "defense-counter",
    title: { en: "8 · Defense & counterattack", fr: "8 · Défense & contre-attaque" },
    moduleIds: ["defensive-play", "dont-grab", "attack-counterattack"],
  },
];

const THEME_LABELS = {
  Introduction: { en: "Introduction", fr: "Introduction" },
  "BASIC PATTERNS FOR TACTICAL PLAY": { en: "Basic tactical patterns", fr: "Motifs tactiques de base" },
  "BASIC PATTERN FOR THE PIN": { en: "Basic pattern — pin", fr: "Schéma de base — clouage" },
  "QUIZ ON PINS": { en: "Quiz — pins", fr: "Quiz — clouages" },
  "BREAKING A PIN": { en: "Breaking a pin", fr: "Briser un clouage" },
  "QUIZ ON BREAKING A PIN": { en: "Quiz — breaking a pin", fr: "Quiz — briser un clouage" },
  "BASIC PATTERN FOR THE KNIGHT FORK": { en: "Basic pattern — knight fork", fr: "Schéma de base — fourchette" },
  "BREAKING A KNIGHT FORK": { en: "Breaking a knight fork", fr: "Briser une fourchette" },
  "THE FORK AND THE PIN": { en: "Fork and pin together", fr: "Fourchette et clouage" },
  "QUIZ ON KNIGHT FORKS": { en: "Quiz — knight forks", fr: "Quiz — fourchettes" },
  "DOUBLE ATTACKS WITH MATING THREATS": { en: "Double attacks with mate threats", fr: "Attaques doubles avec menace de mat" },
  "DOUBLE ATTACKS WITH CHECK": { en: "Double attacks with check", fr: "Attaques doubles avec échec" },
  "DOUBLE ATTACKS ON LOOSE PIECES": { en: "Double attacks on loose pieces", fr: "Attaques doubles sur pièces en prise" },
  "DOUBLE ATTACKS WITH THE PAWN PUSH": { en: "Double attacks with pawn push", fr: "Attaques doubles avec poussée de pion" },
  "DOUBLE ATTACKS WITH PINS": { en: "Double attacks with pins", fr: "Attaques doubles avec clouages" },
  "BREAKING A DOUBLE ATTACK": { en: "Breaking a double attack", fr: "Briser une attaque double" },
  "QUIZ ON DOUBLE ATTACKS": { en: "Quiz — double attacks", fr: "Quiz — attaques doubles" },
  "BASIC PATTERN FOR DISCOVERED ATTACK": { en: "Basic pattern — discovered attack", fr: "Schéma de base — attaque à découverte" },
  "DISCOVERED ATTACK WITH CHECK": { en: "Discovered attack with check", fr: "Attaque à découverte avec échec" },
  "DISCOVERED ATTACK WITH CAPTURE": { en: "Discovered attack with capture", fr: "Attaque à découverte avec prise" },
  "DISCOVERED ATTACK WITH SECONDARY THREAT": { en: "Discovered attack with secondary threat", fr: "Attaque à découverte avec menace secondaire" },
  "DISCOVERED ATTACK WITH MATE THREATS": { en: "Discovered attack with mate threats", fr: "Attaque à découverte avec mat" },
  "QUIZ ON DISCOVERED ATTACKS": { en: "Quiz — discovered attacks", fr: "Quiz — attaques à découverte" },
  "BASIC PATTERN FOR DISCOVERED CHECK": { en: "Basic pattern — discovered check", fr: "Schéma de base — échec à découverte" },
  "QUIZ ON DISCOVERED CHECK": { en: "Quiz — discovered check", fr: "Quiz — échec à découverte" },
  "BASIC PATTERN FOR DOUBLE CHECK": { en: "Basic pattern — double check", fr: "Schéma de base — double échec" },
  "QUIZ ON DOUBLE CHECK": { en: "Quiz — double check", fr: "Quiz — double échec" },
  "BASIC PATTERN FOR UNDERMINING THE OVERWORKED PIECE": { en: "Overworked piece", fr: "Pièce surchargée" },
  "QUIZ ON THE OVERWORKED PIECE": { en: "Quiz — overworked piece", fr: "Quiz — pièce surchargée" },
  "BASIC PATTERN FOR REMOVING THE GUARD": { en: "Removing the guard", fr: "Éliminer le défenseur" },
  "QUIZ ON REMOVING THE GUARD": { en: "Quiz — removing the guard", fr: "Quiz — éliminer le défenseur" },
  "QUIZ ON “NO RETREAT”": { en: "Quiz — no retreat", fr: "Quiz — sans retraite" },
  'QUIZ ON "NO RETREAT"': { en: "Quiz — no retreat", fr: "Quiz — sans retraite" },
  "BASIC PATTERN FOR THE SKEWER": { en: "Basic pattern — skewer", fr: "Schéma de base — enfilade" },
  "QUIZ ON THE SKEWER": { en: "Quiz — skewer", fr: "Quiz — enfilade" },
  "BASIC PATTERN FOR QUEENING COMBINATIONS": { en: "Queening combinations", fr: "Combinaisons de promotion" },
  "QUIZ ON QUEENING COMBINATIONS": { en: "Quiz — queening", fr: "Quiz — promotion" },
  "BASIC PATTERN FOR THE VULNERABLE FIRST RANK": { en: "Vulnerable first rank", fr: "Premier rang vulnérable" },
  "QUIZ ON THE VULNERABLE FIRST RANK": { en: "Quiz — first rank", fr: "Quiz — premier rang" },
  "BASIC PATTERN FOR BREAKING COMMUNICATION": { en: "Breaking communication", fr: "Couper la communication" },
  "BASIC PATTERN FOR COMBINED OPERATIONS": { en: "Combined operations", fr: "Opérations combinées" },
  "QUIZ ON COMBINED OPERATIONS": { en: "Quiz — combined operations", fr: "Quiz — opérations combinées" },
  "SKELETON PATTERN FOR A MATING COMBINATION": { en: "Skeleton mating pattern", fr: "Squelette d’un mat" },
  "BASIC MATING PATTERNS": { en: "Basic mating patterns", fr: "Mats modèles de base" },
  "QUIZ ON DESIGNS FOR CHECKMATE": { en: "Quiz — mating designs", fr: "Quiz — mats modèles" },
  "BASIC PATTERN FOR DEFENSIVE PLAY": { en: "Defensive play", fr: "Jeu défensif" },
  "DEFENSE TO A COMBINATION": { en: "Defense to a combination", fr: "Défense contre une combinaison" },
  "DON’ T GRAB !": { en: "Don’t grab!", fr: "Ne prenez pas tout !" },
  "DON’T GRAB !": { en: "Don’t grab!", fr: "Ne prenez pas tout !" },
  "DEFENSE TO A THREAT": { en: "Defense to a threat", fr: "Défense contre une menace" },
  "DEFENSE BY DECLINING A SACRIFICE": { en: "Declining a sacrifice", fr: "Refuser un sacrifice" },
  "ATTACK AND COUNTERATTACK": { en: "Attack and counterattack", fr: "Attaque et contre-attaque" },
  "ANALYZINGA COMBINATION": { en: "Analyzing a combination", fr: "Analyser une combinaison" },
  "BASIC PATTERN FOR “NO RETREAT”": { en: "No retreat", fr: "Sans retraite" },
};

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function motifForItem(item) {
  const title = item.chapter_title || "";
  for (const m of MOTIF_MAP) {
    if (m.match.test(title)) return m;
  }
  const caption = item.caption || "";
  if (/no retreat|flight.?square|cul-de-sac|no flight/i.test(`${title} ${caption}`)) {
    return MOTIF_MAP.find((m) => m.id === "no-retreat");
  }
  // Never drop a fen_ok board — park leftovers in misc.
  return MOTIF_MAP.find((m) => m.id === "misc-tactics");
}

function shortCue(side, label) {
  const who = side === "b" ? { en: "Black", fr: "Noirs" } : { en: "White", fr: "Blancs" };
  const tag = label ? ` · ${label}` : "";
  return {
    en: `${who.en} to move${tag}`,
    fr: `Trait aux ${who.fr}${tag}`,
  };
}

/** lesson → technique → quiz (Winning Chess chapter roles). */
function chapterPhase(title) {
  const t = title || "";
  if (/^quiz\b/i.test(t)) return "quiz";
  if (/^breaking\b|^defense\b|^don/i.test(t) || /fork and the pin|with (check|capture|pins|mate|secondary|pawn|loose|mating)/i.test(t)) {
    return "technique";
  }
  if (/basic pattern|basic mating|skeleton pattern|introduction|tactical play|analyzing|attack and counter/i.test(t)) {
    return "lesson";
  }
  // Numbered diagram captions promoted to chapter titles (extract quirk) are still lessons.
  if (/^\d+[AB]?\./.test(t)) return "lesson";
  if (/no retreat|flight/i.test(t)) return "technique";
  return "lesson";
}

/** Prefer diagram prompt + follow-up when the extract split caption into chapter_title. */
function coachCaption(item) {
  const cap = String(item.caption || "").trim();
  const ch = String(item.chapter_title || "").trim();
  if (/^\d+[AB]?\./i.test(ch)) {
    if (!cap) return ch;
    if (cap.startsWith(ch.slice(0, Math.min(24, ch.length)))) return cap;
    if (!cap.includes(ch.slice(0, Math.min(40, ch.length)))) return `${ch}\n\n${cap}`;
    return cap;
  }
  return cap || ch;
}

function inferLabel(item) {
  if (item.label) return item.label;
  const from = String(item.chapter_title || item.caption || "");
  const match = from.match(/^(\d+)([ABab])?\./);
  if (!match?.[1]) return null;
  return match[2] ? `${match[1]}${match[2].toUpperCase()}` : match[1];
}

function inferSide(item) {
  if (item.side_to_move === "b" || item.side_to_move === "w") return item.side_to_move;
  const text = `${item.chapter_title || ""} ${item.caption || ""}`;
  if (/\bBlack moves\b/i.test(text)) return "b";
  if (/\bWhite moves\b/i.test(text)) return "w";
  return "w";
}

const PHASE_RANK = { lesson: 0, technique: 1, quiz: 2 };

function themeLabel(title) {
  if (!title) return { en: "Diagram", fr: "Diagramme" };
  if (THEME_LABELS[title]) return THEME_LABELS[title];
  if (/^\d+[AB]?\./.test(title) || title.length > 80) {
    if (/no retreat|flight|cul-de-sac/i.test(title)) {
      return { en: "No-retreat examples", fr: "Exemples sans retraite" };
    }
    return { en: "Worked example", fr: "Exemple commenté" };
  }
  const cleaned = title.replace(/^BASIC PATTERN FOR\s+/i, "").replace(/^QUIZ ON\s+/i, "Quiz — ");
  return { en: cleaned, fr: cleaned };
}

function uniqueThemes(titles) {
  const en = [];
  const fr = [];
  const seen = new Set();
  for (const title of titles) {
    const label = themeLabel(title);
    if (seen.has(label.en)) continue;
    seen.add(label.en);
    en.push(label.en);
    fr.push(label.fr);
  }
  return { en, fr };
}

function diagramSortKey(entry) {
  const phase = PHASE_RANK[entry.phase] ?? 9;
  const label = String(entry.label || entry.id);
  const num = Number.parseInt(label.replace(/\D/g, ""), 10);
  const labelKey = Number.isFinite(num) ? num : 9999;
  return [phase, labelKey, entry.id];
}

function compareKeys(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] === b[i]) continue;
    return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

function parseSuggestedTokens(caption) {
  if (!caption) return [];
  const tokens = [];
  const re =
    /\b(?:plays?|with|by|to)\s+(\d+\s*(?:\.\.\.)?\s*)?((?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|[KQRBN]x?[a-h][1-8](?:=[QRBN])?[+#]?))\b|[.!]\s*(?:1(?:\s*\.\.\.)?\s*)((?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?))\b|\b1(?:\s*\.\.\.)?\s*((?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?))\b/gi;
  let m;
  while ((m = re.exec(caption)) !== null) {
    const raw = (m[2] || m[3] || m[4] || "").replace(/[!?]+$/g, "");
    if (raw) tokens.push(raw);
  }
  // also "the crushing ... c3" / bare dest after "possibility of"
  const destOnly = caption.match(
    /\b(?:possibility of|crushing|plays?|with)\s+1?\s*(?:\.\.\.\s*)?([KQRBN]?x?[a-h][1-8][!+#]?)\b/gi,
  );
  if (destOnly) {
    for (const d of destOnly) {
      const t = d.replace(/^.*?([KQRBN]?x?[a-h][1-8]).*$/i, "$1").replace(/[!+#]+$/, "");
      if (t.length >= 2) tokens.push(t);
    }
  }
  return [...new Set(tokens)];
}

/** Resolve caption token against legal moves (handles OCR-stripped piece letters). */
function resolveExpected(fen, side, tokens) {
  const fullFen = fen.includes(" ") ? fen : `${fen} ${side} - - 0 1`;
  let board;
  try {
    board = new Chess(fullFen);
  } catch {
    return null;
  }
  const legal = board.moves({ verbose: true });
  for (const token of tokens) {
    // Direct SAN / UCI try
    for (const trySan of [token, token.replace(/^x/, ""), token.replace(/^[KQRBN]/, "")]) {
      try {
        const b = new Chess(fullFen);
        const mv = b.move(trySan, { strict: false });
        if (mv) {
          return {
            san: mv.san,
            uci: `${mv.from}${mv.to}${mv.promotion ?? ""}`,
            legal: [[`${mv.from}${mv.to}${mv.promotion ?? ""}`, mv.san, mv.san]],
          };
        }
      } catch {
        /* next */
      }
    }
    // Destination square match (e.g. caption "1 xe6" → Nxe6 uniquely)
    const dest = token.match(/([a-h][1-8])(?:[+#])?$/);
    if (!dest) continue;
    const to = dest[1];
    const isCapture = /x/i.test(token);
    const pieceHint = token.match(/^([KQRBN])/);
    const candidates = legal.filter((mv) => {
      if (mv.to !== to) return false;
      if (isCapture && !(mv.flags.includes("c") || mv.flags.includes("e"))) return false;
      if (pieceHint) {
        const want = pieceHint[1].toLowerCase();
        return mv.piece === want;
      }
      return true;
    });
    if (candidates.length === 1) {
      const mv = candidates[0];
      return {
        san: mv.san,
        uci: `${mv.from}${mv.to}${mv.promotion ?? ""}`,
        legal: [[`${mv.from}${mv.to}${mv.promotion ?? ""}`, mv.san, mv.san]],
      };
    }
  }
  return null;
}

function main() {
  if (!existsSync(wcManifestPath)) {
    throw new Error(`Missing ${wcManifestPath} — run tactics_extract_winning_chess.py --ocr first`);
  }
  const manifest = JSON.parse(readFileSync(wcManifestPath, "utf8"));
  const chapters = existsSync(wcChaptersPath)
    ? JSON.parse(readFileSync(wcChaptersPath, "utf8"))
    : [];
  const chapterText = Object.fromEntries(chapters.map((c) => [c.title, c.texts ?? []]));
  const literary = loadLiteraryFr();
  if (literary) {
    console.log(
      `Literary FR loaded · captions=${literary.stats?.captionsByEn ?? "?"} · chapters=${literary.stats?.chapters ?? "?"}`,
    );
  } else {
    console.warn("No fr-literary.json yet — using fallback FR for captions/excerpts");
  }

  const byMotif = new Map();
  let fenOkCount = 0;
  let skippedEmpty = 0;
  for (const item of manifest.items) {
    if (!item.fen_ok || !item.fen) continue;
    fenOkCount += 1;
    const caption = coachCaption(item);
    if (!caption.trim()) {
      skippedEmpty += 1;
      continue;
    }
    const motif = motifForItem(item);
    if (!byMotif.has(motif.id)) {
      byMotif.set(motif.id, { meta: motif, examples: [], quizzes: [], titles: new Set() });
    }
    const bucket = byMotif.get(motif.id);
    if (item.chapter_title) bucket.titles.add(item.chapter_title);
    const side = inferSide(item);
    const tokens = parseSuggestedTokens(caption);
    const expected = resolveExpected(item.fen, side, tokens);
    const phase = chapterPhase(item.chapter_title);
    const entry = {
      id: item.id,
      fen: item.fen.includes(" ")
        ? item.fen.replace(/ [wb] /, ` ${side} `)
        : `${item.fen} ${side} - - 0 1`,
      side,
      caption,
      label: inferLabel(item),
      chapter: item.chapter_title,
      phase,
      expected,
    };
    // Every fen_ok board with a caption is a teach example; resolved SAN → practice too.
    bucket.examples.push(entry);
    if (expected) bucket.quizzes.push(entry);
  }

  // Attach literary chapter titles that belong to a motif even when no diagram carries them
  // (e.g. BASIC PATTERN FOR “NO RETREAT” has empty extract body but a FR essay).
  if (literary?.chaptersByTitle) {
    for (const title of Object.keys(literary.chaptersByTitle)) {
      const motif = motifForItem({ chapter_title: title, caption: "" });
      if (!motif || !byMotif.has(motif.id)) continue;
      byMotif.get(motif.id).titles.add(title);
    }
  }

  const modulesById = new Map();
  const exercises = [];
  const localExercises = {};
  const localModules = {};

  for (const [id, bucket] of byMotif) {
    const names = MOTIF_NAMES[id] || {
      en: id,
      fr: id,
    };
    const plan = MOTIF_PLANS[id] || {
      en: `Study the ${names.en} motif with Winning Chess examples.`,
      fr: `Étudiez le motif « ${names.fr} » avec les exemples Winning Chess.`,
    };
    // Prefer long chapter prose over short diagram stubs for the local overlay.
    const texts = [...bucket.titles]
      .flatMap((t) => chapterText[t] || [])
      .filter((t) => typeof t === "string" && t.trim().length > 40)
      .sort((a, b) => b.length - a.length);

    const orderedTitles = [...bucket.titles].sort((a, b) => {
      const pa = PHASE_RANK[chapterPhase(a)] ?? 9;
      const pb = PHASE_RANK[chapterPhase(b)] ?? 9;
      if (pa !== pb) return pa - pb;
      return a.localeCompare(b);
    });
    const themes = uniqueThemes(orderedTitles);

    bucket.examples.sort((a, b) => compareKeys(diagramSortKey(a), diagramSortKey(b)));
    bucket.quizzes.sort((a, b) => {
      // Quiz-chapter drills first, then lesson/technique with resolved SAN.
      const quizFirst = (e) => (e.phase === "quiz" ? 0 : e.phase === "technique" ? 1 : 2);
      const d = quizFirst(a) - quizFirst(b);
      if (d !== 0) return d;
      return compareKeys(diagramSortKey(a), diagramSortKey(b));
    });

    const exerciseIds = [];
    for (const q of bucket.quizzes) {
      if (!q.expected) continue;
      exerciseIds.push(q.id);
      const theme = themeLabel(q.chapter);
      exercises.push({
        id: q.id,
        moduleId: id,
        fen: q.fen,
        boardOrientation: q.side === "b" ? "black" : "white",
        sideToMove: q.side === "b" ? "black" : "white",
        expectedSan: q.expected.san,
        expectedUci: q.expected.uci,
        task: shortCue(q.side, q.label),
        cue: { en: theme.en, fr: theme.fr },
        legal: q.expected.legal,
        source: {
          book: "winning-chess",
          ref: q.label || q.id,
        },
        role: q.phase === "quiz" ? "quiz" : "teach",
        phase: q.phase,
      });
      const caption = (q.caption || "").trim();
      const frCap = captionFr(caption, q.id, literary);
      localExercises[q.id] = {
        prompt: {
          en: caption || `Find the key ${names.en} idea.`,
          fr: frCap || `Trouvez l’idée clé (${names.fr}).`,
        },
        solution: {
          en: caption
            ? `Key move: ${q.expected.san}\n\n${caption}`
            : `Key move: ${q.expected.san}`,
          fr: frCap
            ? `Coup clé : ${q.expected.san}\n\n${frCap}`
            : `Coup clé : ${q.expected.san}`,
        },
      };
    }

    modulesById.set(id, {
      id,
      names,
      plan,
      themes,
      sources: [{ book: "winning-chess", ref: orderedTitles[0] || id }],
      examples: bucket.examples.map((ex) => {
        const caption = ex.caption || "";
        return {
          id: ex.id,
          fen: ex.fen,
          sans: ex.expected ? [ex.expected.san] : [],
          coach: {
            en: caption,
            fr: captionFr(caption, ex.id, literary),
          },
          stepCoaches: [],
          phase: ex.phase,
          theme: themeLabel(ex.chapter),
          label: ex.label || null,
        };
      }),
      exerciseIds,
    });
    const excerptBody = texts.join("\n\n").slice(0, 16000);
    // Prefer literary chapter FR for the first / longest titled chapter in the motif.
    let excerptFr = "";
    for (const title of orderedTitles) {
      const hit = literary?.chaptersByTitle?.[title];
      if (hit?.textFr) {
        excerptFr = hit.textFr.slice(0, 16000);
        break;
      }
    }
    if (!excerptFr && excerptBody) {
      excerptFr = chapterExcerptFr(orderedTitles[0] || "", excerptBody, literary);
    }
    // Merge additional literary chapter texts for the motif when space remains.
    if (literary && excerptFr.length < 12000) {
      const extra = [];
      for (const title of orderedTitles.slice(1)) {
        const hit = literary.chaptersByTitle?.[title];
        if (hit?.textFr) extra.push(hit.textFr);
      }
      if (extra.length) {
        excerptFr = `${excerptFr}\n\n${extra.join("\n\n")}`.slice(0, 16000);
      }
    }
    localModules[id] = {
      bookExcerpt: {
        excerptEn: excerptBody,
        excerptFr,
      },
    };
  }

  const modules = [];
  const sections = CURRICULUM_SECTIONS.map((section) => {
    const moduleIds = section.moduleIds.filter((id) => modulesById.has(id));
    for (const id of moduleIds) modules.push(modulesById.get(id));
    return {
      id: section.id,
      title: section.title,
      refs: [],
      moduleIds,
    };
  }).filter((s) => s.moduleIds.length > 0);

  // Any motif not listed in CURRICULUM_SECTIONS (shouldn't happen) → appendix
  const placed = new Set(modules.map((m) => m.id));
  const leftovers = [...modulesById.keys()].filter((id) => !placed.has(id));
  if (leftovers.length) {
    for (const id of leftovers) modules.push(modulesById.get(id));
    sections.push({
      id: "appendix",
      title: { en: "Appendix", fr: "Annexe" },
      refs: [],
      moduleIds: leftovers,
    });
  }

  const curriculum = {
    id: "tactics-revision",
    title: {
      en: "Tactics Revision — Winning Chess",
      fr: "Révision tactiques — Winning Chess",
    },
    author: {
      en: "Chernev & Reinfeld (extract)",
      fr: "Chernev & Reinfeld (extrait)",
    },
    publisher: { en: "Curriculum · interactive study", fr: "Parcours · étude interactive" },
    methodNote: {
      en: "Follow Winning Chess order: learn the pattern (lesson → technique), then solve the quiz battery.",
      fr: "Suivez l’ordre Winning Chess : apprenez le schéma (leçon → technique), puis résolvez la batterie quiz.",
    },
    sections,
    modules,
    exercises,
  };

  const localOverlay = {
    id: "tactics-revision-local",
    modules: localModules,
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

  const exampleTotal = modules.reduce((n, m) => n + m.examples.length, 0);
  console.log(
    `Built ${modules.length} modules · ${exercises.length} practice (SAN ok) · ${exampleTotal} teach examples · fen_ok source=${fenOkCount} · skipped empty caption=${skippedEmpty}`,
  );
  if (exampleTotal + skippedEmpty !== fenOkCount) {
    console.warn(
      `WARNING: examples (${exampleTotal}) + skipped (${skippedEmpty}) ≠ fen_ok (${fenOkCount})`,
    );
  }
}

main();
