/**
 * Map Olibris extract pages → openings-revision-local.json (gitignored).
 * Page map verified against docs/_ouvertures-enfants-texte/pages/.
 *
 * Usage: node scripts/enrich_openings_from_book.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = join(ROOT, "docs/_ouvertures-enfants-texte/pages");
const CURRICULUM = join(ROOT, "data/openings-revision.json");
const OUT_PUBLIC = join(ROOT, "web/public/data/openings-revision-local.json");
const OUT_DATA = join(ROOT, "data/openings-revision-local.json");

/** PDF page file number → module id (50 Super Ouvertures). */
const PAGE_TO_MODULE = {
  20: "giuoco-piano",
  22: "evans-gambit",
  24: "two-knights",
  26: "kings-gambit",
  28: "danish-centre",
  30: "goring-latvian",
  32: "bishop-vienna",
  34: "scotch",
  36: "philidor",
  38: "petroff",
  40: "ruy-lopez-intro",
  42: "ruy-lopez-closed",
  44: "ruy-lopez-marshall",
  46: "ruy-lopez-open",
  48: "alekhine",
  50: "scandinavian",
  52: "caro-kann",
  54: "french-intro",
  56: "french-nc3",
  58: "sicilian-intro",
  60: "sicilian-closed-gp",
  62: "sicilian-alapin",
  64: "morra-gambit",
  66: "sicilian-bb5",
  68: "open-sicilian-intro",
  70: "sicilian-dragon",
  72: "sicilian-najdorf",
  74: "sicilian-sveshnikov",
  76: "qga",
  78: "qgd-classical",
  80: "tartakower-modern",
  82: "qgd-exchange",
  84: "tarrasch",
  86: "chigorin-albin",
  88: "slav",
  90: "semi-slav",
  92: "london-colle-tromp",
  94: "dutch",
  96: "benoni-benko",
  98: "kings-indian-intro",
  100: "kings-indian-main",
  102: "grunfeld-intro",
  104: "grunfeld-exchange",
  106: "queens-indian-bogo",
  108: "nimzo-intro",
  110: "nimzo-main",
  112: "reversed-sicilian",
  114: "symmetrical-english",
  116: "assorted-english",
  118: "reti",
};

function tidySpaces(text) {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ *\n */g, "\n")
    .trim();
}

