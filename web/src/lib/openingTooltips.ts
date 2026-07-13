export type OpeningTooltip = {
  goal: string;
  explanation: string;
};

const OPENING_TOOLTIPS: Record<string, OpeningTooltip> = {
  "Giuoco Piano": {
    goal: "Develop fast and pressure f7 while building a strong pawn centre.",
    explanation:
      "Bc4 eyes the weak f7 square; c3 and d4 support a central bind, then open lines for a kingside attack.",
  },
  "Colle System": {
    goal: "Develop quietly, then break with e4 to open lines at the black king.",
    explanation:
      "d4, e3, Bd3, and Nf3 look harmless until e4 frees the bishops and launches a direct kingside assault.",
  },
  "French Defense": {
    goal: "Challenge White's e4 centre with a solid d5 chain, then counter-attack it.",
    explanation:
      "The e6–d5 wall is slow but resilient — strike at White's centre pawns before launching your own play.",
  },
  "King's Gambit Declined": {
    goal: "Refuse the gambit pawn and keep central control with active development.",
    explanation:
      "Lines with ...c5 deny White easy attacking chances; piece activity and the centre matter more than the f-pawn.",
  },
  "Ruy Lopez": {
    goal: "Pressure e5 and slow Black's development with the bishop on b5.",
    explanation:
      "Both sides fight for central squares; Black must challenge the bishop and develop actively or fall behind.",
  },
  "Queen's Gambit Declined": {
    goal: "Hold d5 without taking on a weak isolated queenside pawn.",
    explanation:
      "...e6 supports d5; the main task is developing the c8-bishop while keeping the centre intact.",
  },
  "Queen's Gambit Accepted": {
    goal: "Grab queenside space early, then return the pawn when White builds a bind.",
    explanation:
      "...dxc4 wins time on the wing, but Black must develop fast before White's d4–e4 centre becomes permanent.",
  },
  "Stonewall Attack": {
    goal: "Form a rigid pawn wall and storm the kingside, often with a knight on e5.",
    explanation:
      "The d4–e3–f4 setup targets f7 along the f-file; manoeuvres behind the wall prepare a direct attack.",
  },
  "English Opening": {
    goal: "Control d5 and e5 from the flank before committing to a central pawn break.",
    explanation:
      "c4 delays the central clash; flexible development can transpose into reversed Sicilian or QGD structures.",
  },
  "Nimzo-Indian Defense": {
    goal: "Pin the c3-knight and contest the centre without fixing pawn structure early.",
    explanation:
      "...Bb4 forces awkward choices; exchanging bishop for knight often leaves White doubled c-pawns but Black easy development.",
  },
  "Queen's Indian Defense": {
    goal: "Restrain White's centre from the queenside with a b7 fianchetto.",
    explanation:
      "...b6 and ...Bb7 control e4 in solid fashion — wait for the right central break rather than chasing pawns.",
  },
  "Sicilian Defense": {
    goal: "Fight for d4 from the flank and create imbalanced counterplay.",
    explanation:
      "...c5 breaks symmetry; White gets space and an open d-file while Black seeks queenside play and ...d5 or ...e5 breaks.",
  },
  "Scandinavian Defense": {
    goal: "Challenge 1.e4 immediately with ...d5 and active piece play.",
    explanation:
      "The queen comes out early, so rapid development and central pressure matter — White overreaches at their peril.",
  },
  "Alekhine Defense": {
    goal: "Provoke White's pawns forward, then undermine the overextended centre.",
    explanation:
      "...Nf6 invites e5; later ...d6 and ...c5 strike back — timing is critical before White consolidates.",
  },
  "Benko Gambit": {
    goal: "Sacrifice a wing pawn for lasting queenside pressure on the open files.",
    explanation:
      "White must defend the a- and b-files or accept permanent pressure; Black's rooks dominate the queenside.",
  },
  "Budapest Gambit": {
    goal: "Sacrifice a pawn for rapid development and kingside attacking chances.",
    explanation:
      "...Ng4 and active piece play swarm White if development is careless; holding the pawn needs precise defence.",
  },
  "Caro-Kann Defense": {
    goal: "Build a solid, hard-to-break centre with ...c6 and ...d5.",
    explanation:
      "Fewer sharp imbalances than the Sicilian, but reliable development and fewer structural weaknesses.",
  },
  "Catalan Opening": {
    goal: "Combine a broad queenside pawn duo with long-diagonal pressure from g2.",
    explanation:
      "d4 + c4 + g3 targets ...d5; White enjoys space and queenside play with latent kingside threats.",
  },
  "Grünfeld Defense": {
    goal: "Let White build a big centre, then attack it with ...d5 and ...c5.",
    explanation:
      "Dynamic hypermodern play — Black's pieces target e4 and d4 while the fianchetto bishop controls the long diagonal.",
  },
  "King's Indian Defense": {
    goal: "Allow White a broad centre, then break with ...e5 or ...c5 for a kingside attack.",
    explanation:
      "The g7 bishop eyes the centre; opposite-side castling often leads to fierce tactical battles on both wings.",
  },
  "Modern Defense": {
    goal: "Delay central pawn commits, let White overextend, then strike the centre.",
    explanation:
      "...g6 and ...Bg7 invite White space; counter with ...c5 or ...e5 once pieces are coordinated.",
  },
  "Pirc Defense": {
    goal: "Let White occupy the centre, then undermine it with flexible kingside fianchetto development.",
    explanation:
      "...d6, ...Nf6, and ...g6 delay commitment; timely ...c5 or ...e5 breaks challenge White's pawn mass.",
  },
  "Scotch Opening": {
    goal: "Open the centre immediately and seize the initiative with active pieces.",
    explanation:
      "3.d4 after ...exd4 leads to open, tactical positions where development speed and central control decide the game.",
  },
};

function normalizeOpeningName(name: string): string {
  return name.replace(/\u2019/g, "'").replace(/Defence/g, "Defense");
}

function lookupOpeningTooltip(normalized: string): OpeningTooltip | undefined {
  const exact = OPENING_TOOLTIPS[normalized];
  if (exact) return exact;

  const families = Object.keys(OPENING_TOOLTIPS).sort((a, b) => b.length - a.length);
  for (const family of families) {
    const normFamily = normalizeOpeningName(family);
    if (
      normalized === normFamily ||
      normalized.startsWith(`${normFamily},`) ||
      normalized.startsWith(`${normFamily} `)
    ) {
      return OPENING_TOOLTIPS[family];
    }
  }

  if (normalized.startsWith("Sicilian,") || normalized.startsWith("Sicilian ")) {
    return OPENING_TOOLTIPS["Sicilian Defense"];
  }

  return undefined;
}

export function getOpeningTooltip(opening?: string): OpeningTooltip | undefined {
  if (!opening) return undefined;
  return lookupOpeningTooltip(normalizeOpeningName(opening));
}

export function contextualizeOpeningExplanation(opening: string, explanation: string): string {
  const trimmed = explanation.trim();
  if (!trimmed) return `In the ${opening}.`;
  const lower = trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  return `In the ${opening}, ${lower}`;
}

export function formatOpeningTooltip(opening: string, tip: OpeningTooltip): string {
  return `${tip.goal} ${contextualizeOpeningExplanation(opening, tip.explanation)}`;
}
