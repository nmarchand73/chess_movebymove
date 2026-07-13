const OPENING_TOOLTIPS: Record<string, string> = {
  "Giuoco Piano":
    "Develop quickly with Bc4 aiming at f7. White builds a pawn centre with c3 and d4, then opens lines for a kingside attack.",
  "Colle System":
    "Quiet development (d4, e3, Bd3, Nf3) hides a kingside plan. The key break is e4, opening diagonals toward Black's king.",
  "French Defense":
    "Black stakes d5 and builds a solid e6–d5 chain. Play is slower and counter-attacking: strike White's centre before launching your own attack.",
  "King's Gambit Declined":
    "Black refuses the f-pawn gift and keeps central control (often …c5). White may still push f4, but development and the centre matter more than material.",
  "Ruy Lopez":
    "White's Bb5 pressures the knight on c6 and the e5 pawn. Both sides fight for central squares; Black must develop actively to avoid falling behind.",
  "Queen's Gambit Declined":
    "Black declines the c-pawn and builds a compact centre with …e6. The main task is developing the c8-bishop while keeping the d5 pawn secure.",
  "Queen's Gambit Accepted":
    "Black takes the c4 pawn but White recaptures space with d4 and a strong pawn centre. Black must develop fast before White's centre becomes permanent.",
  "Stonewall Attack":
    "White forms a rigid pawn wall (d4–e3–f4–c3) and often posts a knight on e5. The plan is a direct kingside attack along the f-file.",
  "English Opening":
    "White plays c4 without an early central clash. Flexible piece play from the flank, controlling d5 and e5 before committing to d4 or e4.",
  "Nimzo-Indian Defense":
    "Black pins the c3-knight with …Bb4, contesting the centre without locking the position early. Often trades bishop for knight to dent White's pawn structure.",
  "Queen's Indian Defense":
    "Black fianchettoes on b7 and controls e4 from the queenside. A solid, positional defence: restrain White's centre, then counter on the wings.",
  "Sicilian Defense":
    "Asymmetric fight after …c5: Black attacks the d4 centre from the flank. Imbalanced positions — White's space versus Black's counterplay.",
  "Scandinavian Defense":
    "Black immediately challenges 1.e4 with …d5. Early queen activity, but quick development and central pressure can compensate if White overreaches.",
};

function normalizeOpeningName(name: string): string {
  return name.replace(/\u2019/g, "'");
}

export function getOpeningTooltip(opening?: string): string | undefined {
  if (!opening) return undefined;
  return OPENING_TOOLTIPS[normalizeOpeningName(opening)];
}