function fixFrenchOcr(text) {
  return text
    .replace(/\|['’]/g, "l'")
    .replace(/I['’]/g, "l'")
    .replace(/s['‘']/g, "s'")
    .replace(/n['‘]est/gi, "n'est")
    .replace(/\bnest\b/g, "n'est")
    .replace(/Méme/g, "Même")
    .replace(/méme/g, "même")
    .replace(/Cést/g, "C'est")
    .replace(/cést/g, "c'est")
    .replace(/Aprés/g, "Après")
    .replace(/\bApres\b/g, "Après")
    .replace(/aprés/g, "après")
    .replace(/déja/g, "déjà")
    .replace(/connaitre/g, "connaître")
    .replace(/stirement/g, "sûrement")
    .replace(/facgon/g, "façon")
    .replace(/particulierement/g, "particulièrement")
    .replace(/particuliére/g, "particulière")
    .replace(/derniéres/g, "dernières")
    .replace(/\bpréts\b/g, "prêts")
    .replace(/\bcing\b/g, "cinq")
    .replace(/plut6t/g, "plutôt")
    .replace(/plutét/g, "plutôt")
    .replace(/siécle/g, "siècle")
    .replace(/intérét/g, "intérêt")
    .replace(/extreémement/g, "extrêmement")
    .replace(/ameéne/g, "amène")
    .replace(/améne/g, "amène")
    .replace(/systémes/g, "systèmes")
    .replace(/Systémes/g, "Systèmes")
    .replace(/systeme/g, "système")
    .replace(/contrdle/g, "contrôle")
    .replace(/surcontrdlent/g, "surcontrôlent")
    .replace(/contrélant/g, "contrôlant")
    .replace(/contréle/g, "contrôle")
    .replace(/piéce/g, "pièce")
    .replace(/pieces\b/g, "pièces")
    .replace(/piéges/g, "pièges")
    .replace(/pieges/g, "pièges")
    .replace(/Frangaise/g, "Française")
    .replace(/Francaise/g, "Française")
    .replace(/fagons/g, "façons")
    .replace(/fagon/g, "façon")
    .replace(/peut-étre/g, "peut-être")
    .replace(/Griinfeld/g, "Grünfeld")
    .replace(/Ecossaise/g, "Écossaise")
    .replace(/Kas-\s*parov/g, "Kasparov")
    .replace(/d6ja/g, "déjà")
    .replace(/d6finit/g, "définit")
    .replace(/d6veloppement/g, "développement")
    .replace(/empéche/g, "empêche")
    .replace(/protege/g, "protège")
    .replace(/inconvenient/g, "inconvénient")
    .replace(/\bapres\b/g, "après")
    .replace(/\baupres\b/g, "auprès")
    .replace(/\btres\b/g, "très")
    .replace(/\ba\s+s'/g, "à s'")
    .replace(/\ba\s+s’/g, "à s’")
    .replace(/\ba\s+jouer\b/g, "à jouer")
    .replace(/\ba\s+la\b/g, "à la")
    .replace(/\ba\s+1\./g, "à 1.")
    .replace(/n['']ont pas a\b/g, "n'ont pas à")
    .replace(/force a jouer/g, "force à jouer")
    .replace(/répondant a /g, "répondant à ")
    .replace(/agressives a /g, "agressives à ")
    .replace(/agressive a /g, "agressive à ")
    .replace(/\ba monter\b/g, "à monter")
    .replace(/vise amonter/g, "vise à monter")
    .replace(/X1X°\*/g, "XIXe")
    .replace(/__/g, " ")
    .replace(/\s{2,}/g, " ");
}

function fixChessOcr(text) {
  return text
    .replace(/A\\([a-h])/g, "N$1")
    .replace(/“\\([a-h])/g, "N$1")
    .replace(/2\)£(\d)/g, "Nf$1")
    .replace(/2\)f(\d)/g, "Nf$1")
    .replace(/(\d)\.0g(\d)/g, "$1.Ng$2")
    .replace(/¢([1-8])/g, "c$1")
    .replace(/(\d)\.44\b/g, "$1.d4")
    .replace(/\b1\.44\b/g, "1.d4")
    .replace(/1\.43\b/g, "1.Nf3")
    .replace(/([2-9])\.43\b/g, "$1.Nc3")
    .replace(/(\d)\.24\b/g, "$1.Bc4")
    .replace(/(\d)\.225\b/g, "$1.Bg5")
    .replace(/(\d)\.25\b/g, "$1.Bg5")
    .replace(/2\.23\b/g, "2.Nf3")
    .replace(/([3-9])\.23\b/g, "$1.h3")
    .replace(/(\d)\.2c4\b/g, "$1.Bc4")
    .replace(/(\d)\.2e([23])\b/g, "$1.Be$2")
    .replace(/(\d)\.2g5\b/g, "$1.Bg5")
    .replace(/(\d)\.2([a-h]\d)/g, "$1.B$2")
    .replace(/(\d)\.&\.?([a-h])(\d)/g, "$1.B$2$3")
    .replace(/&\.?£(\d)/g, "Bf$1")
    .replace(/&\.?([a-h])(\d)/g, "B$1$2")
    .replace(/\bAbd(\d)/g, "Nbd$1")
    .replace(/\b2B([a-h]\d)/g, "B$1")
    .replace(/\bDc(\d)/g, "Nc$1")
    .replace(/\bDf(\d)/g, "Nf$1")
    .replace(/“x([a-h]\d)/g, "Nx$1")
    .replace(/“xc(\d)/g, "Nxc$1")
    .replace(/“([a-h])(\d)/g, "N$1$2")
    .replace(/“fo\b/g, "Nf6")
    .replace(/“(\d)\b/g, "Nc$1")
    .replace(/(\d)\.2\.([a-h]\d)/g, "$1.B$2")
    .replace(/(\d)\.2\.4\b/g, "$1.Ba4")
    .replace(/(\d)\.03\b/g, "$1.Nf3")
    .replace(/\b2£([a-h])(\d)/g, "B$1$2")
    .replace(/\b2\.£(\d)/g, "Bf$1")
    .replace(/\b2£(\d)/g, "Bf$1")
    .replace(/£\.c(\d)/g, "Bc$1")
    .replace(/£g(\d)/g, "Bg$1")
    .replace(/(\d)\.£(\d)\b/g, "$1.f$2")
    .replace(/\.\.\.\s*£(\d)/g, "...f$1")
    .replace(/\s£6\b/g, " Nf6")
    .replace(/\s£(\d)\b/g, " f$1")
    .replace(/(\d)\.4xe([a-h]\d)/g, "$1.Nxe$2")
    .replace(/(\d)\.4e(\d)/g, "$1.Re$2")
    .replace(/@\)gf(\d)/g, "Ngf$1")
    .replace(/@bd(\d)/g, "Nbd$1")
    .replace(/\b4xe([a-h]\d)/g, "Nxe$1")
    .replace(/\bAfé\b/g, "Nf6")
    .replace(/\bAf\b(?=[\s.,;!?]|$)/g, "Nf6")
    .replace(/\bAgt6\b/g, "Ngf6")
    .replace(/\bAbd7\b/g, "Nbd7")
    .replace(/\bAge7\b/g, "Nge7")
    .replace(/\bAcb6\b/g, "Nc6")
    .replace(/\bAa(\d)/g, "Na$1")
    .replace(/\bAf(\d)/g, "Nf$1")
    .replace(/\bAc(\d)/g, "Nc$1")
    .replace(/\bAg(\d)/g, "Ng$1")
    .replace(/\bAd(\d)/g, "Nd$1")
    .replace(/\bAe(\d)/g, "Ne$1")
    .replace(/\bAb(\d)/g, "Nb$1")
    .replace(/\bAh(\d)/g, "Nh$1")
    .replace(/\bAxe([a-h]\d)/gi, "Nxe$1")
    .replace(/\bAx([a-h]\d)/gi, "Nx$1")
    .replace(/&([a-h]\d)/g, "B$1")
    .replace(/&x([a-h]\d)/gi, "Bx$1")
    .replace(/£&([a-h]\d)/g, "B$1")
    .replace(/£B([a-h]\d)/g, "B$1")
    .replace(/(\d)\.D£(\d)/g, "$1.Nf$2")
    .replace(/(\d)\.A£(\d)/g, "$1.Nf$2")
    .replace(/\bD£(\d)/g, "Nf$1")
    .replace(/\bA£(\d)/g, "Nf$1")
    .replace(/“£(\d)/g, "Nf$1")
    .replace(/“\\f(\d)/g, "Nf$1")
    .replace(/“d([a-h]?\d)/g, "Nd$1")
    .replace(/\b2([a-h]\d)/g, "B$1")
    .replace(/@x([a-h]\d)/gi, "Nx$1")
    .replace(/@([a-h]\d)/g, "N$1")
    .replace(/\bW([a-h]\d)/g, "Q$1")
    .replace(/\bWx([a-h]\d)/gi, "Qx$1")
    .replace(/\bWe(\d)/g, "Qe$1")
    .replace(/\bWd(\d)/g, "Qd$1")
    .replace(/\bWc(\d)/g, "Qc$1")
    .replace(/\bWf(\d)/g, "Qf$1")
    .replace(/\bZ([a-h]\d)/g, "R$1")
    .replace(/\bZe(\d)/g, "Re$1")
    .replace(/(\d)\.4([a-h]\d)/g, "$1.Q$2")
    .replace(/(^|[\s.])dé(?=[\s.,;!?]|$)/g, "$1d6")
    .replace(/(\d)\.e2\b/g, "$1.Be2")
    .replace(/7\.\.\.S2e7/g, "7...Be7")
    .replace(/7\.\.\.4\/b6/g, "7...Qb6")
    .replace(/7\.\.\.4b6/g, "7...Qb6")
    .replace(/4\.43\b/g, "4.Bg5")
    .replace(/3\.h3 c5/g, "3.Nc3 c5")
    .replace(/\\+/g, "");
}

function cleanOcr(text, { collapseParagraphs = true } = {}) {
  // Two passes: first unlocks patterns that then match (e.g. @x / &.).
  let out = fixFrenchOcr(fixChessOcr(fixChessOcr(text)));
  out = collapseParagraphs ? out.replace(/\s+/g, " ").trim() : tidySpaces(out);
  return out;
}

function isChromeLine(line) {
  if (!line) return true;
  if (/^John Watson/i.test(line)) return true;
  if (/^Les ouvertures pour les enfants/i.test(line)) return true;
  if (/^\|\s*Les ouvertures/i.test(line)) return true;
  if (/^Super Ouverture/i.test(line)) return true;
  if (/^!\s*Super Ouverture/i.test(line)) return true;
  if (/^\[/.test(line) && line.length < 12) return true;
  if (/^[\d|IVX%—–\-RsEFi§°]+\s*$/.test(line)) return true;
  if (/^[la1-5b)]+\)$/i.test(line)) return true;
  if (/^[oO|\\/_®]{2,}$/.test(line)) return true;
  if (line.length < 3) return true;
  if (/^P+$/i.test(line)) return true;
  if (/^[a-z]{1,3}$/i.test(line) && line.length <= 3) return true;
  return false;
}

function letterCount(line) {
  return (line.match(/[a-zàâäéèêëïîôùûüç]/gi) || []).length;
}

function looksLikeProse(line) {
  return line.length >= 18 && letterCount(line) >= 12 && !/^[la1-5b)]+\)$/i.test(line);
}

function hasMoveNoise(line) {
  return /\d\.\.\./.test(line) || /\d+\.[a-hNBRQK0-9]/.test(line) || /\b\d+\.\.\.[a-zA-Z]/.test(line);
}

function normalizeKey(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titleScore(line, titleHint) {
  if (!line || line.length < 4 || line.length > 72) return -1;
  if (hasMoveNoise(line)) return -1;
  if (isChromeLine(line)) return -1;
  // Body sentences mistaken for titles
  if (
    /\best une\b|\bcommence par\b|\bsurvient\b|\bapres 1\./i.test(line) ||
    /\bJuste au moment\b|\bContrairement\b/i.test(line)
  ) {
    return -1;
  }
  const key = normalizeKey(line);
  const hint = normalizeKey(titleHint || "");
  let score = 0;
  if (
    /^(le |la |l |les |defense|gambit|partie|sicilienne|espagnole|anglaise|est |ouest |nimzo|grunfeld|debut|systeme|systemes|giuoco)/i.test(
      key,
    )
  ) {
    score += 3;
  }
  if (
    /giuoco|evans|caro|dragon|najdorf|marshall|philidor|petrov|alekhine|scandinave|hollandaise|slave|benoni|benko|reti|tarrasch|tartakov|tchigorine|albin|morra|alapin|sveshnikov|londres|colle|tromp|nimzo|grunfeld|francaise|anglaise|philidor|ecossaise/.test(
      key,
    )
  ) {
    score += 4;
  }
  if (hint) {
    const hintTokens = hint.split(" ").filter((t) => t.length > 3);
    const hits = hintTokens.filter((t) => key.includes(t)).length;
    score += hits * 4;
    if (key.includes(hint.slice(0, Math.min(12, hint.length))) || hint.includes(key.slice(0, 12))) {
      score += 8;
    }
  }
  if (line.length <= 48) score += 2;
  return score;
}

/** Rejoin PDF line wraps; drop hyphenation at line breaks. */
function joinWrappedLines(parts) {
  let out = "";
  for (const part of parts) {
    if (!out) {
      out = part;
      continue;
    }
    if (/[A-Za-zÀ-ÿ]-$/.test(out)) {
      out = out.slice(0, -1) + part;
    } else {
      out += ` ${part}`;
    }
  }
  return out;
}

/**
 * @param {string} text
 * @param {{ titleHint?: string }} [opts]
 */
function extractFromPage(text, opts = {}) {
  const titleHint = opts.titleHint || "";
  const rawLines = text.split(/\n/).map((l) => l.trim());

  // Rank early title candidates (first ~35 content lines before Positions de base).
  const early = [];
  for (const line of rawLines) {
    if (/^Positions de base/i.test(line)) break;
    if (isChromeLine(line)) continue;
    early.push(line);
    if (early.length >= 35) break;
  }

  let bestIdx = -1;
  let bestScore = 2; // require a minimal score
  for (let i = 0; i < Math.min(early.length, 12); i++) {
    const line = early[i];
    if (!line) continue;
    const score = titleScore(line, titleHint) - i * 0.15; // prefer earlier lines
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  let title = bestIdx >= 0 ? early[bestIdx] : "";
  let subtitle = "";
  if (bestIdx >= 0 && early[bestIdx + 1] && !hasMoveNoise(early[bestIdx + 1]) && early[bestIdx + 1].length < 110) {
    subtitle = early[bestIdx + 1];
  }

  /** @type {string[][]} */
  const bodyParas = [];
  /** @type {string[]} */
  let currentPara = [];
  let mode = "beforeBody";
  let seenTitle = bestIdx < 0;

  const flushPara = () => {
    if (!currentPara.length) return;
    bodyParas.push(currentPara);
    currentPara = [];
  };

  for (const line of rawLines) {
    if (/^Positions de base/i.test(line)) {
      flushPara();
      break;
    }
    if (!line) {
      const last = (currentPara[currentPara.length - 1] ?? "").trim();
      if (mode === "body" && currentPara.length) {
        if (/[A-Za-zÀ-ÿ]-$/.test(last) || /[,:;]$/.test(last) || /\bcomme$/i.test(last)) {
          continue;
        }
        flushPara();
      }
      continue;
    }
    if (isChromeLine(line)) continue;

    if (!seenTitle) {
      if (line === title) {
        seenTitle = true;
        mode = "afterTitle";
      }
      continue;
    }

    if (mode === "afterTitle") {
      if (subtitle && line === subtitle) {
        mode = "body";
        continue;
      }
      mode = "body";
    }

    if (mode === "body") {
      currentPara.push(line);
    }
  }
  flushPara();

  // Fallback: if title detection failed, take all prose before Positions.
  if (!bodyParas.length) {
    const fallback = [];
    for (const line of rawLines) {
      if (/^Positions de base/i.test(line)) break;
      if (isChromeLine(line)) continue;
      if (line === title || line === subtitle) continue;
      if (looksLikeProse(line) || letterCount(line) >= 10) fallback.push(line);
    }
    if (fallback.length) bodyParas.push(fallback);
  }

  const after = text.split(/Positions de base[^\n]*/i)[1] ?? "";
  const afterLines = after.split(/\n/).map((l) => l.trim());
  /** @type {string[]} */
  const captions = [];
  /** @type {string[]} */
  let capBuf = [];
  const flushCap = () => {
    if (!capBuf.length) return;
    let joined = cleanOcr(joinWrappedLines(capBuf));
    // Two-column OCR often glues captions with "__" — keep the longer half.
    if (joined.includes("  ") && joined.length > 120) {
      const parts = joined.split(/\s{2,}/).map((p) => p.trim()).filter((p) => p.length > 40);
      if (parts.length >= 2) {
        for (const part of parts.slice(0, 2)) captions.push(part);
        capBuf = [];
        return;
      }
    }
    if (joined.length > 50 && !/^[_\W]+$/.test(joined)) captions.push(joined);
    capBuf = [];
  };
  for (const line of afterLines) {
    if (!line) {
      flushCap();
      continue;
    }
    const prose = looksLikeProse(line) || (capBuf.length > 0 && letterCount(line) >= 8);
    if (prose) {
      capBuf.push(line);
      continue;
    }
    if (isChromeLine(line)) {
      flushCap();
      continue;
    }
    if (capBuf.length && letterCount(line) >= 6) {
      capBuf.push(line);
      continue;
    }
    flushCap();
  }
  flushCap();

  const paragraphs = bodyParas
    .map((parts) => cleanOcr(joinWrappedLines(parts)))
    .filter((p) => p.length > 20)
    .slice(0, 8);

  const captionBlock = captions
    .slice(0, 5)
    .map((c, i) => `(${i + 1}) ${c}`)
    .join("\n\n");

  const excerptFr = [paragraphs.join("\n\n"), captionBlock]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 5200);

  return {
    title: title ? cleanOcr(title) : cleanOcr(titleHint),
    subtitle: subtitle ? cleanOcr(subtitle) : null,
    excerptFr,
  };
}

function hashPick(seed, n) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return n === 0 ? 0 : h % n;
}

function extractBookNotes(excerptFr) {
  if (!excerptFr) return [];
  return excerptFr
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\s+/g, " ").trim())
    .map((b) => {
      const m = b.match(/^\((\d+)\)\s*(.+)$/);
      return m?.[2]?.trim() ?? null;
    })
    .filter(Boolean);
}

