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
  "Alekhine Defense":
    "Black provokes White's pawns forward with …Nf6, then attacks the overextended centre. Timing matters: strike the centre before White consolidates.",
  "Benko Gambit":
    "Black sacrifices a wing pawn for long-term queenside pressure on open files. White must accept the pawn and defend patiently or refuse and let Black keep the initiative.",
  "Budapest Gambit":
    "Black offers a pawn for rapid development and attacking chances after …Ng4. White can hold the extra material, but must develop carefully to avoid a swarming attack.",
  "Caro-Kann Defense":
    "Solid structure with …c6 supporting …d5. Black aims for safe development and a firm centre rather than the sharp imbalances of the Sicilian.",
  "Catalan Opening":
    "White combines d4 and c4 with a g2-bishop pressuring the long diagonal. Flexible central play: space on the queenside with latent pressure against …d5.",
  "Grünfeld Defense":
    "Black allows a big White centre, then counter-attacks it with …d5 and …c5. Dynamic piece play against pawn mass — the centre is a target, not a fortress.",
  "King's Indian Defense":
    "Black allows White a broad pawn centre, then strikes back with …e5 or …c5. Kingside fianchetto leads to opposite-wing attacks and tactical melees.",
  "Modern Defense":
    "Black delays central pawn commits with …g6 and …Bg7, inviting White to grab space. Counter-attack the overextended centre once pieces are coordinated.",
  "Pirc Defense":
    "A hypermodern setup: let White build in the centre, then undermine with …d6, …Nf6, and …g6. Flexible development with kingside castling and central breaks.",
  "Scotch Opening":
    "White opens the centre immediately with 3.d4 after …exd4. Open, tactical positions where quick development and piece activity decide the game.",
};

function normalizeOpeningName(name: string): string {
  return name.replace(/\u2019/g, "'").replace(/Defence/g, "Defense");
}

export function getOpeningTooltip(opening?: string): string | undefined {
  if (!opening) return undefined;

  const normalized = normalizeOpeningName(opening);
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
