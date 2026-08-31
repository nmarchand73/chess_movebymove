import type { Lang } from "./lang";
import type { BookId } from "../types";

export type BookDetails = {
  /** Display title for the current UI language. */
  title: string;
  published: string;
  tagline: string;
  description: string;
  audience: string;
  highlights: string[];
  famousFor?: string;
};

const EN: Record<BookId, BookDetails> = {
  chernov: {
    title: "Logical Chess: Move By Move",
    published: "1957 · Batsford (algebraic ed.)",
    tagline: "The classic that explains every move of every game.",
    description:
      "Irving Chernev walks through 33 complete games from the late 1800s to the 1950s in plain, witty prose. "
      + "He explains why each move was played — development, king safety, pawn structure, and when to attack — "
      + "so you absorb fundamentals by reading rather than memorizing theory.",
    audience: "Beginners to ~1400 · first full games",
    highlights: [
      "Every single move commented — a format Chernev virtually invented for learners",
      "16 kingside attacking games (mostly 1.e4), then queen’s-pawn structures, then masterclass finales",
      "Famous names: Capablanca, Alekhine, Tarrasch, Rubinstein, and Chernev himself",
      "Timeless advice on piece activity; openings are dated but ideas are not",
    ],
    famousFor:
      "Leonard Barden: “The novice who plays through Logical Chess can learn an ocean of basic chess wisdom.”",
  },
  nunn: {
    title: "Understanding Chess Move by Move",
    published: "2001 · Gambit Publications",
    tagline: "A modern grandmaster updates the move-by-move idea for today’s chess.",
    description:
      "Grandmaster John Nunn annotates 30 games from the 1990s — Kasparov, Kramnik, Shirov, Polgar, and others — "
      + "with the same move-by-move clarity as Chernev, but focused on how strong players think now. "
      + "Jargon is kept to a minimum; principles come first, deep variations only when they matter.",
    audience: "Club players ~1200–2000 · after basic tactics",
    highlights: [
      "Grouped by theme: opening ideas, middlegame (attack, defence, positional), then endgames",
      "Modern structures: Grünfeld, Nimzo-Indian, Sicilian systems, Catalan, and more",
      "Written by an Olympiad gold medallist and three-time BCF Book of the Year winner",
      "Often recommended as the “grown-up” companion to Chernev’s classic",
    ],
    famousFor:
      "Gambit: “A top-class grandmaster explains step-by-step how chess games are won.”",
  },
  intentions: {
    title: "Play by Intention",
    published: "Curriculum · Chernev & Nunn",
    tagline: "Learn to name your plan — then study games that embody it.",
    description:
      "A guided path through selected games from Chernev and Nunn, reorganised around eleven play intentions. "
      + "Each intention lists typical openings and their main idea, then points you to teaching games that illustrate the plan.",
    audience: "Club players · after a few annotated games",
    highlights: [
      "Eleven intentions with a table of openings and main ideas",
      "Reuses the best teaching games — no duplicate commentary files",
      "Progress is shared with the source books",
      "Each game carries a short “why this game” note for the intention",
    ],
    famousFor:
      "Study the same classics twice: once in book order, once by intention.",
  },
};

const FR: Record<BookId, BookDetails> = {
  chernov: {
    title: "Les Échecs logiques : coup par coup",
    published: "1957 · Batsford (éd. algébrique)",
    tagline: "Le classique qui explique chaque coup de chaque partie.",
    description:
      "Irving Chernev parcourt 33 parties complètes, de la fin du XIXᵉ siècle aux années 1950, dans une prose claire et pleine d’esprit. "
      + "Il explique pourquoi chaque coup a été joué — développement, sécurité du roi, structure de pions, et moment d’attaquer — "
      + "pour assimiler les bases en lisant plutôt qu’en mémorisant la théorie.",
    audience: "Débutants jusqu’à ~1400 · premières parties complètes",
    highlights: [
      "Chaque coup commenté — un format que Chernev a presque inventé pour les apprenants",
      "16 parties d’attaque à l’aile roi (surtout 1.e4), puis structures de pion dame, puis finales de maître",
      "Grands noms : Capablanca, Alekhine, Tarrasch, Rubinstein, et Chernev lui-même",
      "Conseils intemporels sur l’activité des pièces ; les ouvertures vieillissent, les idées non",
    ],
    famousFor:
      "Leonard Barden : « Le débutant qui parcourt Logical Chess peut apprendre un océan de sagesse échiquéenne élémentaire. »",
  },
  nunn: {
    title: "Comprendre les échecs coup par coup",
    published: "2001 · Gambit Publications",
    tagline: "Un grand maître moderne actualise l’idée coup par coup pour les échecs d’aujourd’hui.",
    description:
      "Le grand maître John Nunn annote 30 parties des années 1990 — Kasparov, Kramnik, Shirov, Polgar et d’autres — "
      + "avec la même clarté coup par coup que Chernev, mais centrée sur la façon dont les joueurs forts pensent aujourd’hui. "
      + "Le jargon reste minimal ; les principes d’abord, les variantes profondes seulement quand elles comptent.",
    audience: "Joueurs de club ~1200–2000 · après les tactiques de base",
    highlights: [
      "Regroupé par thèmes : idées d’ouverture, milieu de jeu (attaque, défense, positionnel), puis finales",
      "Structures modernes : Grünfeld, nimzo-indienne, systèmes siciliens, catalane, et plus",
      "Écrit par un médaillé d’or olympique et triple lauréat du BCF Book of the Year",
      "Souvent recommandé comme le compagnon « adulte » du classique de Chernev",
    ],
    famousFor:
      "Gambit : « Un grand maître de premier plan explique, pas à pas, comment se gagnent les parties d’échecs. »",
  },
  intentions: {
    title: "Jouer par intention",
    published: "Parcours · Chernev & Nunn",
    tagline: "Apprenez à nommer votre plan — puis étudiez les parties qui l’incarnent.",
    description:
      "Un chemin guidé à travers des parties choisies de Chernev et Nunn, réorganisées autour de onze intentions de jeu. "
      + "Chaque intention liste les ouvertures typiques et leur idée principale, puis pointe vers des parties pédagogiques qui illustrent le plan.",
    audience: "Joueurs de club · après quelques parties annotées",
    highlights: [
      "Onze intentions avec un tableau d’ouvertures et d’idées principales",
      "Réutilise les meilleures parties pédagogiques — pas de fichiers de commentaire en double",
      "La progression est partagée avec les livres sources",
      "Chaque partie porte une courte note « pourquoi cette partie » pour l’intention",
    ],
    famousFor:
      "Étudiez les mêmes classiques deux fois : une fois dans l’ordre du livre, une fois par intention.",
  },
};

export function getBookDetails(bookId: BookId | string, lang: Lang): BookDetails | undefined {
  const catalog = lang === "fr" ? FR : EN;
  if (bookId in catalog) {
    return catalog[bookId as BookId];
  }
  return undefined;
}

/** Localized display title; falls back to catalog/index title. */
export function bookDisplayTitle(
  bookId: BookId | string,
  lang: Lang,
  fallbackTitle: string,
): string {
  return getBookDetails(bookId, lang)?.title ?? fallbackTitle;
}
