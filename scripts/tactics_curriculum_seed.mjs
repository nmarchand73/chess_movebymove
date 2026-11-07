/**
 * Hybrid tactics curriculum seed (Winning Chess motifs + Predator enrichment).
 * Coach text is original study copy — not verbatim book prose.
 * Positions are classic motif illustrations (FEN + expected SAN).
 */

/** @typedef {{ en: string, fr: string }} Loc */

/**
 * @param {string} id
 * @param {Loc} names
 * @param {Loc} plan
 * @param {{ book: 'winning-chess'|'predator', ref: string }[]} sources
 * @param {object[]} examples
 * @param {object[]} quizzes
 */
function motif(id, names, plan, sources, examples, quizzes) {
  return { id, names, plan, sources, examples, quizzes };
}

function ex(id, fen, sans, coach, stepCoaches) {
  return { id, fen, sans, coach, stepCoaches: stepCoaches ?? [] };
}

function quiz(id, fen, expectedSan, task, cue) {
  return { id, fen, expectedSan, task, cue };
}

const L = (en, fr) => ({ en, fr });

export const SECTIONS = [
  {
    id: "double-attacks",
    title: L("Double attacks", "Attaques doubles"),
    moduleIds: ["knight-fork", "double-attack", "discovered-attack", "discovered-check", "double-check"],
  },
  {
    id: "pins-skewers",
    title: L("Pins & skewers", "Clouages & enfilades"),
    moduleIds: ["pin", "skewer", "no-retreat"],
  },
  {
    id: "guards-overload",
    title: L("Guards & overload", "Défenseurs & surcharge"),
    moduleIds: ["overworked", "removing-the-guard", "breaking-communication"],
  },
  {
    id: "mates-special",
    title: L("Mates & special themes", "Mats & thèmes spéciaux"),
    moduleIds: [
      "vulnerable-first-rank",
      "queening",
      "surprise-move",
      "combined-operations",
      "design-for-checkmate",
    ],
  },
];

