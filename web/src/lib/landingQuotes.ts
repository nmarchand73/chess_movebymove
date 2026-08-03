export type LandingQuote = {
  id: string;
  text: string;
  attribution: string;
  book: "chernov" | "nunn";
};

/** Prefaces, blurbs, and teaching lines from both move-by-move classics. */
export const LANDING_QUOTES: LandingQuote[] = [
  {
    id: "chernov-adventure",
    book: "chernov",
    attribution: "Irving Chernev",
    text:
      "Each game that you play through will be an exciting adventure in chess in which courage, wit, imagination and ingenuity reap their just reward.",
  },
  {
    id: "nunn-attitude",
    book: "nunn",
    attribution: "John Nunn",
    text:
      "In this book, I hope to explain this new attitude to chess in a way that is comprehensible to a wide audience.",
  },
  {
    id: "chernov-one-piece",
    book: "chernov",
    attribution: "Irving Chernev",
    text: "You cannot attack — let alone try to checkmate — with one or two pieces. You must develop all of them, as each one has a job to do.",
  },
  {
    id: "nunn-army-bed",
    book: "nunn",
    attribution: "John Nunn",
    text:
      "Early piece development is so crucial that failure to handle it effectively can result in the battle being lost while most of the army is still in bed.",
  },
  {
    id: "chernov-centre-scope",
    book: "chernov",
    attribution: "Irving Chernev",
    text:
      "Pieces placed in the centre enjoy the greatest freedom of action and have the widest scope for their attacking powers.",
  },
  {
    id: "nunn-castle",
    book: "nunn",
    attribution: "John Nunn",
    text:
      "In the great majority of cases it is necessary to castle in order to avoid an early attack on the king.",
  },
  {
    id: "chernov-absorb",
    book: "chernov",
    attribution: "Irving Chernev",
    text:
      "It is by appreciating and absorbing what they teach so pleasurably that we can best learn to play Logical Chess, Move by Move.",
  },
  {
    id: "nunn-gambit",
    book: "nunn",
    attribution: "Gambit Publications",
    text: "A top-class grandmaster explains step-by-step how chess games are won.",
  },
  {
    id: "chernov-territory",
    book: "chernov",
    attribution: "Irving Chernev",
    text:
      "Occupation of the centre means control of the most valuable territory. It leaves less room for the enemy’s pieces, and makes defence difficult.",
  },
  {
    id: "nunn-centre-why",
    book: "nunn",
    attribution: "John Nunn",
    text:
      "The third main objective of opening play is to gain control of the centre. The centre of the board is particularly important for two reasons.",
  },
  {
    id: "chernov-barden",
    book: "chernov",
    attribution: "Leonard Barden",
    text: "The novice who plays through Logical Chess can learn an ocean of basic chess wisdom.",
  },
  {
    id: "nunn-jargon",
    book: "nunn",
    attribution: "John Nunn",
    text:
      "Virtually every move is explained using words that everyone can understand. Jargon is avoided as far as possible.",
  },
  {
    id: "chernov-positional",
    book: "chernov",
    attribution: "Irving Chernev",
    text:
      "It is an understanding of positional play that restrains the master from embarking on premature, foolish attacks.",
  },
  {
    id: "nunn-principles",
    book: "nunn",
    attribution: "John Nunn",
    text:
      "The emphasis is on general principles that readers will be able to use in their own games, and detailed analysis is only given where it is necessary.",
  },
  {
    id: "chernov-fair-share",
    book: "chernov",
    attribution: "Irving Chernev",
    text: "Black must fight for an equal share of the good squares.",
  },
  {
    id: "nunn-rooks",
    book: "nunn",
    attribution: "John Nunn",
    text:
      "Castling has the beneficial side-effect of making way for the rooks to occupy the central files, which are the most likely to become open during the middlegame.",
  },
  {
    id: "chernov-knight-centre",
    book: "chernov",
    attribution: "Irving Chernev",
    text:
      "A knight posted in the centre reaches out in eight directions and attacks eight squares. Standing at the side of the board, its range is limited to four.",
  },
  {
    id: "nunn-flexible",
    book: "nunn",
    attribution: "John Nunn",
    text:
      "Today, most games still start with one of these two moves, but the contemporary attitude to opening play is more flexible and open-minded.",
  },
  {
    id: "chernov-release",
    book: "chernov",
    attribution: "Irving Chernev",
    text:
      "A good way to begin is to release two pieces at one stroke, and this can be done by advancing one of the centre pawns.",
  },
  {
    id: "nunn-exceptions",
    book: "nunn",
    attribution: "John Nunn",
    text:
      "Just as with any chess guideline, there will always be exceptions — but these cases are the exception; in most cases, early castling is advisable.",
  },
  {
    id: "chernov-combinations",
    book: "chernov",
    attribution: "Irving Chernev",
    text:
      "Positional play assures the master that definite winning opportunities will then disclose themselves, and decisive combinations will appear on the board.",
  },
  {
    id: "nunn-dogma",
    book: "nunn",
    attribution: "John Nunn",
    text:
      "If a leading grandmaster thinks the position requires a particular plan, he will embark on it even if in doing so he flouts much of the dogma of the past.",
  },
  {
    id: "chernov-painless",
    book: "chernov",
    attribution: "Irving Chernev",
    text:
      "You will familiarize yourself with the principles painlessly — not by rote but by seeing their effect in the progress of a game.",
  },
  {
    id: "nunn-palliser",
    book: "nunn",
    attribution: "Richard Palliser",
    text:
      "Nunn’s work is relevant to all strengths of player… readers will be fully aware of what both sides are aiming for in each general type of position.",
  },
];

export function landingQuoteBookLabel(book: LandingQuote["book"]): string {
  switch (book) {
    case "chernov":
      return "Logical Chess";
    case "nunn":
      return "Understanding Chess";
    default: {
      const _exhaustive: never = book;
      return _exhaustive;
    }
  }
}
