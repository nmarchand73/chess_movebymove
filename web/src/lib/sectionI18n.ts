import type { Lang } from "./lang";

/** Localized book section titles/blurbs keyed by English source title. */
const SECTION_I18N: Record<string, { title: string; blurb: string }> = {
  "The Kingside Attack": {
    title: "L'attaque à l'aile roi",
    blurb: "Ouvertures 1.e4 et attaques à l'aile roi",
  },
  "The Queen’s Pawn Opening": {
    title: "L'ouverture du pion dame",
    blurb: "Structures 1.d4 et jeu à l'aile dame",
  },
  "The Queen's Pawn Opening": {
    title: "L'ouverture du pion dame",
    blurb: "Structures 1.d4 et jeu à l'aile dame",
  },
  "The Chess Master Explains his Ideas": {
    title: "Le maître d'échecs explique ses idées",
    blurb: "Commentaires de maître",
  },
  "Opening Themes": {
    title: "Thèmes d'ouverture",
    blurb: "Développement, sécurité du roi et contrôle du centre",
  },
  "Attacking Play": {
    title: "Jeu d'attaque",
    blurb: "Sacrifices, réserves et roques opposés",
  },
  "Defensive Play": {
    title: "Jeu défensif",
    blurb: "Sacrifices défensifs et contre-attaque",
  },
  "Positional Play": {
    title: "Jeu positionnel",
    blurb: "Structure, espace, avant-postes et jeu de pièces",
  },
  "Endgame Themes": {
    title: "Thèmes de finale",
    blurb: "Roi actif, pions passés, tour en septième",
  },
  "Open games (1.e4 e5)": {
    title: "Parties ouvertes (1.e4 e5)",
    blurb: "Parties ouvertes (1.e4 e5)",
  },
  "Semi-open (1.e4 other)": {
    title: "Semi-ouvertes (1.e4 autres)",
    blurb: "Semi-ouvertes (1.e4 autres)",
  },
  "Closed & Indian (1.d4)": {
    title: "Fermées et indiennes (1.d4)",
    blurb: "Fermées et indiennes (1.d4)",
  },
  "Flank openings": {
    title: "Ouvertures de flanc",
    blurb: "Ouvertures de flanc",
  },
  "1 · Foundations": {
    title: "1 · Fondations",
    blurb: "1 · Fondations",
  },
  "2 · Pins": {
    title: "2 · Clouages",
    blurb: "2 · Clouages",
  },
  "3 · Forks & double attacks": {
    title: "3 · Fourchettes & attaques doubles",
    blurb: "3 · Fourchettes & attaques doubles",
  },
  "4 · Discoveries & double check": {
    title: "4 · Découvertes & double échec",
    blurb: "4 · Découvertes & double échec",
  },
  "5 · Guards & overload": {
    title: "5 · Défenseurs & surcharge",
    blurb: "5 · Défenseurs & surcharge",
  },
  "6 · No retreat & skewer": {
    title: "6 · Sans retraite & enfilade",
    blurb: "6 · Sans retraite & enfilade",
  },
  "7 · Promotion, back rank & mates": {
    title: "7 · Promotion, dernier rang & mats",
    blurb: "7 · Promotion, dernier rang & mats",
  },
  "8 · Defense & counterattack": {
    title: "8 · Défense & contre-attaque",
    blurb: "8 · Défense & contre-attaque",
  },
  "Game 1": { title: "Partie 1", blurb: "Partie 1" },
  "Game 2": { title: "Partie 2", blurb: "Partie 2" },
  "Game 3": { title: "Partie 3", blurb: "Partie 3" },
  "Game 4": { title: "Partie 4", blurb: "Partie 4" },
  "Game 5": { title: "Partie 5", blurb: "Partie 5" },
  "Game 6": { title: "Partie 6", blurb: "Partie 6" },
  "Game 7": { title: "Partie 7", blurb: "Partie 7" },
  "Game 8": { title: "Partie 8", blurb: "Partie 8" },
};

export function localizeSectionTitle(title: string, lang: Lang): string {
  if (lang !== "fr") return title;
  return SECTION_I18N[title]?.title ?? title;
}

export function localizeSectionBlurb(title: string, blurb: string, lang: Lang): string {
  if (lang !== "fr") return blurb;
  return SECTION_I18N[title]?.blurb ?? blurb;
}