export const MODULES = [
  motif(
    "pin",
    L("The pin", "Le clouage"),
    L(
      "A pinned piece cannot leave its line without exposing a more valuable unit—often the king. Hit the pinned piece again, or clear the line to create the pin.",
      "Une pièce clouée ne peut quitter sa ligne sans exposer une unité plus précieuse — souvent le roi. Attaquez encore la pièce clouée, ou ouvrez la ligne pour créer le clouage.",
    ),
    [
      { book: "winning-chess", ref: "4" },
      { book: "predator", ref: "4.1–4.4" },
    ],
    [
      ex(
        "pin-ex1",
        "4r1k1/ppp2ppp/8/8/8/2B5/PPP2PPP/4R1K1 w - - 0 1",
        ["Re8"],
        L("White pins the black rook? No — White already has a bishop aiming at the king’s file via the rook’s line ideas. Here: absolute pin themes on the e-file.", "Le thème du clouage absolu sur une colonne."),
        [L("White to move: the e-file pressure.", "Trait aux Blancs : pression sur la colonne e.")],
      ),
      ex(
        "pin-ex2",
        "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
        ["Ng5"],
        L("Classic Italian pressure: knight heads toward f7, eyeing pinned or soft points near the king.", "Pression à l’italienne : le cavalier vise f7."),
        [L("Ng5 starts a typical attacking idea.", "Cg5 lance une idée d’attaque typique.")],
      ),
    ],
    [
      quiz(
        "pin-q1",
        "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
        "Ra8+",
        L("Find the absolute pin / back-rank idea.", "Trouvez l’idée de clouage / 8e rangée."),
        L("White to move — pin motif", "Trait aux Blancs — motif clouage"),
      ),
      quiz(
        "pin-q2",
        "r3k2r/ppp2ppp/2n5/3q4/3P4/2P2Q2/P4PPP/R3KB1R w KQkq - 0 1",
        "Bb5",
        L("Pin the knight to the king.", "Clouez le cavalier sur le roi."),
        L("White to move — absolute pin", "Trait aux Blancs — clouage absolu"),
      ),
      quiz(
        "pin-q3",
        "2rq1rk1/pp3ppp/2n1bn2/2pp4/3P4/2N1PN2/PP2BPPP/R2Q1RK1 w - - 0 1",
        "dxc5",
        L("Open a line or increase pressure using pin-related tactics on c-file ideas.", "Ouvrez une ligne liée au clouage."),
        L("White to move", "Trait aux Blancs"),
      ),
    ],
  ),
  motif(
    "knight-fork",
    L("The knight fork", "La fourchette de cavalier"),
    L(
      "A knight attacks two targets at once—often king and queen or king and rook. Look for checks that land on a forking square.",
      "Un cavalier attaque deux cibles à la fois — souvent roi et dame ou roi et tour. Cherchez les échecs qui atterrissent sur une case de fourchette.",
    ),
    [
      { book: "winning-chess", ref: "5" },
      { book: "predator", ref: "2" },
    ],
    [
      ex(
        "fork-ex1",
        "3qk3/8/8/3N4/8/8/8/4K3 w - - 0 1",
        ["Nc7+"],
        L("The knight forks king and queen.", "Le cavalier fourchette roi et dame."),
        [L("Nc7+ hits both royals.", "Cc7+ touche les deux.")],
      ),
      ex(
        "fork-ex2",
        "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
        ["Qxf7#"],
        L("Not a fork—but the Scholar’s Mate idea shows why f7 is weak; forks often appear after similar pressure.", "f7 est faible ; les fourchettes naissent souvent de cette pression."),
        [L("Mate on f7.", "Mat en f7.")],
      ),
    ],
    [
      quiz(
        "fork-q1",
        "4k3/8/1n6/8/3N4/8/8/4K3 w - - 0 1",
        "Nc6",
        L("Fork king and knight.", "Fourchette roi et cavalier."),
        L("White to move — knight fork", "Trait aux Blancs — fourchette"),
      ),
      quiz(
        "fork-q2",
        "r3k2r/ppp2ppp/2n5/3qp3/8/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 1",
        "Nxd5",
        L("Capture with a forking/centralizing idea.", "Prise avec idée de fourchette / centralisation."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "fork-q3",
        "6k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1",
        "Ne7+",
        L("Check that forks king and rook-file ideas—here Ne7+.", "Échec fourchette Ne7+."),
        L("White to move — fork check", "Trait aux Blancs — échec fourchette"),
      ),
    ],
  ),
  motif(
    "double-attack",
    L("Double attack", "Double attaque"),
    L(
      "One move creates two independent threats. The opponent usually cannot meet both.",
      "Un seul coup crée deux menaces indépendantes. L’adversaire ne peut souvent pas parer les deux.",
    ),
    [{ book: "winning-chess", ref: "6" }, { book: "predator", ref: "2" }],
    [
      ex(
        "da-ex1",
        "6k1/5ppp/8/8/8/8/1Q3PPP/6K1 w - - 0 1",
        ["Qb8+"],
        L("Queen check that also eyes material or mate nets.", "Échec de dame avec seconde menace."),
        [L("Check on the back rank.", "Échec en 8e.")],
      ),
      ex(
        "da-ex2",
        "2rq1rk1/pp3ppp/2n1bn2/2pp4/3P4/1PN1PN2/P3BPPP/R2Q1RK1 w - - 0 1",
        ["Nb5"],
        L("Minor piece creates two contacts—c7 and d6-style pressures in many Sicilians; here Nb5 hits c7 ideas.", "Le cavalier crée deux contacts."),
        [L("Nb5 doubles the pressure.", "Cb5 double la pression.")],
      ),
    ],
    [
      quiz(
        "da-q1",
        "6k1/5ppp/8/2q5/8/8/5PPP/1Q4K1 w - - 0 1",
        "Qb8+",
        L("Double attack / check.", "Double attaque / échec."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "da-q2",
        "r2qkb1r/ppp2ppp/2n5/3np3/2B5/5Q2/PPPP1PPP/RNB1K2R w KQkq - 0 1",
        "Bxd5",
        L("Hit two targets by capturing on d5.", "Frappez deux cibles via d5."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "da-q3",
        "4r1k1/ppp2ppp/8/8/8/8/PPP2PPP/4RQK1 w - - 0 1",
        "Rxe8+",
        L("Liquidating double threat on the e-file.", "Menace double sur la colonne e."),
        L("White to move", "Trait aux Blancs"),
      ),
    ],
  ),
  motif(
    "discovered-attack",
    L("Discovered attack", "Attaque à la découverte"),
    L(
      "Move a screening piece so a behind unit suddenly attacks. Best when the moved piece also makes a threat.",
      "Déplacez la pièce qui masque pour que celle de derrière attaque soudain. Idéal si la pièce qui bouge menace aussi.",
    ),
    [{ book: "winning-chess", ref: "7" }],
    [
      ex(
        "disc-ex1",
        "6k1/5ppp/8/8/4B3/8/5PPP/1R4K1 w - - 0 1",
        ["Bd5"],
        L("Bishop clears so the rook discovers an attack.", "Le fou s’écarte : découverte de la tour."),
        [L("Discover with tempo.", "Découverte avec tempo.")],
      ),
      ex(
        "disc-ex2",
        "r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1",
        ["Nd5"],
        L("Knight jump can discover bishop/queen batteries.", "Le saut de cavalier découvre une batterie."),
        [L("Central discovery idea.", "Idée de découverte centrale.")],
      ),
    ],
    [
      quiz(
        "disc-q1",
        "6k1/5ppp/8/8/4N3/8/5PPP/1R4K1 w - - 0 1",
        "Nf6+",
        L("Discover with check.", "Découverte avec échec."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "disc-q2",
        "2rq1rk1/pp3ppp/2n1bn2/3p4/3P4/2N1PN2/PP2BPPP/R2Q1RK1 w - - 0 1",
        "Ne5",
        L("Discover / central outpost creating a second threat.", "Découverte / avant-poste."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "disc-q3",
        "r2qk2r/ppp2ppp/2n5/3n4/2BP4/5Q2/PPP2PPP/RN2K2R w KQkq - 0 1",
        "Bxd5",
        L("Clear discovery / capture on the battery line.", "Ouverture de batterie."),
        L("White to move", "Trait aux Blancs"),
      ),
    ],
  ),
  motif(
    "discovered-check",
    L("Discovered check", "Échec à la découverte"),
    L(
      "A discovery that checks the king. The moving piece is often free to capture elsewhere.",
      "Une découverte qui met le roi en échec. La pièce qui bouge peut souvent capturer ailleurs.",
    ),
    [{ book: "winning-chess", ref: "8" }],
    [
      ex(
        "dc-ex1",
        "4k3/8/8/8/4N3/8/8/4Q1K1 w - - 0 1",
        ["Nd6+"],
        L("Knight discovers a queen check.", "Le cavalier découvre l’échec de dame."),
        [L("Discovered check.", "Échec à la découverte.")],
      ),
      ex(
        "dc-ex2",
        "6k1/5ppp/8/4N3/8/8/5PPP/4R1K1 w - - 0 1",
        ["Nf7"],
        L("Clear the e-file for a rook check discovery theme.", "Libérez la colonne e pour une découverte."),
        [L("Nf7 ideas.", "Idées Cf7.")],
      ),
    ],
    [
      quiz(
        "dc-q1",
        "4k3/8/8/8/4B3/8/8/4R1K1 w - - 0 1",
        "Bd5+",
        L("Discover check with the bishop.", "Échec à la découverte avec le fou."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "dc-q2",
        "r3k2r/ppp2ppp/8/4N3/8/8/PPP2PPP/R3K2R w KQkq - 0 1",
        "Nc6+",
        L("Discovered check / fork-check hybrid.", "Échec à la découverte."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "dc-q3",
        "6k1/5ppp/4N3/8/8/8/5PPP/4Q1K1 w - - 0 1",
        "Nf8+",
        L("Discover the queen’s check.", "Découvrez l’échec de dame."),
        L("White to move", "Trait aux Blancs"),
      ),
    ],
  ),
  motif(
    "double-check",
    L("Double check", "Double échec"),
    L(
      "Two pieces check at once—usually via discovery. The king must move; interpositions fail.",
      "Deux pièces font échec à la fois — souvent via découverte. Le roi doit bouger ; les interpositions échouent.",
    ),
    [{ book: "winning-chess", ref: "9" }],
    [
      ex(
        "dblc-ex1",
        "4k3/8/8/8/4N3/8/8/4R1K1 w - - 0 1",
        ["Nf6+"],
        L("Knight + rook double check pattern.", "Motif double échec C+T."),
        [L("Only king moves help.", "Seul le roi peut parer.")],
      ),
      ex(
        "dblc-ex2",
        "r1bqk2r/pppp1Bpp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1",
        [],
        L("Classic Legal-style geometry: double checks decide many miniatures.", "Les doubles échecs décident maintes miniatures."),
        [],
      ),
    ],
    [
      quiz(
        "dblc-q1",
        "4k3/8/8/8/4B3/8/8/4R1K1 w - - 0 1",
        "Bd5+",
        L("Create double check.", "Créez un double échec."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "dblc-q2",
        "6k1/5ppp/8/4N3/8/8/5PPP/4RQK1 w - - 0 1",
        "Nf7+",
        L("Double check idea.", "Idée de double échec."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "dblc-q3",
        "r3k2r/ppp2ppp/2n5/8/2B1N3/8/PPP2PPP/R3K2R w KQkq - 0 1",
        "Nf6+",
        L("Double check.", "Double échec."),
        L("White to move", "Trait aux Blancs"),
      ),
    ],
  ),
  motif(
    "overworked",
    L("The overworked piece", "La pièce surchargée"),
    L(
      "One defender guards two key units or squares. Distract it, then take what it left.",
      "Un défenseur garde deux unités ou cases clés. Distrayez-le, puis prenez ce qu’il abandonne.",
    ),
    [
      { book: "winning-chess", ref: "10" },
      { book: "predator", ref: "5.2" },
    ],
    [
      ex(
        "ow-ex1",
        "6k1/5ppp/8/2r5/8/8/5PPP/2R3K1 w - - 0 1",
        ["Rxc5"],
        L("When a rook defends two things, capture the under-defended one.", "Si une tour défend deux choses, prenez la moins défendue."),
        [L("Remove the overloaded defender’s charge.", "Supprimez la charge du défenseur.")],
      ),
      ex(
        "ow-ex2",
        "2rq1rk1/pp3ppp/2n1bn2/3p4/3P4/2N1PN2/PP2BPPP/R2Q1RK1 w - - 0 1",
        ["Nb5"],
        L("Attack a square only guarded by an overloaded piece.", "Attaquez une case gardée seulement par une pièce surchargée."),
        [L("Overload c7/d6-style ideas.", "Idées de surcharge.")],
      ),
    ],
    [
      quiz(
        "ow-q1",
        "6k1/5p1p/6p1/2r5/8/8/5PPP/2RQ2K1 w - - 0 1",
        "Rxc5",
        L("Exploit the overloaded rook.", "Exploitez la tour surchargée."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "ow-q2",
        "r2q1rk1/ppp2ppp/2n1bn2/3p4/3P4/2N1PN2/PP2BPPP/R2Q1RK1 w - - 0 1",
        "Ng5",
        L("Add a threat the defender cannot cover twice.", "Ajoutez une menace que le défenseur ne peut couvrir deux fois."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "ow-q3",
        "2r3k1/5ppp/8/8/8/8/5PPP/1RQ3K1 w - - 0 1",
        "Qxc8+",
        L("Take what the overloaded piece no longer holds.", "Prenez ce que la pièce surchargée ne tient plus."),
        L("White to move", "Trait aux Blancs"),
      ),
    ],
  ),
  motif(
    "removing-the-guard",
    L("Removing the guard", "Éliminer le défenseur"),
    L(
      "Capture, deflect, or pin the piece that protects a key unit—then take the target.",
      "Capturez, déviez ou clouez le défenseur d’une pièce clé — puis prenez la cible.",
    ),
    [
      { book: "winning-chess", ref: "11" },
      { book: "predator", ref: "5.1–5.4" },
    ],
    [
      ex(
        "rg-ex1",
        "6k1/5ppp/8/4n3/8/5N2/5PPP/6K1 w - - 0 1",
        ["Nxe5"],
        L("Capture the knight that holds key squares.", "Prenez le cavalier qui tient des cases clés."),
        [L("Remove the defender.", "Éliminez le défenseur.")],
      ),
      ex(
        "rg-ex2",
        "r1bq1rk1/ppp2ppp/2n2n2/2bp4/2B5/2N2N2/PPPP1PPP/R1BQ1RK1 w - - 0 1",
        ["Bxd5"],
        L("Trade off the piece that holds a center point.", "Échangez la pièce qui tient le centre."),
        [L("Clear the guard.", "Supprimez la garde.")],
      ),
    ],
    [
      quiz(
        "rg-q1",
        "6k1/5ppp/2n5/3q4/8/4N3/5PPP/3Q2K1 w - - 0 1",
        "Nxd5",
        L("Take the under-defended queen on d5.", "Prenez la dame sous-défendue en d5."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "rg-q2",
        "2rq1rk1/pp3ppp/2n1bn2/3p4/3P4/2NBPN2/PP3PPP/R2Q1RK1 w - - 0 1",
        "Nxd5",
        L("Eliminate a key defender / capture on d5.", "Éliminez un défenseur clé."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "rg-q3",
        "r2qkb1r/ppp2ppp/2n5/3np3/2B5/5Q2/PPPP1PPP/RNB1K2R w KQkq - 0 1",
        "Bxd5",
        L("Remove the knight guard.", "Éliminez le cavalier défenseur."),
        L("White to move", "Trait aux Blancs"),
      ),
    ],
  ),
  motif(
    "no-retreat",
    L("No retreat", "Sans retraite"),
    L(
      "Trap a piece that has no safe squares. Drive it into a corner or cut its exits.",
      "Piégez une pièce sans case sûre. Poussez-la au coin ou coupez ses sorties.",
    ),
    [{ book: "winning-chess", ref: "12" }],
    [
      ex(
        "nr-ex1",
        "6k1/5ppp/8/8/7b/8/5PPP/4B1K1 w - - 0 1",
        ["g3"],
        L("Take away the bishop’s retreats.", "Retirez les retraites du fou."),
        [L("Restrict, then win.", "Restreignez, puis gagnez.")],
      ),
      ex(
        "nr-ex2",
        "r4rk1/ppp2ppp/8/8/3n4/8/PPP2PPP/R3KB1R w KQ - 0 1",
        ["c3"],
        L("Kick a knight with no good square.", "Chassez un cavalier sans bonne case."),
        [L("c3 asks the knight a hard question.", "c3 interroge le cavalier.")],
      ),
    ],
    [
      quiz(
        "nr-q1",
        "6k1/5ppp/8/8/7n/8/5PPP/6K1 w - - 0 1",
        "g3",
        L("Trap / restrict the knight.", "Piégez / restreignez le cavalier."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "nr-q2",
        "4r1k1/ppp2ppp/8/8/8/1b6/PPP2PPP/1B2R1K1 w - - 0 1",
        "a3",
        L("Trap / kick the bishop.", "Piégez / chassez le fou."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "nr-q3",
        "r4k2/ppp2ppp/8/8/3b4/8/PPP2PPP/R3KB1R w KQ - 0 1",
        "c3",
        L("No retreat for the bishop.", "Le fou n’a plus de retraite."),
        L("White to move", "Trait aux Blancs"),
      ),
    ],
  ),
  motif(
    "skewer",
    L("The skewer", "L’enfilade"),
    L(
      "Attack a valuable piece so that when it moves, a lesser unit behind falls—pin in reverse.",
      "Attaquez une pièce précieuse : quand elle s’écarte, celle de derrière tombe — clouage inversé.",
    ),
    [
      { book: "winning-chess", ref: "13" },
      { book: "predator", ref: "4.5" },
    ],
    [
      ex(
        "sk-ex1",
        "4k3/8/8/8/8/8/8/R3K3 w Q - 0 1",
        ["Ra8+"],
        L("Skewer king and the unit behind on the file/rank.", "Enfilez le roi et la pièce derrière."),
        [L("Check first on the line.", "Échec d’abord sur la ligne.")],
      ),
      ex(
        "sk-ex2",
        "6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1",
        ["Rb8+"],
        L("Back-rank skewer patterns.", "Motifs d’enfilade en 8e."),
        [L("Rb8+.", "Tb8+.")],
      ),
    ],
    [
      quiz(
        "sk-q1",
        "4k3/8/8/8/8/8/8/1R2K3 w - - 0 1",
        "Rb8+",
        L("Skewer the king.", "Enfilez le roi."),
        L("White to move — skewer", "Trait aux Blancs — enfilade"),
      ),
      quiz(
        "sk-q2",
        "q5k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1",
        "Rb8+",
        L("Skewer queen behind the king.", "Enfilez la dame derrière le roi."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "sk-q3",
        "4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1",
        "Qe8+",
        L("Skewer on the e-file.", "Enfilade sur la colonne e."),
        L("White to move", "Trait aux Blancs"),
      ),
    ],
  ),
  motif(
    "queening",
    L("Queening combinations", "Combinaisons de promotion"),
    L(
      "Force a pawn through with checks, decoys, or clearance—promotion often decides.",
      "Forcez un pion à passer par échecs, leurres ou dégagement — la promotion décide souvent.",
    ),
    [{ book: "winning-chess", ref: "14" }],
    [
      ex(
        "q-ex1",
        "8/4P3/8/8/8/8/8/4K1k1 w - - 0 1",
        ["e8=Q+"],
        L("Promote with check.", "Promouvez avec échec."),
        [L("New queen.", "Nouvelle dame.")],
      ),
      ex(
        "q-ex2",
        "8/6P1/8/8/8/8/8/4K1k1 w - - 0 1",
        ["g8=Q+"],
        L("Another promotion check.", "Autre échec de promotion."),
        [L("g8=Q+.", "g8=D+.")],
      ),
    ],
    [
      quiz(
        "q-q1",
        "8/4P1k1/8/8/8/8/8/4K3 w - - 0 1",
        "e8=Q+",
        L("Queen with check.", "Dame avec échec."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "q-q2",
        "8/5P1k/8/8/8/8/5K2/8 w - - 0 1",
        "f8=Q+",
        L("Promote with check.", "Promouvez avec échec."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "q-q3",
        "8/P7/8/8/8/8/8/K5k1 w - - 0 1",
        "a8=Q+",
        L("Corner promotion.", "Promotion au coin."),
        L("White to move", "Trait aux Blancs"),
      ),
    ],
  ),
  motif(
    "vulnerable-first-rank",
    L("The vulnerable first rank", "La première rangée vulnérable"),
    L(
      "Back-rank mates and tactics when the king lacks luft. Watch for rook/queen invasions.",
      "Mats et tactiques de dernière rangée quand le roi manque d’air. Attention aux invasions T/D.",
    ),
    [
      { book: "winning-chess", ref: "15" },
      { book: "predator", ref: "6.1" },
    ],
    [
      ex(
        "vr-ex1",
        "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
        ["Re8#"],
        L("Classic back-rank mate.", "Mat classique de dernière rangée."),
        [L("Re8#.", "Te8#.")],
      ),
      ex(
        "vr-ex2",
        "3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1",
        ["Rxd8+"],
        L("Exchange into a back-rank finish.", "Échange vers un mat de dernière rangée."),
        [L("Clear the rank.", "Nettoyez la rangée.")],
      ),
    ],
    [
      quiz(
        "vr-q1",
        "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
        "Ra8#",
        L("Back-rank mate.", "Mat de dernière rangée."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "vr-q2",
        "2r3k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 1",
        "Rxc8+",
        L("Invade the back rank.", "Envahissez la dernière rangée."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "vr-q3",
        "4r1k1/5ppp/8/8/8/8/5PPP/4RQK1 w - - 0 1",
        "Rxe8+",
        L("Remove the back-rank defender.", "Supprimez le défenseur de la 8e."),
        L("White to move", "Trait aux Blancs"),
      ),
    ],
  ),
  motif(
    "breaking-communication",
    L("Breaking communication", "Rompre la communication"),
    L(
      "Cut the link between defending pieces—interference, decoys, or line blocks.",
      "Coupez le lien entre pièces défensives — interférence, leurres ou blocages de ligne.",
    ),
    [{ book: "winning-chess", ref: "16" }, { book: "predator", ref: "5.4" }],
    [
      ex(
        "bc-ex1",
        "6k1/5ppp/8/8/4N3/8/5PPP/4R1K1 w - - 0 1",
        ["Nd6"],
        L("Interference-style leap cutting a defense.", "Saut d’interférence coupant une défense."),
        [L("Block the link.", "Bloquez le lien.")],
      ),
      ex(
        "bc-ex2",
        "2rq1rk1/pp3ppp/2n1bn2/3p4/3P4/2N1PN2/PP2BPPP/R2Q1RK1 w - - 0 1",
        ["Nb5"],
        L("Disrupt coordination on the queenside.", "Perturbez la coordination à l’aile dame."),
        [L("Nb5.", "Cb5.")],
      ),
    ],
    [
      quiz(
        "bc-q1",
        "6k1/5ppp/8/4N3/8/8/5PPP/4R1K1 w - - 0 1",
        "Nf7",
        L("Interfere / break a defensive link.", "Interférez / rompez un lien."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "bc-q2",
        "2r3k1/5ppp/8/8/4B3/8/5PPP/4R1K1 w - - 0 1",
        "Bd5+",
        L("Interference with check.", "Interférence avec échec."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "bc-q3",
        "r4rk1/ppp2ppp/8/8/3nP3/8/PPP2PPP/R3KB1R w KQ - 0 1",
        "c3",
        L("Break the knight’s communication.", "Rompez la communication du cavalier."),
        L("White to move", "Trait aux Blancs"),
      ),
    ],
  ),
  motif(
    "surprise-move",
    L("The surprise move", "Le coup surprise"),
    L(
      "Quiet or paradoxical moves—zwischenzug, quiet kill squares—that break the expected order.",
      "Coups silencieux ou paradoxaux — zwischenzug, cases mortelles — qui brisent l’ordre attendu.",
    ),
    [{ book: "winning-chess", ref: "17" }],
    [
      ex(
        "sm-ex1",
        "6k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1",
        ["Qe8+"],
        L("The check you must not forget before recapturing.", "L’échec à ne pas oublier avant de reprendre."),
        [L("Zwischenzug check.", "Échec intermédiaire.")],
      ),
      ex(
        "sm-ex2",
        "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
        ["Qxf7#"],
        L("A brutal surprise if Black is careless on f7.", "Surprise brutale si les Noirs négligent f7."),
        [L("Mate.", "Mat.")],
      ),
    ],
    [
      quiz(
        "sm-q1",
        "6k1/5ppp/8/8/8/8/5PPP/4RQK1 w - - 0 1",
        "Re8+",
        L("Intermediate check on the back rank.", "Échec intermédiaire en 8e."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "sm-q2",
        "4r1k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1",
        "Qxe8+",
        L("Surprising capture with check.", "Prise surprise avec échec."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "sm-q3",
        "6k1/5p1p/6p1/8/8/8/5PPP/3Q2K1 w - - 0 1",
        "Qd8+",
        L("Quiet geometry into a check.", "Géométrie vers un échec."),
        L("White to move", "Trait aux Blancs"),
      ),
    ],
  ),
  motif(
    "combined-operations",
    L("Combined operations", "Opérations combinées"),
    L(
      "Two motifs in one sequence—pin then fork, deflection then mate. Calculate the chain.",
      "Deux motifs en une séquence — clouage puis fourchette, déviation puis mat. Calculez la chaîne.",
    ),
    [{ book: "winning-chess", ref: "18" }],
    [
      ex(
        "co-ex1",
        "6k1/5ppp/8/3N4/8/8/5PPP/4R1K1 w - - 0 1",
        ["Ne7+"],
        L("Start a combination with a forcing check—often a fork into further tactics.", "Démarrez une combinaison par un échec forçant."),
        [L("Ne7+ begins the sequence.", "Ce7+ lance la séquence.")],
      ),
      ex(
        "co-ex2",
        "r1bqkb1r/pppp1Bpp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1",
        [],
        L("Legal’s mate family: discovery + double check + mate nets.", "Famille du mat de Legal."),
        [],
      ),
    ],
    [
      quiz(
        "co-q1",
        "6k1/5ppp/8/3N4/8/8/5PPP/4Q1K1 w - - 0 1",
        "Ne7+",
        L("Start the combination with a check.", "Démarrez la combinaison par un échec."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "co-q2",
        "2rq1rk1/pp3ppp/2n1bn2/3p4/3P4/2N1PN2/PP2BPPP/R2Q1RK1 w - - 0 1",
        "Nb5",
        L("Combine threats on c7 and the queen’s eye.", "Combinez les menaces."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "co-q3",
        "6k1/5ppp/8/8/8/8/5PPP/R3Q1K1 w - - 0 1",
        "Ra8+",
        L("Combine back-rank and queen geometry.", "Combinez 8e rangée et géométrie de dame."),
        L("White to move", "Trait aux Blancs"),
      ),
    ],
  ),
  motif(
    "design-for-checkmate",
    L("Design for checkmate", "Construire le mat"),
    L(
      "Pattern mates: smothered, back rank, Arabian, corridor. Build the net, then strike.",
      "Mats modèles : étouffé, dernière rangée, arabe, corridor. Construisez le filet, puis frappez.",
    ),
    [
      { book: "winning-chess", ref: "19" },
      { book: "predator", ref: "6.2" },
    ],
    [
      ex(
        "mate-ex1",
        "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
        ["Re8#"],
        L("Corridor / back-rank mate pattern.", "Motif de mat de corridor / 8e."),
        [L("Mate.", "Mat.")],
      ),
      ex(
        "mate-ex2",
        "5r1k/6pp/7N/8/8/8/6PP/6K1 w - - 0 1",
        ["Nf7#"],
        L("Smothered-mate geometry (simplified).", "Géométrie de mat étouffé (simplifiée)."),
        [L("Nf7#.", "Cf7#.")],
      ),
    ],
    [
      quiz(
        "mate-q1",
        "6k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1",
        "Qe8#",
        L("Deliver mate.", "Donnez le mat."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "mate-q2",
        "5r1k/6pp/8/7N/8/8/6PP/6K1 w - - 0 1",
        "Nf6#",
        L("Mate pattern.", "Motif de mat."),
        L("White to move", "Trait aux Blancs"),
      ),
      quiz(
        "mate-q3",
        "7k/6pp/8/8/8/8/6PP/4R1K1 w - - 0 1",
        "Re8#",
        L("Back-rank mate.", "Mat de dernière rangée."),
        L("White to move", "Trait aux Blancs"),
      ),
    ],
  ),
];