function firstBookProse(excerptFr) {
  if (!excerptFr) return "";
  const block = excerptFr
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\s+/g, " ").trim())
    .find((b) => b && !/^\(\d+\)/.test(b) && !/^[a-zàâä]/.test(b));
  if (!block) return "";
  // Don't split on move numbers like 1.d4
  const masked = block
    .replace(/(\d)\.\.\.([A-Za-z])/g, "$1‹e›$2")
    .replace(/(\d+)\.([a-hRNBQKO])/g, "$1‹d›$2");
  const raw = masked.match(/^[^.!?…]+[.!?…]/)?.[0] ?? masked.slice(0, 240);
  return raw.replace(/‹e›/g, "...").replace(/‹d›/g, ".").slice(0, 280).trim();
}

function movesFromAsk(askFr) {
  const m =
    askFr.match(/après\s+(.+?)\s*[,—–-]/i) ||
    askFr.match(/after\s+(.+?)\s*[,—–-]/i) ||
    askFr.match(/après\s+(.+)$/i);
  return (m?.[1] ?? "").trim();
}

function bookAlignedChoices(mod, themeIdx, allMods, seed) {
  const correctEn = mod.themes.en[themeIdx] ?? mod.themes.en[0];
  const correctFr = mod.themes.fr[themeIdx] ?? mod.themes.fr[0];
  const poolEn = [];
  const poolFr = [];
  for (const other of allMods) {
    if (other.id === mod.id) continue;
    for (let i = 0; i < other.themes.en.length; i++) {
      const en = other.themes.en[i];
      const fr = other.themes.fr[i];
      if (!en || !fr || en === correctEn || fr === correctFr) continue;
      poolEn.push(en);
      poolFr.push(fr);
    }
  }
  const i1 = hashPick(`${seed}:a`, Math.max(poolEn.length, 1));
  let i2 = hashPick(`${seed}:b`, Math.max(poolEn.length, 1));
  if (poolEn.length > 1 && i2 === i1) i2 = (i2 + 1) % poolEn.length;
  const dEn = poolEn.length
    ? [poolEn[i1 % poolEn.length], poolEn.length > 1 ? poolEn[i2 % poolEn.length] : "Ignore development"]
    : ["Ignore development", "Castle without need"];
  const dFr = poolFr.length
    ? [poolFr[i1 % poolFr.length], poolFr.length > 1 ? poolFr[i2 % poolFr.length] : "Ignorer le développement"]
    : ["Ignorer le développement", "Roquer sans nécessité"];
  const rot = hashPick(`${seed}:rot`, 3);
  const ens = [correctEn, dEn[0], dEn[1]];
  const frs = [correctFr, dFr[0], dFr[1]];
  const order = [0, 1, 2].map((_, idx) => (idx + rot) % 3);
  return {
    choices: {
      en: order.map((i) => ens[i]),
      fr: order.map((i) => frs[i]),
    },
    answer: order.indexOf(0),
  };
}

