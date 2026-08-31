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
};

export function localizeSectionTitle(title: string, lang: Lang): string {
  if (lang !== "fr") return title;
  return SECTION_I18N[title]?.title ?? title;
}

export function localizeSectionBlurb(title: string, blurb: string, lang: Lang): string {
  if (lang !== "fr") return blurb;
  return SECTION_I18N[title]?.blurb ?? blurb;
}
