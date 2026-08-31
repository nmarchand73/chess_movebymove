import type { Lang } from "./lang";

export type LandingQuote = {
  id: string;
  text: { en: string; fr: string };
  attribution: string;
  book: "chernov" | "nunn";
};

/** Prefaces, blurbs, and teaching lines from both move-by-move classics. */
export const LANDING_QUOTES: LandingQuote[] = [
  {
    id: "chernov-adventure",
    book: "chernov",
    attribution: "Irving Chernev",
    text: {
      en: "Each game that you play through will be an exciting adventure in chess in which courage, wit, imagination and ingenuity reap their just reward.",
      fr: "Chaque partie que vous parcourez sera une aventure passionnante aux échecs, où courage, esprit, imagination et ingéniosité trouveront leur juste récompense.",
    },
  },
  {
    id: "nunn-attitude",
    book: "nunn",
    attribution: "John Nunn",
    text: {
      en: "In this book, I hope to explain this new attitude to chess in a way that is comprehensible to a wide audience.",
      fr: "Dans ce livre, j’espère expliquer cette nouvelle attitude face aux échecs d’une manière accessible à un large public.",
    },
  },
  {
    id: "chernov-one-piece",
    book: "chernov",
    attribution: "Irving Chernev",
    text: {
      en: "You cannot attack — let alone try to checkmate — with one or two pieces. You must develop all of them, as each one has a job to do.",
      fr: "On ne peut pas attaquer — encore moins mater — avec une ou deux pièces. Il faut toutes les développer, car chacune a un rôle à jouer.",
    },
  },
  {
    id: "nunn-army-bed",
    book: "nunn",
    attribution: "John Nunn",
    text: {
      en: "Early piece development is so crucial that failure to handle it effectively can result in the battle being lost while most of the army is still in bed.",
      fr: "Le développement précoce des pièces est si crucial qu’un mauvais traitement peut faire perdre la bataille alors que la majeure partie de l’armée est encore au lit.",
    },
  },
  {
    id: "chernov-centre-scope",
    book: "chernov",
    attribution: "Irving Chernev",
    text: {
      en: "Pieces placed in the centre enjoy the greatest freedom of action and have the widest scope for their attacking powers.",
      fr: "Les pièces placées au centre jouissent de la plus grande liberté d’action et du plus large rayon pour leurs forces d’attaque.",
    },
  },
  {
    id: "nunn-castle",
    book: "nunn",
    attribution: "John Nunn",
    text: {
      en: "In the great majority of cases it is necessary to castle in order to avoid an early attack on the king.",
      fr: "Dans la grande majorité des cas, il faut roquer pour éviter une attaque précoce contre le roi.",
    },
  },
  {
    id: "chernov-absorb",
    book: "chernov",
    attribution: "Irving Chernev",
    text: {
      en: "It is by appreciating and absorbing what they teach so pleasurably that we can best learn to play Logical Chess, Move by Move.",
      fr: "C’est en goûtant et en assimilant ce qu’ils enseignent avec tant de plaisir que l’on apprend le mieux à jouer Logical Chess, Move by Move.",
    },
  },
  {
    id: "nunn-gambit",
    book: "nunn",
    attribution: "Gambit Publications",
    text: {
      en: "A top-class grandmaster explains step-by-step how chess games are won.",
      fr: "Un grand maître de premier plan explique, pas à pas, comment se gagnent les parties d’échecs.",
    },
  },
  {
    id: "chernov-territory",
    book: "chernov",
    attribution: "Irving Chernev",
    text: {
      en: "Occupation of the centre means control of the most valuable territory. It leaves less room for the enemy’s pieces, and makes defence difficult.",
      fr: "Occuper le centre, c’est contrôler le territoire le plus précieux. Cela laisse moins d’espace aux pièces adverses et rend la défense difficile.",
    },
  },
  {
    id: "nunn-centre-why",
    book: "nunn",
    attribution: "John Nunn",
    text: {
      en: "The third main objective of opening play is to gain control of the centre. The centre of the board is particularly important for two reasons.",
      fr: "Le troisième grand objectif du jeu d’ouverture est de conquérir le contrôle du centre. Le centre de l’échiquier est particulièrement important pour deux raisons.",
    },
  },
  {
    id: "chernov-barden",
    book: "chernov",
    attribution: "Leonard Barden",
    text: {
      en: "The novice who plays through Logical Chess can learn an ocean of basic chess wisdom.",
      fr: "Le débutant qui parcourt Logical Chess peut apprendre un océan de sagesse échiquéenne élémentaire.",
    },
  },
  {
    id: "nunn-jargon",
    book: "nunn",
    attribution: "John Nunn",
    text: {
      en: "Virtually every move is explained using words that everyone can understand. Jargon is avoided as far as possible.",
      fr: "Presque chaque coup est expliqué avec des mots que tout le monde comprend. Le jargon est évité autant que possible.",
    },
  },
  {
    id: "chernov-positional",
    book: "chernov",
    attribution: "Irving Chernev",
    text: {
      en: "It is an understanding of positional play that restrains the master from embarking on premature, foolish attacks.",
      fr: "C’est la compréhension du jeu positionnel qui retient le maître de se lancer dans des attaques prématurées et absurdes.",
    },
  },
  {
    id: "nunn-principles",
    book: "nunn",
    attribution: "John Nunn",
    text: {
      en: "The emphasis is on general principles that readers will be able to use in their own games, and detailed analysis is only given where it is necessary.",
      fr: "L’accent est mis sur les principes généraux que le lecteur pourra appliquer dans ses propres parties ; l’analyse détaillée n’intervient que lorsqu’elle est nécessaire.",
    },
  },
  {
    id: "chernov-fair-share",
    book: "chernov",
    attribution: "Irving Chernev",
    text: {
      en: "Black must fight for an equal share of the good squares.",
      fr: "Les Noirs doivent se battre pour une part égale des bonnes cases.",
    },
  },
  {
    id: "nunn-rooks",
    book: "nunn",
    attribution: "John Nunn",
    text: {
      en: "Castling has the beneficial side-effect of making way for the rooks to occupy the central files, which are the most likely to become open during the middlegame.",
      fr: "Le roque a l’effet bénéfique de libérer la voie pour que les tours occupent les colonnes centrales, les plus susceptibles de s’ouvrir en milieu de jeu.",
    },
  },
  {
    id: "chernov-knight-centre",
    book: "chernov",
    attribution: "Irving Chernev",
    text: {
      en: "A knight posted in the centre reaches out in eight directions and attacks eight squares. Standing at the side of the board, its range is limited to four.",
      fr: "Un cavalier posté au centre rayonne dans huit directions et attaque huit cases. Sur le bord de l’échiquier, sa portée se limite à quatre.",
    },
  },
  {
    id: "nunn-flexible",
    book: "nunn",
    attribution: "John Nunn",
    text: {
      en: "Today, most games still start with one of these two moves, but the contemporary attitude to opening play is more flexible and open-minded.",
      fr: "Aujourd’hui, la plupart des parties commencent encore par l’un de ces deux coups, mais l’attitude contemporaine face à l’ouverture est plus souple et ouverte.",
    },
  },
  {
    id: "chernov-release",
    book: "chernov",
    attribution: "Irving Chernev",
    text: {
      en: "A good way to begin is to release two pieces at one stroke, and this can be done by advancing one of the centre pawns.",
      fr: "Une bonne façon de commencer est de libérer deux pièces d’un seul coup, en avançant l’un des pions du centre.",
    },
  },
  {
    id: "nunn-exceptions",
    book: "nunn",
    attribution: "John Nunn",
    text: {
      en: "Just as with any chess guideline, there will always be exceptions — but these cases are the exception; in most cases, early castling is advisable.",
      fr: "Comme pour toute règle échiquéenne, il y aura toujours des exceptions — mais ce sont bien des exceptions ; dans la plupart des cas, un roque précoce est conseillé.",
    },
  },
  {
    id: "chernov-combinations",
    book: "chernov",
    attribution: "Irving Chernev",
    text: {
      en: "Positional play assures the master that definite winning opportunities will then disclose themselves, and decisive combinations will appear on the board.",
      fr: "Le jeu positionnel assure au maître que des occasions nettes de gagner se présenteront alors, et que des combinaisons décisives apparaîtront sur l’échiquier.",
    },
  },
  {
    id: "nunn-dogma",
    book: "nunn",
    attribution: "John Nunn",
    text: {
      en: "If a leading grandmaster thinks the position requires a particular plan, he will embark on it even if in doing so he flouts much of the dogma of the past.",
      fr: "Si un grand maître de premier plan estime que la position exige un plan particulier, il s’y engage même si cela bouscule une bonne part des dogmes du passé.",
    },
  },
  {
    id: "chernov-painless",
    book: "chernov",
    attribution: "Irving Chernev",
    text: {
      en: "You will familiarize yourself with the principles painlessly — not by rote but by seeing their effect in the progress of a game.",
      fr: "Vous vous familiariserez avec les principes sans effort — non par cœur, mais en voyant leur effet dans le déroulement d’une partie.",
    },
  },
  {
    id: "nunn-palliser",
    book: "nunn",
    attribution: "Richard Palliser",
    text: {
      en: "Nunn’s work is relevant to all strengths of player… readers will be fully aware of what both sides are aiming for in each general type of position.",
      fr: "L’œuvre de Nunn convient à tous les niveaux… les lecteurs sauront clairement ce que chaque camp vise dans chaque type général de position.",
    },
  },
];

export function landingQuoteText(quote: LandingQuote, lang: Lang): string {
  return quote.text[lang];
}

export function landingQuoteBookLabel(book: LandingQuote["book"], lang: Lang = "en"): string {
  switch (book) {
    case "chernov":
      return lang === "fr" ? "Les Échecs logiques" : "Logical Chess";
    case "nunn":
      return lang === "fr" ? "Comprendre les échecs" : "Understanding Chess";
    default: {
      const _exhaustive: never = book;
      return _exhaustive;
    }
  }
}