/** Rewrite module basePositions so each Q is tied to Super Ouverture N + book lesson. */
function alignQuizzesWithBook(mod, local, allMods) {
  if (!mod.basePositions?.length || !local?.excerptFr) return null;
  const bookTitle = local.title || mod.names.fr;
  const bookSub = local.subtitle;
  const notes = extractBookNotes(local.excerptFr);
  const lead = firstBookProse(local.excerptFr);

  return mod.basePositions.map((pos, i) => {
    const themeIdx = i % mod.themes.fr.length;
    const themeFr = mod.themes.fr[themeIdx];
    const themeEn = mod.themes.en[themeIdx];
    const moves = movesFromAsk(pos.ask?.fr || "") || movesFromAsk(pos.ask?.en || "");
    const moveBitFr = moves ? `Après ${moves}, ` : "";
    const moveBitEn = moves ? `After ${moves}, ` : "";
    const subBit = bookSub ? ` — « ${bookSub} »` : "";

    const ask = {
      fr: `Super Ouverture ${mod.bookRef} · ${bookTitle}${subBit}. ${moveBitFr}d’après la leçon du livre, quelle idée retenir ?`,
      en: `Super Opening ${mod.bookRef} · ${bookTitle}${subBit}. ${moveBitEn}according to the book lesson, which idea should you keep?`,
    };

    const { choices, answer } = bookAlignedChoices(mod, themeIdx, allMods, `${mod.id}:book:${i}`);
    // Theme 0 → main book prose; later themes → diagram notes when clean.
    const note = themeIdx === 0 ? "" : notes[Math.min(themeIdx - 1, Math.max(notes.length - 1, 0))] || "";
    const whyBody = pickBookWhy(note, lead, mod.plan.fr);
    const whyFr = `${themeFr}. ${whyBody}`;
    const whyEn = `${themeEn}. ${mod.plan.en}`;

    return {
      fen: pos.fen,
      ask,
      choices,
      answer,
      why: {
        fr: whyFr.slice(0, 420),
        en: whyEn.slice(0, 420),
      },
    };
  });
}

/** Prefer clean diagram notes, else lead prose, else our plan paraphrase. */
function pickBookWhy(note, lead, planFr) {
  const usable = (s) => {
    if (!s || s.length < 40) return false;
    if (/_|[|]/.test(s)) return false;
    if (/^[a-zàâä]/.test(s)) return false; // OCR fragment mid-sentence
    const letters = (s.match(/[a-zàâäéèêëïîôùûüç]/gi) || []).length;
    return letters >= 28;
  };
  if (usable(note)) return note;
  if (usable(lead)) return lead;
  return planFr;
}

function extractPrinciplesFromPages() {
  const principlePages = [13, 14, 15, 17, 18];
  const titles = [
    { en: "Development and the centre", fr: "Le développement et le centre" },
    { en: "Never neglect development", fr: "Ne jamais négliger le développement" },
    { en: "King safety first", fr: "La sécurité du roi avant tout" },
    { en: "Outposts and weak pawns", fr: "Avant-postes et pions faibles" },
    { en: "And afterwards?", fr: "Et après ?" },
  ];
  const out = [];
  for (let i = 0; i < principlePages.length; i++) {
    const pageNum = principlePages[i];
    const title = titles[i];
    if (pageNum == null || title == null) continue;
    const file = `page-${String(pageNum).padStart(3, "0")}.txt`;
    const path = join(PAGES, file);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    const body = cleanOcr(
      text
        .split(/\n/)
        .map((l) => l.trim())
        .filter(
          (l) =>
            l.length > 20 &&
            letterCount(l) >= 10 &&
            !/^John Watson/i.test(l) &&
            !/^Comment/i.test(l) &&
            !/^jouer$/i.test(l) &&
            !/^l’ouverture$/i.test(l),
        )
        .join(" "),
    ).slice(0, 1100);
    if (body.length < 80) continue;
    out.push({
      id: `book-principle-${pageNum}`,
      title,
      body: { en: body, fr: body },
      source: "olibris-local",
    });
  }
  return out;
}

function main() {
  if (!existsSync(PAGES) || !existsSync(CURRICULUM)) {
    console.error("Missing pages extract or curriculum.");
    process.exit(1);
  }

  const curriculum = JSON.parse(readFileSync(CURRICULUM, "utf8"));
  const nameById = Object.fromEntries(
    curriculum.modules.map((m) => [m.id, m.names?.fr || m.names?.en || m.id]),
  );

  const byModuleId = {};
  for (const [pageNum, moduleId] of Object.entries(PAGE_TO_MODULE)) {
    const file = `page-${String(pageNum).padStart(3, "0")}.txt`;
    const path = join(PAGES, file);
    if (!existsSync(path)) {
      console.warn("Missing", file);
      continue;
    }
    const text = readFileSync(path, "utf8");
    const extracted = extractFromPage(text, { titleHint: nameById[moduleId] || "" });
    byModuleId[moduleId] = {
      ...extracted,
      pageFile: file,
      source: "olibris-local-extract",
    };
  }

  // Bake book-aligned quizzes + taglines into the committed curriculum.
  // Full Olibris prose stays in the gitignored local overlay only (no Pages redistribute).
  let quizzes = 0;
  for (const mod of curriculum.modules) {
    const local = byModuleId[mod.id];
    if (!local) continue;
    const aligned = alignQuizzesWithBook(mod, local, curriculum.modules);
    if (aligned?.length) {
      // Public why: theme + plan only (no OCR dump in the committed JSON).
      const publicAligned = aligned.map((pos, i) => {
        const themeIdx = i % mod.themes.fr.length;
        return {
          ...pos,
          why: {
            en: `${mod.themes.en[themeIdx]}. ${mod.plan.en}`,
            fr: `${mod.themes.fr[themeIdx]}. ${mod.plan.fr}`,
          },
        };
      });
      local.basePositions = aligned;
      mod.basePositions = publicAligned;
      quizzes += aligned.length;
    }
    if (local.subtitle) {
      mod.tagline = { en: local.subtitle, fr: local.subtitle };
    }
  }

  const principles = extractPrinciplesFromPages();

  const overlay = {
    id: "openings-revision-local",
    generatedAt: new Date().toISOString(),
    sourceFile: "docs/_ouvertures-enfants-texte/",
    warning:
      "Gitignored. Personal study copy of copyrighted Olibris text + richer quiz why. Do not commit or deploy.",
    principles,
    modules: byModuleId,
  };

  const json = `${JSON.stringify(overlay, null, 2)}\n`;
  mkdirSync(dirname(OUT_PUBLIC), { recursive: true });
  writeFileSync(OUT_PUBLIC, json);
  writeFileSync(OUT_DATA, json);

  writeFileSync(CURRICULUM, `${JSON.stringify(curriculum, null, 2)}\n`);
  writeFileSync(
    join(ROOT, "web/public/data/openings-revision.json"),
    `${JSON.stringify(curriculum, null, 2)}\n`,
  );
  const taglines = curriculum.modules.filter((m) => m.tagline).length;

  const lens = Object.values(byModuleId).map((m) => m.excerptFr.length);
  const short = Object.entries(byModuleId)
    .filter(([, m]) => m.excerptFr.length < 500)
    .map(([id, m]) => `${id}:${m.excerptFr.length}`);
  console.log(`Modules: ${Object.keys(byModuleId).length}/50`);
  console.log(`Principles: ${principles.length}`);
  console.log(`Taglines baked: ${taglines}`);
  console.log(`Book-aligned quiz items (committed + local): ${quizzes}`);
  console.log(
    `Excerpt len min/median/max: ${Math.min(...lens)} / ${lens.sort((a, b) => a - b)[25]} / ${Math.max(...lens)}`,
  );
  if (short.length) console.log("Short excerpts:", short.join(", "));
  const sample = byModuleId["sicilian-najdorf"];
  console.log("Najdorf quiz Q1:", sample?.basePositions?.[0]?.ask?.fr?.slice(0, 160));
  console.log("Najdorf why:", sample?.basePositions?.[0]?.why?.fr?.slice(0, 160));
}

main();
