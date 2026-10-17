/**
 * Build data/openings-revision.json — 50 Super Opening modules with
 * original pedagogical examples (not OCR from the Olibris PDF).
 *
 * Usage: node scripts/build_openings_revision.mjs
 */
import { writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Chess } from "../web/node_modules/chess.js/dist/esm/chess.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/** @typedef {{ bookRef: number, id: string, names: {en: string, fr: string}, ecoPrefixes: string[], plan: {en: string, fr: string}, themes: {en: string[], fr: string[]}, line: string[], branches?: string[][], gameIds: string[] }} RawModule */

/** @type {RawModule[]} */
const RAW = [
  {
    bookRef: 1,
    id: "giuoco-piano",
    names: { en: "Giuoco Piano", fr: "Giuoco Piano" },
    ecoPrefixes: ["C50", "C53", "C54"],
    plan: {
      en: "Develop fast, castle, and fight for the centre with c3 and d4 while eyeing f7.",
      fr: "Développez vite, roquez, et disputez le centre avec c3 et d4 en visant f7.",
    },
    themes: {
      en: ["Bc4 eyes f7", "c3 prepares d4", "Don’t neglect ...d5 for Black"],
      fr: ["Fc4 vise f7", "c3 prépare d4", "Les Noirs ne doivent pas négliger …d5"],
    },
    line: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4", "exd4", "cxd4", "Bb4+"],
    branches: [["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "d3"], ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "b4"]],
    gameIds: ["chernov-001", "chernov-002", "chernov-005"],
  },
  {
    bookRef: 2,
    id: "evans-gambit",
    names: { en: "Evans Gambit", fr: "Gambit Evans" },
    ecoPrefixes: ["C51", "C52"],
    plan: {
      en: "Sacrifice b4 to gain tempi and blast open the centre against the Italian bishop.",
      fr: "Sacrifiez b4 pour gagner des temps et ouvrir le centre contre le fou italien.",
    },
    themes: {
      en: ["b4 for time", "c3 and d4 follow fast", "King hunt themes on the open board"],
      fr: ["b4 pour le temps", "c3 et d4 suivent vite", "Chasse au roi sur l’échiquier ouvert"],
    },
    line: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "b4", "Bxb4", "c3", "Ba5", "d4", "exd4"],
    gameIds: [],
  },
  {
    bookRef: 3,
    id: "two-knights",
    names: { en: "Two Knights Defence", fr: "Défense des deux Cavaliers" },
    ecoPrefixes: ["C55", "C56", "C57", "C58", "C59"],
    plan: {
      en: "Black meets Bc4 with ...Nf6, inviting sharp play; White can try Ng5 or quieter lines.",
      fr: "Les Noirs répondent Fc4 par …Cf6, invitant un jeu vif ; les Blancs peuvent jouer Cg5 ou plus calme.",
    },
    themes: {
      en: ["...Nf6 hits e4", "Ng5 attacks f7", "Fried Liver and Traxler ideas"],
      fr: ["…Cf6 attaque e4", "Cg5 attaque f7", "Idées Foie frit et Traxler"],
    },
    line: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5", "d5", "exd5", "Na5"],
    branches: [["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "d3"], ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5", "d5", "exd5", "Nxd5", "Nxf7"]],
    gameIds: [],
  },
  {
    bookRef: 4,
    id: "kings-gambit",
    names: { en: "King’s Gambit", fr: "Gambit du Roi" },
    ecoPrefixes: ["C30", "C31", "C32", "C33", "C34", "C35", "C36", "C37", "C38", "C39"],
    plan: {
      en: "Offer the f-pawn to open lines and seize the centre; Black may accept or decline.",
      fr: "Offrez le pion f pour ouvrir des lignes et prendre le centre ; les Noirs peuvent accepter ou refuser.",
    },
    themes: {
      en: ["f4 opens the f-file", "King safety after ...Qh4+", "Declined lines keep the centre"],
      fr: ["f4 ouvre la colonne f", "Sécurité du roi après …Dh4+", "Les lignes refusées gardent le centre"],
    },
    line: ["e4", "e5", "f4", "exf4", "Nf3", "g5", "h4", "g4", "Ne5"],
    branches: [["e4", "e5", "f4", "Bc5"], ["e4", "e5", "f4", "d5"]],
    gameIds: ["chernov-004"],
  },
  {
    bookRef: 5,
    id: "danish-centre",
    names: { en: "Danish Gambit and Centre Game", fr: "Gambit danois et partie du Centre" },
    ecoPrefixes: ["C21", "C22"],
    plan: {
      en: "Open the centre at once with d4; the Danish offers pawns for rapid development.",
      fr: "Ouvrez le centre tout de suite avec d4 ; le danois offre des pions pour un développement rapide.",
    },
    themes: {
      en: ["d4 opens lines", "Two bishops vs extra pawns", "Queen early in Centre Game"],
      fr: ["d4 ouvre les lignes", "La paire de fous contre des pions", "Dame précoce dans la partie du Centre"],
    },
    line: ["e4", "e5", "d4", "exd4", "c3", "dxc3", "Bc4", "cxb2", "Bxb2"],
    branches: [["e4", "e5", "d4", "exd4", "Qxd4", "Nc6", "Qe3"]],
    gameIds: [],
  },
  {
    bookRef: 6,
    id: "goring-latvian",
    names: { en: "Göring and Latvian Gambits", fr: "Gambits Göring et letton" },
    ecoPrefixes: ["C44", "C40"],
    plan: {
      en: "Aggressive pawn sacrifices: Göring from a Scotch setup; Latvian with an early ...f5.",
      fr: "Sacrifices de pions agressifs : Göring depuis une écossaise ; letton avec …f5 précoce.",
    },
    themes: {
      en: ["c3 gambit ideas", "...f5 is double-edged", "Punish undeveloped kings"],
      fr: ["Idées de gambit c3", "…f5 est à double tranchant", "Punissez les rois non développés"],
    },
    line: ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "c3", "dxc3", "Bc4"],
    branches: [["e4", "e5", "Nf3", "f5"]],
    gameIds: [],
  },
  {
    bookRef: 7,
    id: "bishop-vienna",
    names: { en: "Bishop’s Opening and Vienna Game", fr: "Début du Fou et partie viennoise" },
    ecoPrefixes: ["C23", "C24", "C25", "C26", "C27", "C28", "C29"],
    plan: {
      en: "Avoid early Nf3: Bc4 or Nc3 keep options for f4 and flexible centre play.",
      fr: "Évitez Cf3 trop tôt : Fc4 ou Cc3 gardent l’option f4 et un centre flexible.",
    },
    themes: {
      en: ["Delay Nf3", "f4 breaks", "Vienna Gambit sharpness"],
      fr: ["Retarder Cf3", "Ruptures f4", "Vigueur du gambit viennois"],
    },
    line: ["e4", "e5", "Nc3", "Nf6", "Bc4", "Nc6", "d3"],
    branches: [["e4", "e5", "Bc4", "Nf6", "d3"], ["e4", "e5", "Nc3", "Nf6", "f4"]],
    gameIds: [],
  },
  {
    bookRef: 8,
    id: "scotch",
    names: { en: "Scotch Game", fr: "Écossaise" },
    ecoPrefixes: ["C45"],
    plan: {
      en: "Open the centre early with d4 after Nf3 and Nc6; piece play and open lines follow.",
      fr: "Ouvrez le centre tôt avec d4 après Cf3 et Cc6 ; jeu de pièces et lignes ouvertes suivent.",
    },
    themes: {
      en: ["Early d4", "Open diagonals", "Black chooses ...Bc5 or ...Nf6"],
      fr: ["d4 précoce", "Diagonales ouvertes", "Les Noirs choisissent …Fc5 ou …Cf6"],
    },
    line: ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Nxd4", "Bc5", "Be3", "Qf6"],
    gameIds: ["nunn-016"],
  },
  {
    bookRef: 9,
    id: "philidor",
    names: { en: "Philidor Defence", fr: "Défense Philidor" },
    ecoPrefixes: ["C41"],
    plan: {
      en: "Black supports e5 with ...d6; solid but slightly passive — watch for space and breaks.",
      fr: "Les Noirs soutiennent e5 par …d6 ; solide mais un peu passif — attention à l’espace et aux ruptures.",
    },
    themes: {
      en: ["...d6 solidifies e5", "White gains space", "...exd4 and ...Be7 plans"],
      fr: ["…d6 consolide e5", "Les Blancs gagnent de l’espace", "Plans …exd4 et …Fe7"],
    },
    line: ["e4", "e5", "Nf3", "d6", "d4", "exd4", "Nxd4", "Nf6", "Nc3", "Be7"],
    gameIds: [],
  },
  {
    bookRef: 10,
    id: "petroff",
    names: { en: "Petroff Defence", fr: "Défense Petrov" },
    ecoPrefixes: ["C42", "C43"],
    plan: {
      en: "Black mirrors with ...Nf6 hitting e4; often leads to symmetrical, solid middlegames.",
      fr: "Les Noirs répondent …Cf6 sur e4 ; souvent des milieux symétriques et solides.",
    },
    themes: {
      en: ["Counterattack e4", "Symmetry and draws", "Nxe5 tactics"],
      fr: ["Contre-attaque sur e4", "Symétrie et nulles", "Tactiques Cxe5"],
    },
    line: ["e4", "e5", "Nf3", "Nf6", "Nxe5", "d6", "Nf3", "Nxe4", "d4", "d5"],
    gameIds: [],
  },
  {
    bookRef: 11,
    id: "ruy-lopez-intro",
    names: { en: "Ruy Lopez: Introduction", fr: "Espagnole : introduction" },
    ecoPrefixes: ["C60", "C61", "C62", "C63", "C64", "C65", "C66", "C67", "C68", "C69"],
    plan: {
      en: "Bb5 pressures the defender of e5; Black must know how to challenge the bishop.",
      fr: "Fb5 presse le défenseur de e5 ; les Noirs doivent savoir contester le fou.",
    },
    themes: {
      en: ["Pressure on e5", "...a6 and ...b5 ideas", "Exchange and Berlin sidelines"],
      fr: ["Pression sur e5", "Idées …a6 et …b5", "Échange et Berlin"],
    },
    line: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7"],
    branches: [["e4", "e5", "Nf3", "Nc6", "Bb5", "Nf6"], ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Bxc6"]],
    gameIds: ["chernov-006", "chernov-015"],
  },
  {
    bookRef: 12,
    id: "ruy-lopez-closed",
    names: { en: "Ruy Lopez: Closed Main Lines", fr: "Espagnole fermée — grandes lignes" },
    ecoPrefixes: ["C84", "C85", "C86", "C87", "C88", "C89", "C90", "C91", "C92", "C93", "C94", "C95", "C96", "C97", "C98", "C99"],
    plan: {
      en: "Both sides castle kingside and manoeuvre; the real test of Spanish understanding.",
      fr: "Les deux camps roquent petit et manœuvrent ; le vrai test de compréhension de l’Espagnole.",
    },
    themes: {
      en: ["Closed centre", "Manoeuvres with Nb1–d2", "Breaks with c3–d4 and ...d5"],
      fr: ["Centre fermé", "Manœuvres Cb1–d2", "Ruptures c3–d4 et …d5"],
    },
    line: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7", "Re1", "b5", "Bb3", "d6", "c3", "O-O"],
    gameIds: ["chernov-009", "nunn-007"],
  },
  {
    bookRef: 13,
    id: "ruy-lopez-marshall",
    names: { en: "Ruy Lopez: Marshall Attack", fr: "Espagnole : gambit Marshall" },
    ecoPrefixes: ["C89"],
    plan: {
      en: "Black gambits a pawn with ...d5 for lasting kingside initiative after White’s Re1.",
      fr: "Les Noirs gambitent un pion par …d5 pour une initiative durable à l’aile roi après Te1.",
    },
    themes: {
      en: ["...d5 sacrifice", "Kingside attack", "White must return material carefully"],
      fr: ["Sacrifice …d5", "Attaque à l’aile roi", "Les Blancs doivent rendre le matériel avec soin"],
    },
    line: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7", "Re1", "b5", "Bb3", "O-O", "c3", "d5"],
    gameIds: [],
  },
  {
    bookRef: 14,
    id: "ruy-lopez-open",
    names: { en: "Ruy Lopez: Open Spanish", fr: "Espagnole ouverte" },
    ecoPrefixes: ["C80", "C81", "C82", "C83"],
    plan: {
      en: "Black takes on e4 after ...Nxe4 ideas, aiming for active piece play and an open centre.",
      fr: "Les Noirs prennent sur e4 (idées …Cxe4), visant un jeu de pièces actif et un centre ouvert.",
    },
    themes: {
      en: ["...Nxe4", "Open piece play", "White’s c3–d4 centre"],
      fr: ["…Cxe4", "Jeu de pièces ouvert", "Centre blanc c3–d4"],
    },
    line: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Nxe4", "d4", "b5", "Bb3", "d5"],
    gameIds: [],
  },
  {
    bookRef: 15,
    id: "alekhine",
    names: { en: "Alekhine Defence", fr: "Défense Alekhine" },
    ecoPrefixes: ["B02", "B03", "B04", "B05"],
    plan: {
      en: "Provoke White’s centre pawns with ...Nf6, then chip away at the overextended chain.",
      fr: "Provoquez les pions centraux blancs par …Cf6, puis rongez la chaîne trop avancée.",
    },
    themes: {
      en: ["Provoke e5", "Undermine the centre", "Four Pawns vs Modern"],
      fr: ["Provoquer e5", "Miner le centre", "Quatre pions vs Moderne"],
    },
    line: ["e4", "Nf6", "e5", "Nd5", "d4", "d6", "c4", "Nb6", "f4", "dxe5", "fxe5", "Nc6"],
    gameIds: ["nunn-004", "nunn-019"],
  },
  {
    bookRef: 16,
    id: "scandinavian",
    names: { en: "Scandinavian Defence", fr: "Défense scandinave" },
    ecoPrefixes: ["B01"],
    plan: {
      en: "Strike at once with ...d5; after exd5, choose ...Qxd5 or ...Nf6 gambit ideas.",
      fr: "Frappez tout de suite par …d5 ; après exd5, choisissez …Dxd5 ou des idées de gambit …Cf6.",
    },
    themes: {
      en: ["Immediate ...d5", "Queen early after ...Qxd5", "Open piece development"],
      fr: ["…d5 immédiat", "Dame précoce après …Dxd5", "Développement ouvert"],
    },
    line: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Nf3", "c6"],
    gameIds: ["chernov-028"],
  },
  {
    bookRef: 17,
    id: "caro-kann",
    names: { en: "Caro-Kann Defence", fr: "Défense Caro-Kann" },
    ecoPrefixes: ["B10", "B11", "B12", "B13", "B14", "B15", "B16", "B17", "B18", "B19"],
    plan: {
      en: "Support ...d5 with ...c6 for a solid structure and a good light-squared bishop.",
      fr: "Soutenez …d5 par …c6 pour une structure solide et un bon fou des cases claires.",
    },
    themes: {
      en: ["Solid ...c6–d5", "Bishop often develops freely", "Panov and Advance plans"],
      fr: ["Solide …c6–d5", "Le fou se développe souvent librement", "Plans Panov et Avance"],
    },
    line: ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Bf5", "Ng3", "Bg6"],
    branches: [["e4", "c6", "d4", "d5", "exd5", "cxd5", "c4"], ["e4", "c6", "d4", "d5", "e5"]],
    gameIds: ["nunn-025"],
  },
  {
    bookRef: 18,
    id: "french-intro",
    names: { en: "French Defence: Introduction", fr: "Défense française : introduction" },
    ecoPrefixes: ["C00", "C01", "C02"],
    plan: {
      en: "Challenge e4 with ...e6 and ...d5; structures vary after Exchange, Advance, or 3.Nc3/Nd2.",
      fr: "Contestez e4 par …e6 et …d5 ; les structures varient après Échange, Avance, ou 3.Cc3/Cd2.",
    },
    themes: {
      en: ["...e6–d5 chain", "Bad bishop on c8", "Counterplay with ...c5"],
      fr: ["Chaîne …e6–d5", "Mauvais fou sur c8", "Contrejeu par …c5"],
    },
    line: ["e4", "e6", "d4", "d5", "exd5", "exd5", "Bd3", "Nc6", "Nf3", "Bd6"],
    branches: [["e4", "e6", "d4", "d5", "e5", "c5", "c3", "Nc6"]],
    gameIds: ["chernov-007"],
  },
  {
    bookRef: 19,
    id: "french-nc3",
    names: { en: "French Defence: 3 Nc3 Main Lines", fr: "Défense française : 3.Cc3" },
    ecoPrefixes: ["C10", "C11", "C12", "C13", "C14", "C15", "C16", "C17", "C18", "C19"],
    plan: {
      en: "After 3.Nc3, Black chooses Classical, Winawer, or Rubinstein — all fight the e4–d4 centre.",
      fr: "Après 3.Cc3, les Noirs choisissent Classique, Winawer ou Rubinstein — tous disputent le centre e4–d4.",
    },
    themes: {
      en: ["3.Nc3 tension", "Winawer ...Bb4", "Classical ...Nf6"],
      fr: ["Tension 3.Cc3", "Winawer …Fb4", "Classique …Cf6"],
    },
    line: ["e4", "e6", "d4", "d5", "Nc3", "Nf6", "Bg5", "Be7", "e5", "Nfd7"],
    branches: [["e4", "e6", "d4", "d5", "Nc3", "Bb4"]],
    gameIds: ["chernov-010", "chernov-013", "chernov-014", "nunn-006"],
  },
  {
    bookRef: 20,
    id: "sicilian-intro",
    names: { en: "Sicilian Defence: Introduction", fr: "Défense sicilienne : introduction" },
    ecoPrefixes: ["B20", "B21", "B22", "B23", "B24", "B25", "B26", "B27", "B28", "B29"],
    plan: {
      en: "Fight for half of the centre with ...c5; unbalanced, fighting positions from move one.",
      fr: "Disputez la moitié du centre par …c5 ; positions déséquilibrées et combatives dès le premier coup.",
    },
    themes: {
      en: ["Asymmetry ...c5", "Open vs Closed Sicilians", "Opposite-side attacks common"],
      fr: ["Asymétrie …c5", "Sicilienne ouverte vs fermée", "Attaques à roques opposés fréquentes"],
    },
    line: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"],
    gameIds: ["chernov-026"],
  },
  {
    bookRef: 21,
    id: "sicilian-closed-gp",
    names: { en: "Closed Sicilian and Grand Prix Attack", fr: "Sicilienne fermée et attaque Grand Prix" },
    ecoPrefixes: ["B23", "B24", "B25", "B26"],
    plan: {
      en: "White avoids an early d4, aiming for kingside build-ups with f4 or a Closed Nc3 setup.",
      fr: "Les Blancs évitent d4 précoce, visant une montée à l’aile roi avec f4 ou un dispositif fermé Cc3.",
    },
    themes: {
      en: ["No early d4", "f4 / Grand Prix", "Slow kingside storm"],
      fr: ["Pas de d4 précoce", "f4 / Grand Prix", "Tempête lente à l’aile roi"],
    },
    line: ["e4", "c5", "Nc3", "Nc6", "g3", "g6", "Bg2", "Bg7", "d3", "d6"],
    branches: [["e4", "c5", "Nc3", "Nc6", "f4", "g6", "Nf3", "Bg7"]],
    gameIds: [],
  },
  {
    bookRef: 22,
    id: "sicilian-alapin",
    names: { en: "Alapin (c3) Sicilian", fr: "Sicilienne Alapin (c3)" },
    ecoPrefixes: ["B22"],
    plan: {
      en: "Build a big centre with c3 and d4; Black must strike early with ...d5 or ...Nf6.",
      fr: "Construisez un grand centre avec c3 et d4 ; les Noirs doivent frapper tôt par …d5 ou …Cf6.",
    },
    themes: {
      en: ["c3–d4 centre", "...d5 or ...Nf6 replies", "Solid White structures"],
      fr: ["Centre c3–d4", "Réponses …d5 ou …Cf6", "Structures blanches solides"],
    },
    line: ["e4", "c5", "c3", "Nf6", "e5", "Nd5", "d4", "cxd4", "Nf3", "Nc6"],
    gameIds: ["nunn-030"],
  },
  {
    bookRef: 23,
    id: "morra-gambit",
    names: { en: "Morra Gambit", fr: "Gambit Morra" },
    ecoPrefixes: ["B21"],
    plan: {
      en: "Gambit a pawn after ...cxd4 to race development and pressure Black’s uncastled king.",
      fr: "Gambitez un pion après …cxd4 pour accélérer le développement et presser le roi non roqué.",
    },
    themes: {
      en: ["c3 gambit", "Lead in development", "Open files for attack"],
      fr: ["Gambit c3", "Avance de développement", "Colonnes ouvertes pour l’attaque"],
    },
    line: ["e4", "c5", "d4", "cxd4", "c3", "dxc3", "Nxc3", "Nc6", "Nf3", "d6", "Bc4"],
    gameIds: [],
  },
  {
    bookRef: 24,
    id: "sicilian-bb5",
    names: { en: "Bb5 Sicilian", fr: "Siciliennes avec Fb5" },
    ecoPrefixes: ["B30", "B31", "B51", "B52"],
    plan: {
      en: "Pin or trade a knight early with Bb5, steering away from the heaviest Open Sicilian theory.",
      fr: "Clouez ou échangez un cavalier tôt par Fb5, loin de la théorie la plus lourde de la sicilienne ouverte.",
    },
    themes: {
      en: ["Bb5 ideas", "Less theory", "Structure after Bxc6"],
      fr: ["Idées Fb5", "Moins de théorie", "Structure après Fxc6"],
    },
    line: ["e4", "c5", "Nf3", "Nc6", "Bb5", "g6", "O-O", "Bg7", "Re1", "e5"],
    gameIds: [],
  },
  {
    bookRef: 25,
    id: "open-sicilian-intro",
    names: { en: "Open Sicilian: Introduction", fr: "Sicilienne ouverte : introduction" },
    ecoPrefixes: ["B32", "B33", "B40", "B41", "B42", "B43", "B44", "B45", "B46", "B47", "B48", "B49"],
    plan: {
      en: "After Nf3 and d4, White opens the centre; Black chooses Dragon, Najdorf, Scheveningen, and more.",
      fr: "Après Cf3 et d4, les Blancs ouvrent le centre ; les Noirs choisissent Dragon, Najdorf, Scheveningen, etc.",
    },
    themes: {
      en: ["Open centre after d4", "Opposite-side castling themes", "Race of attacks"],
      fr: ["Centre ouvert après d4", "Thèmes de roques opposés", "Course d’attaques"],
    },
    line: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "e6"],
    gameIds: ["nunn-008", "nunn-009", "nunn-012"],
  },
  {
    bookRef: 26,
    id: "sicilian-dragon",
    names: { en: "Sicilian Dragon", fr: "Sicilienne Dragon" },
    ecoPrefixes: ["B70", "B71", "B72", "B73", "B74", "B75", "B76", "B77", "B78", "B79"],
    plan: {
      en: "Fianchetto on g7 and strike on the long diagonal; Yugoslav Attack is the sharp main test.",
      fr: "Fianchetto en g7 et frappe sur la grande diagonale ; l’attaque yougoslave est le test principal.",
    },
    themes: {
      en: ["g6 / Bg7", "Long diagonal", "Opposite-side castling races"],
      fr: ["g6 / Fg7", "Grande diagonale", "Courses à roques opposés"],
    },
    line: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "g6", "Be3", "Bg7", "f3", "O-O", "Qd2", "Nc6"],
    gameIds: ["nunn-010"],
  },
  {
    bookRef: 27,
    id: "sicilian-najdorf",
    names: { en: "Sicilian Najdorf", fr: "Sicilienne Najdorf" },
    ecoPrefixes: ["B90", "B91", "B92", "B93", "B94", "B95", "B96", "B97", "B98", "B99"],
    plan: {
      en: "...a6 controls b5 and prepares flexible queenside and central breaks (...e5 / ...e6).",
      fr: "…a6 contrôle b5 et prépare des ruptures flexibles à l’aile dame et au centre (…e5 / …e6).",
    },
    themes: {
      en: ["...a6 prophylaxis", "English Attack ideas", "Poisoned Pawn myths"],
      fr: ["Prophylaxie …a6", "Idées English Attack", "Mythes du pion empoisonné"],
    },
    line: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6", "Be3", "e5", "Nb3", "Be6"],
    gameIds: [],
  },
  {
    bookRef: 28,
    id: "sicilian-sveshnikov",
    names: { en: "Sveshnikov Sicilian", fr: "Sicilienne Sveshnikov" },
    ecoPrefixes: ["B33"],
    plan: {
      en: "Black accepts a hole on d5 for active piece play and ...f5 counterplay after ...e5.",
      fr: "Les Noirs acceptent un trou en d5 pour un jeu de pièces actif et du contrejeu …f5 après …e5.",
    },
    themes: {
      en: ["...e5 and d5 hole", "Active knights", "...f5 breaks"],
      fr: ["…e5 et case d5", "Cavaliers actifs", "Ruptures …f5"],
    },
    line: ["e4", "c5", "Nf3", "Nc6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "e5", "Ndb5", "d6"],
    gameIds: ["nunn-020", "nunn-023"],
  },
  {
    bookRef: 29,
    id: "qga",
    names: { en: "Queen’s Gambit Accepted", fr: "Gambit Dame accepté" },
    ecoPrefixes: ["D20", "D21", "D22", "D23", "D24", "D25", "D26", "D27", "D28", "D29"],
    plan: {
      en: "Take on c4, then return the pawn to free development while White builds a centre.",
      fr: "Prenez en c4, puis rendez le pion pour libérer le développement pendant que les Blancs bâtissent un centre.",
    },
    themes: {
      en: ["Accept with ...dxc4", "Return the pawn in time", "Free the c8-bishop"],
      fr: ["Accepter par …dxc4", "Rendre le pion à temps", "Libérer le fou c8"],
    },
    line: ["d4", "d5", "c4", "dxc4", "Nf3", "Nf6", "e3", "e6", "Bxc4", "c5"],
    gameIds: ["chernov-016"],
  },
  {
    bookRef: 30,
    id: "qgd-classical",
    names: { en: "Classical Queen’s Gambit Declined", fr: "Gambit Dame refusé classique" },
    ecoPrefixes: ["D30", "D35", "D36", "D37", "D50", "D51", "D52", "D53", "D54", "D55", "D56", "D57", "D58", "D59", "D60", "D61", "D62", "D63", "D64", "D65", "D66", "D67", "D68", "D69"],
    plan: {
      en: "Hold d5 with ...e6; develop carefully and free the light-squared bishop later.",
      fr: "Tenez d5 avec …e6 ; développez avec soin et libérez plus tard le fou des cases claires.",
    },
    themes: {
      en: ["Solid ...e6–d5", "Orthodox development", "Break with ...c5 or ...e5"],
      fr: ["Solide …e6–d5", "Développement orthodoxe", "Rupture …c5 ou …e5"],
    },
    line: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Be7", "e3", "O-O", "Nf3", "Nbd7"],
    gameIds: ["chernov-017", "chernov-018", "chernov-022", "chernov-027", "chernov-029", "chernov-033"],
  },
  {
    bookRef: 31,
    id: "tartakower-modern",
    names: { en: "Tartakower and Modern Lines", fr: "Tartakower et lignes modernes" },
    ecoPrefixes: ["D58", "D59"],
    plan: {
      en: "Modern QGD ideas with ...h6 and ...b6, freeing the bishop without early concessions.",
      fr: "Idées modernes du GDR avec …h6 et …b6, libérant le fou sans concessions précoces.",
    },
    themes: {
      en: ["...h6 asks the bishop", "...b6 fianchetto", "Flexible structure"],
      fr: ["…h6 interroge le fou", "Fianchetto …b6", "Structure flexible"],
    },
    line: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Be7", "e3", "O-O", "Nf3", "h6", "Bh4", "b6"],
    gameIds: ["chernov-025"],
  },
  {
    bookRef: 32,
    id: "qgd-exchange",
    names: { en: "Queen’s Gambit Exchange Variations", fr: "Variantes d’échange du Gambit Dame" },
    ecoPrefixes: ["D35", "D36"],
    plan: {
      en: "Exchange on d5 creates a minority-attack structure; plan on the queenside or centre.",
      fr: "L’échange en d5 crée une structure d’attaque de minorité ; planifiez à l’aile dame ou au centre.",
    },
    themes: {
      en: ["cxd5 structures", "Minority attack b4–b5", "Good knight vs bad bishop"],
      fr: ["Structures cxd5", "Attaque de minorité b4–b5", "Bon cavalier vs mauvais fou"],
    },
    line: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "cxd5", "exd5", "Bg5", "c6", "e3", "Bf5"],
    gameIds: ["nunn-021", "chernov-020"],
  },
  {
    bookRef: 33,
    id: "tarrasch",
    names: { en: "Tarrasch Defence", fr: "Défense Tarrasch" },
    ecoPrefixes: ["D32", "D33", "D34"],
    plan: {
      en: "Accept an isolated queen’s pawn after ...c5 for active piece play and open lines.",
      fr: "Acceptez un pion dame isolé après …c5 pour un jeu de pièces actif et des lignes ouvertes.",
    },
    themes: {
      en: ["IQP after ...c5", "Active pieces", "Blockade on d4"],
      fr: ["PDI après …c5", "Pièces actives", "Blocus en d4"],
    },
    line: ["d4", "d5", "c4", "e6", "Nc3", "c5", "cxd5", "exd5", "Nf3", "Nc6"],
    gameIds: [],
  },
  {
    bookRef: 34,
    id: "chigorin-albin",
    names: { en: "Chigorin and Albin Counter-Gambit", fr: "Tchigorine et contre-gambit Albin" },
    ecoPrefixes: ["D07", "D08", "D09"],
    plan: {
      en: "Offbeat answers to 1.d4 d5 2.c4: ...Nc6 (Chigorin) or ...e5 (Albin) for early activity.",
      fr: "Réponses inhabituelles à 1.d4 d5 2.c4 : …Cc6 (Tchigorine) ou …e5 (Albin) pour l’activité précoce.",
    },
    themes: {
      en: ["...Nc6 pressure", "Albin ...e5 gambit", "Tactics over structure"],
      fr: ["Pression …Cc6", "Gambit Albin …e5", "Tactique plutôt que structure"],
    },
    line: ["d4", "d5", "c4", "Nc6", "Nf3", "Bg4", "cxd5", "Bxf3", "gxf3", "Qxd5"],
    branches: [["d4", "d5", "c4", "e5", "dxe5", "d4"]],
    gameIds: [],
  },
  {
    bookRef: 35,
    id: "slav",
    names: { en: "Slav Defence", fr: "Défense Slave" },
    ecoPrefixes: ["D10", "D11", "D12", "D13", "D14", "D15", "D16", "D17", "D18", "D19"],
    plan: {
      en: "Support d5 with ...c6 without locking in the bishop behind ...e6.",
      fr: "Soutenez d5 par …c6 sans enfermer le fou derrière …e6.",
    },
    themes: {
      en: ["...c6 keeps Bc8 free", "Main-line ...dxc4", "Solid queenside"],
      fr: ["…c6 laisse Fc8 libre", "Grande ligne …dxc4", "Aile dame solide"],
    },
    line: ["d4", "d5", "c4", "c6", "Nf3", "Nf6", "Nc3", "dxc4", "a4", "Bf5"],
    gameIds: ["chernov-019"],
  },
  {
    bookRef: 36,
    id: "semi-slav",
    names: { en: "Semi-Slav Defence", fr: "Défense Semi-Slave" },
    ecoPrefixes: ["D43", "D44", "D45", "D46", "D47", "D48", "D49"],
    plan: {
      en: "Combine ...c6 and ...e6; prepare ...dxc4 and ...b5 or the Meran / Botvinnik complexes.",
      fr: "Combinez …c6 et …e6 ; préparez …dxc4 et …b5 ou les complexes Meran / Botvinnik.",
    },
    themes: {
      en: ["...c6 and ...e6", "Meran ideas", "Sharp Botvinnik lines"],
      fr: ["…c6 et …e6", "Idées Meran", "Lignes Botvinnik vives"],
    },
    line: ["d4", "d5", "c4", "c6", "Nf3", "Nf6", "Nc3", "e6", "e3", "Nbd7", "Bd3", "dxc4", "Bxc4", "b5"],
    gameIds: ["nunn-015"],
  },
  {
    bookRef: 37,
    id: "london-colle-tromp",
    names: { en: "London, Colle and Trompowsky", fr: "Londres, Colle et Trompowsky" },
    ecoPrefixes: ["D00", "D02", "D03", "D04", "D05", "A45", "A46"],
    plan: {
      en: "System openings: solid setups (London/Colle) or an early Bf4/Bg5 plan (Trompowsky).",
      fr: "Ouvertures-systèmes : dispositifs solides (Londres/Colle) ou plan Bf4/Fg5 précoce (Trompowsky).",
    },
    themes: {
      en: ["Easy development", "e3 / Bd3 plans", "Trompowsky pins"],
      fr: ["Développement simple", "Plans e3 / Fd3", "Clouages Trompowsky"],
    },
    line: ["d4", "d5", "Nf3", "Nf6", "Bf4", "e6", "e3", "Bd6", "Bg3", "O-O"],
    branches: [["d4", "d5", "Nf3", "Nf6", "e3", "e6", "Bd3", "c5", "c3"], ["d4", "Nf6", "Bg5"]],
    gameIds: ["chernov-003", "chernov-008", "chernov-011", "chernov-021", "chernov-023", "chernov-030"],
  },
  {
    bookRef: 38,
    id: "dutch",
    names: { en: "Dutch Defence", fr: "Défense hollandaise" },
    ecoPrefixes: ["A80", "A81", "A82", "A83", "A84", "A85", "A86", "A87", "A88", "A89", "A90", "A91", "A92", "A93", "A94", "A95", "A96", "A97", "A98", "A99"],
    plan: {
      en: "Fight for e4 with ...f5; Stonewall, Classical, or Leningrad structures follow.",
      fr: "Disputez e4 par …f5 ; suivent structures Stonewall, Classique ou Leningrad.",
    },
    themes: {
      en: ["...f5 space", "King safety on the kingside", "e4 and ...e5 breaks"],
      fr: ["Espace …f5", "Sécurité du roi à l’aile roi", "Ruptures e4 et …e5"],
    },
    line: ["d4", "f5", "g3", "Nf6", "Bg2", "e6", "Nf3", "Be7", "O-O", "O-O", "c4", "d6"],
    gameIds: [],
  },
  {
    bookRef: 39,
    id: "benoni-benko",
    names: { en: "Modern Benoni and Benko Gambit", fr: "Benoni moderne et gambit Benko" },
    ecoPrefixes: ["A43", "A44", "A56", "A57", "A58", "A59", "A60", "A61", "A62", "A63", "A64", "A65", "A66", "A67", "A68", "A69", "A70", "A71", "A72", "A73", "A74", "A75", "A76", "A77", "A78", "A79"],
    plan: {
      en: "Unbalance the queenside: Benoni with ...c5 structures or Benko’s ...b5 pawn sacrifice.",
      fr: "Déséquilibrez l’aile dame : Benoni avec structures …c5 ou sacrifice de pion Benko …b5.",
    },
    themes: {
      en: ["Queenside pressure", "Open a- and b-files (Benko)", "Benoni pawn chains"],
      fr: ["Pression à l’aile dame", "Colonnes a et b ouvertes (Benko)", "Chaînes de pions Benoni"],
    },
    line: ["d4", "Nf6", "c4", "c5", "d5", "b5", "cxb5", "a6", "bxa6", "g6"],
    branches: [["d4", "Nf6", "c4", "c5", "d5", "e6", "Nc3", "exd5", "cxd5", "d6"]],
    gameIds: ["nunn-013"],
  },
  {
    bookRef: 40,
    id: "kings-indian-intro",
    names: { en: "King’s Indian: Introduction", fr: "Est-indienne : introduction" },
    ecoPrefixes: ["E60", "E61", "E62", "E63", "E70"],
    plan: {
      en: "Let White take the centre, then strike with ...e5 or ...c5 behind a kingside fianchetto.",
      fr: "Laissez les Blancs prendre le centre, puis frappez par …e5 ou …c5 derrière un fianchetto à l’aile roi.",
    },
    themes: {
      en: ["g6 / Bg7", "Hypermodern centre", "Choose ...e5 or ...c5"],
      fr: ["g6 / Fg7", "Centre hypermoderne", "Choisir …e5 ou …c5"],
    },
    line: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6", "Nf3", "O-O", "Be2", "e5"],
    gameIds: ["nunn-027"],
  },
  {
    bookRef: 41,
    id: "kings-indian-main",
    names: { en: "King’s Indian: Main Lines", fr: "Est-indienne : grandes lignes" },
    ecoPrefixes: ["E90", "E91", "E92", "E93", "E94", "E95", "E96", "E97", "E98", "E99", "E80", "E81", "E82", "E83", "E84", "E85", "E86", "E87", "E88", "E89"],
    plan: {
      en: "Classical and Sämisch battles: opposite-wing attacks after the centre locks with ...e5.",
      fr: "Batailles Classique et Sämisch : attaques d’ailes opposées après le verrouillage du centre par …e5.",
    },
    themes: {
      en: ["Locked centre", "Kingside pawn storm", "Sämisch f3 setups"],
      fr: ["Centre verrouillé", "Tempête de pions à l’aile roi", "Dispositifs Sämisch f3"],
    },
    line: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6", "Nf3", "O-O", "Be2", "e5", "O-O", "Nc6", "d5", "Ne7"],
    gameIds: ["nunn-014", "nunn-018", "nunn-024"],
  },
  {
    bookRef: 42,
    id: "grunfeld-intro",
    names: { en: "Grünfeld Defence: Introduction", fr: "Grünfeld : introduction" },
    ecoPrefixes: ["D70", "D71", "D72", "D73", "D74", "D75", "D76", "D77", "D78", "D79", "D80", "D81", "D82", "D83", "D84", "D85"],
    plan: {
      en: "Challenge White’s centre with ...d5 after g6/Bg7; trade and pressure the long diagonal.",
      fr: "Contestez le centre blanc par …d5 après g6/Fg7 ; échangez et pressez la grande diagonale.",
    },
    themes: {
      en: ["...d5 strike", "Pressure on d4", "Active piece play"],
      fr: ["Frappe …d5", "Pression sur d4", "Jeu de pièces actif"],
    },
    line: ["d4", "Nf6", "c4", "g6", "Nc3", "d5", "cxd5", "Nxd5", "e4", "Nxc3", "bxc3", "Bg7"],
    gameIds: [],
  },
  {
    bookRef: 43,
    id: "grunfeld-exchange",
    names: { en: "Exchange Grünfeld", fr: "Grünfeld d’échange" },
    ecoPrefixes: ["D85", "D86", "D87", "D88", "D89"],
    plan: {
      en: "After the exchange on d5 and ...Nxc3, White’s broad centre faces lasting pressure.",
      fr: "Après l’échange en d5 et …Cxc3, le large centre blanc subit une pression durable.",
    },
    themes: {
      en: ["Broad white centre", "...c5 and ...Nc6 pressure", "Bishop on g7"],
      fr: ["Large centre blanc", "Pression …c5 et …Cc6", "Fou en g7"],
    },
    line: ["d4", "Nf6", "c4", "g6", "Nc3", "d5", "cxd5", "Nxd5", "e4", "Nxc3", "bxc3", "Bg7", "Nf3", "c5"],
    gameIds: ["nunn-029"],
  },
  {
    bookRef: 44,
    id: "queens-indian-bogo",
    names: { en: "Queen’s Indian and Bogo-Indian", fr: "Ouest-indienne et Bogo-indienne" },
    ecoPrefixes: ["E12", "E13", "E14", "E15", "E16", "E17", "E18", "E19", "E11"],
    plan: {
      en: "Control e4 from the flank with ...b6/...Bb7, or pin with ...Bb4 (Bogo) without fixing pawns.",
      fr: "Contrôlez e4 depuis l’aile avec …b6/…Fb7, ou clouez par …Fb4 (Bogo) sans fixer les pions.",
    },
    themes: {
      en: ["...b6 fianchetto", "Restrain e4", "Bogo ...Bb4"],
      fr: ["Fianchetto …b6", "Freiner e4", "Bogo …Fb4"],
    },
    line: ["d4", "Nf6", "c4", "e6", "Nf3", "b6", "g3", "Ba6", "b3", "Bb4+"],
    gameIds: ["chernov-032", "nunn-011"],
  },
  {
    bookRef: 45,
    id: "nimzo-intro",
    names: { en: "Nimzo-Indian: Introduction", fr: "Nimzo-indienne : introduction" },
    ecoPrefixes: ["E20", "E21", "E22", "E23", "E24", "E25", "E26", "E27", "E28", "E29", "E30", "E31"],
    plan: {
      en: "Pin the c3-knight with ...Bb4 to fight for e4 without committing the centre pawns early.",
      fr: "Clouez le cavalier c3 par …Fb4 pour disputer e4 sans engager tôt les pions du centre.",
    },
    themes: {
      en: ["...Bb4 pin", "Doubled c-pawns risk", "Flexible ...c5 / ...d5"],
      fr: ["Clouage …Fb4", "Risque de pions c doublés", "Flexible …c5 / …d5"],
    },
    line: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4", "Qc2", "O-O", "a3", "Bxc3+", "Qxc3"],
    gameIds: ["chernov-024", "chernov-031"],
  },
  {
    bookRef: 46,
    id: "nimzo-main",
    names: { en: "Nimzo-Indian: Main Lines", fr: "Nimzo-indienne : grandes lignes" },
    ecoPrefixes: ["E32", "E33", "E34", "E35", "E36", "E37", "E38", "E39", "E40", "E41", "E42", "E43", "E44", "E45", "E46", "E47", "E48", "E49", "E50", "E51", "E52", "E53", "E54", "E55", "E56", "E57", "E58", "E59"],
    plan: {
      en: "Main Rubenstein and Classical plans: structure fights after ...Bxc3 or retreats.",
      fr: "Plans Rubinstein et Classique : luttes de structure après …Fxc3 ou les reculs.",
    },
    themes: {
      en: ["Rubinstein e3", "Classical Qc2", "Hanging pawns / IQP"],
      fr: ["Rubinstein e3", "Classique Dc2", "Pions pendants / PDI"],
    },
    line: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4", "e3", "O-O", "Bd3", "d5", "Nf3", "c5"],
    gameIds: ["nunn-026"],
  },
  {
    bookRef: 47,
    id: "reversed-sicilian",
    names: { en: "Reversed Sicilian", fr: "Sicilienne en premier (Anglaise 1.c4 e5)" },
    ecoPrefixes: ["A20", "A21", "A22", "A23", "A24", "A25", "A26", "A27", "A28", "A29"],
    plan: {
      en: "1.c4 e5 gives White a Sicilian with an extra tempo; play for space and flexible breaks.",
      fr: "1.c4 e5 donne aux Blancs une sicilienne avec un temps de plus ; jouez l’espace et des ruptures flexibles.",
    },
    themes: {
      en: ["Extra tempo", "English structures", "d4 or b4 breaks"],
      fr: ["Temps supplémentaire", "Structures anglaises", "Ruptures d4 ou b4"],
    },
    line: ["c4", "e5", "Nc3", "Nf6", "g3", "d5", "cxd5", "Nxd5", "Bg2", "Nb6"],
    gameIds: ["chernov-012", "nunn-001"],
  },
  {
    bookRef: 48,
    id: "symmetrical-english",
    names: { en: "Symmetrical English", fr: "Anglaise symétrique" },
    ecoPrefixes: ["A30", "A31", "A32", "A33", "A34", "A35", "A36", "A37", "A38", "A39"],
    plan: {
      en: "Mirror with ...c5; slow manoeuvring, Hedgehog and Four Knights structures.",
      fr: "Symétrie par …c5 ; manœuvres lentes, structures Hérisson et Quatre cavaliers.",
    },
    themes: {
      en: ["...c5 symmetry", "Hedgehog setups", "Break with b4 or d4"],
      fr: ["Symétrie …c5", "Dispositifs Hérisson", "Rupture b4 ou d4"],
    },
    line: ["c4", "c5", "Nf3", "Nf6", "g3", "b6", "Bg2", "Bb7", "O-O", "e6", "Nc3", "Be7"],
    gameIds: ["nunn-017"],
  },
  {
    bookRef: 49,
    id: "assorted-english",
    names: { en: "Assorted English Lines", fr: "Lignes anglaises diverses" },
    ecoPrefixes: ["A10", "A11", "A12", "A13", "A14", "A15", "A16", "A17", "A18", "A19"],
    plan: {
      en: "Other English setups: Botvinnik structures, early g3, and flexible queen’s-pawn hybrids.",
      fr: "Autres dispositifs anglais : structures Botvinnik, g3 précoce, et hybrides de pion dame flexibles.",
    },
    themes: {
      en: ["Flexible move orders", "Botvinnik pawn triangle", "Transpositions"],
      fr: ["Ordres de coups flexibles", "Triangle Botvinnik", "Transpositions"],
    },
    line: ["c4", "Nf6", "Nc3", "e6", "e4", "d5", "e5", "d4", "exf6", "dxc3", "bxc3", "Qxf6"],
    gameIds: [],
  },
  {
    bookRef: 50,
    id: "reti",
    names: { en: "Réti Opening", fr: "Début Réti" },
    ecoPrefixes: ["A04", "A05", "A06", "A07", "A08", "A09"],
    plan: {
      en: "Hypermodern start with Nf3 and c4/g3 ideas, delaying the central pawn clash.",
      fr: "Début hypermoderne avec Cf3 et idées c4/g3, en retardant le choc des pions centraux.",
    },
    themes: {
      en: ["Nf3 first", "Flank pressure", "Transpose to Catalan / English"],
      fr: ["Cf3 d’abord", "Pression d’aile", "Transpositions catalane / anglaise"],
    },
    line: ["Nf3", "d5", "c4", "e6", "g3", "Nf6", "Bg2", "Be7", "O-O", "O-O", "b3"],
    gameIds: ["nunn-002", "nunn-005"],
  },
];

function applyMoves(sans) {
  const chess = new Chess();
  for (const san of sans) {
    const move = chess.move(san);
    if (!move) throw new Error(`Illegal ${san} in ${sans.join(" ")} @ ${chess.fen()}`);
  }
  return chess;
}

function fenAfter(sans) {
  return applyMoves(sans).fen();
}

/** Stable 0..n-1 pick from string seed. */
function hashPick(seed, n) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return n === 0 ? 0 : h % n;
}

function themeLooksBlack(theme) {
  return /^(?:\.\.\.|…)/.test(theme.trim()) || /\bBlack\b|les Noirs|noire|noirs/i.test(theme);
}

function themeLooksWhite(theme) {
  return /\bWhite\b|les Blancs|blancs|Bc4|Fc4|Bb5|Fb5|Ng5|Cg5|c3 prépar|English Attack|Grand Prix|Panov|minorit/i.test(
    theme,
  );
}

/**
 * Build a question that matches the theme being tested (not a generic "side to move").
 * @param {RawModule} mod
 * @param {string[]} slice
 * @param {string} fen
 * @param {number} themeIdx
 */
function buildAsk(mod, slice, fen, themeIdx) {
  const moves = slice.join(" ");
  const side = fen.split(" ")[1] === "w" ? "w" : "b";
  const themeEn = mod.themes.en[themeIdx] ?? mod.themes.en[0];
  const themeFr = mod.themes.fr[themeIdx] ?? mod.themes.fr[0];
  const nameEn = mod.names.en;
  const nameFr = mod.names.fr;
  const blackTheme = themeLooksBlack(themeEn) || themeLooksBlack(themeFr);
  const whiteTheme = themeLooksWhite(themeEn) || themeLooksWhite(themeFr);

  const soEn = `Super Opening ${mod.bookRef} (${nameEn})`;
  const soFr = `Super Ouverture ${mod.bookRef} (${nameFr})`;

  if (themeIdx === 0) {
    return {
      en: `${soEn}: after ${moves}, which key idea from this lesson applies?`,
      fr: `${soFr} : après ${moves}, quelle idée clé de cette leçon s’applique ?`,
    };
  }

  if (blackTheme && side === "w") {
    return {
      en: `${soEn}: after ${moves}, which Black idea from this lesson still shapes the plan?`,
      fr: `${soFr} : après ${moves}, quelle idée noire de cette leçon structure encore le plan ?`,
    };
  }
  if (whiteTheme && side === "b") {
    return {
      en: `${soEn}: after ${moves}, which White idea from this lesson is most relevant?`,
      fr: `${soFr} : après ${moves}, quelle idée blanche de cette leçon est la plus pertinente ?`,
    };
  }

  if (side === "w") {
    return {
      en: `${soEn}: White to move after ${moves} — which theme from this lesson should guide you?`,
      fr: `${soFr} : Blancs au trait après ${moves} — quel thème de cette leçon doit guider le jeu ?`,
    };
  }
  return {
    en: `${soEn}: Black to move after ${moves} — which theme from this lesson should guide you?`,
    fr: `${soFr} : Noirs au trait après ${moves} — quel thème de cette leçon doit guider le jeu ?`,
  };
}

/**
 * Two distractors: one from another opening's themes, one clearly wrong.
 * @param {RawModule} mod
 * @param {number} themeIdx
 * @param {RawModule[]} allMods
 * @param {string} seed
 */
function buildChoices(mod, themeIdx, allMods, seed) {
  const correctEn = mod.themes.en[themeIdx] ?? mod.themes.en[0];
  const correctFr = mod.themes.fr[themeIdx] ?? mod.themes.fr[0];

  const poolEn = [];
  const poolFr = [];
  for (const other of allMods) {
    if (other.id === mod.id) continue;
    for (let i = 0; i < other.themes.en.length; i++) {
      const en = other.themes.en[i];
      const fr = other.themes.fr[i];
      if (!en || !fr) continue;
      if (en === correctEn || fr === correctFr) continue;
      poolEn.push(en);
      poolFr.push(fr);
    }
  }

  const i1 = hashPick(`${seed}:a`, poolEn.length);
  let i2 = hashPick(`${seed}:b`, poolEn.length);
  if (poolEn.length > 1 && i2 === i1) i2 = (i2 + 1) % poolEn.length;

  const genericEn = [
    "Ignore development and hunt pawns",
    "Castle into an open file without need",
    "Push every rook pawn as fast as possible",
  ];
  const genericFr = [
    "Ignorer le développement et chasser les pions",
    "Roquer sous une colonne ouverte sans nécessité",
    "Pousser tous les pions de Tour le plus vite possible",
  ];
  const g = hashPick(`${seed}:g`, genericEn.length);

  const distractorEn = poolEn.length
    ? [poolEn[i1], poolEn.length > 1 ? poolEn[i2] : genericEn[g]]
    : [genericEn[0], genericEn[1]];
  const distractorFr = poolFr.length
    ? [poolFr[i1], poolFr.length > 1 ? poolFr[i2] : genericFr[g]]
    : [genericFr[0], genericFr[1]];

  // Shuffle so the correct answer is not always first.
  const order = [0, 1, 2];
  const rot = hashPick(`${seed}:rot`, 3);
  const rotated = order.map((_, idx) => order[(idx + rot) % 3]);
  const ens = [correctEn, distractorEn[0], distractorEn[1]];
  const frs = [correctFr, distractorFr[0], distractorFr[1]];
  const choicesEn = rotated.map((i) => ens[i]);
  const choicesFr = rotated.map((i) => frs[i]);
  const answer = rotated.indexOf(0);

  return { choices: { en: choicesEn, fr: choicesFr }, answer };
}

function buildBasePositions(mod, allMods) {
  const positions = [];
  const main = mod.line;
  const checkpoints = [
    Math.min(4, main.length),
    Math.min(8, main.length),
    main.length,
  ].filter((n, i, arr) => n > 0 && arr.indexOf(n) === i);

  for (let ci = 0; ci < checkpoints.length; ci++) {
    const n = checkpoints[ci];
    const slice = main.slice(0, n);
    const fen = fenAfter(slice);
    const themeIdx = ci % mod.themes.fr.length;
    const themeEn = mod.themes.en[themeIdx] ?? mod.themes.en[0];
    const themeFr = mod.themes.fr[themeIdx] ?? mod.themes.fr[0];
    const ask = buildAsk(mod, slice, fen, themeIdx);
    const { choices, answer } = buildChoices(mod, themeIdx, allMods, `${mod.id}:cp${ci}`);

    positions.push({
      fen,
      ask,
      choices,
      answer,
      why: {
        en: `${themeEn}. ${mod.plan.en}`,
        fr: `${themeFr}. ${mod.plan.fr}`,
      },
    });
  }

  for (let bi = 0; bi < (mod.branches ?? []).length; bi++) {
    const branch = mod.branches[bi];
    try {
      const fen = fenAfter(branch);
      const themeIdx = Math.min(1, mod.themes.fr.length - 1);
      const themeEn = mod.themes.en[themeIdx] ?? mod.themes.en[0];
      const themeFr = mod.themes.fr[themeIdx] ?? mod.themes.fr[0];
      const tail = branch.slice(-4).join(" ");
      const { choices, answer } = buildChoices(mod, themeIdx, allMods, `${mod.id}:br${bi}`);
      positions.push({
        fen,
        ask: {
          en: `In this ${mod.names.en} branch (… ${tail}), which theme still applies?`,
          fr: `Dans cette branche de ${mod.names.fr} (… ${tail}), quel thème reste pertinent ?`,
        },
        choices,
        answer,
        why: {
          en: `${themeEn}. ${mod.plan.en}`,
          fr: `${themeFr}. ${mod.plan.fr}`,
        },
      });
    } catch (err) {
      console.warn(`Branch fail ${mod.id}:`, err.message);
    }
  }

  return positions.slice(0, 5);
}

function buildKnowledgeItem(raw) {
  return {
    type: "nameFromMoves",
    moves: raw.line.slice(0, Math.min(6, raw.line.length)),
    answerModuleId: raw.id,
    prompt: {
      en: "Name this opening.",
      fr: "Nommez cette ouverture.",
    },
  };
}

function buildSkillItem(raw) {
  const slice = raw.line.slice(0, Math.min(raw.line.length, 10));
  const chess = applyMoves(slice);
  const legal = chess.moves({ verbose: true });
  const bestSan = legal[0]?.san ?? "O-O";
  return {
    fen: chess.fen(),
    bestMoveSan: bestSan,
    answerModuleId: raw.id,
    prompt: {
      en: "Find a strong developing move, then name the opening.",
      fr: "Trouvez un bon coup de développement, puis nommez l’ouverture.",
    },
  };
}

const familySections = [
  { id: "open-games", title: { en: "Open games (1.e4 e5)", fr: "Parties ouvertes (1.e4 e5)" }, refs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] },
  { id: "semi-open", title: { en: "Semi-open (1.e4 other)", fr: "Semi-ouvertes (1.e4 autres)" }, refs: [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28] },
  { id: "closed", title: { en: "Closed & Indian (1.d4)", fr: "Fermées et indiennes (1.d4)" }, refs: [29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46] },
  { id: "flank", title: { en: "Flank openings", fr: "Ouvertures de flanc" }, refs: [47, 48, 49, 50] },
];

const modules = RAW.map((mod) => {
  applyMoves(mod.line); // validate
  return {
    id: mod.id,
    bookRef: mod.bookRef,
    names: mod.names,
    ecoPrefixes: mod.ecoPrefixes,
    plan: mod.plan,
    themes: mod.themes,
    exampleLine: { san: mod.line, startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" },
    basePositions: buildBasePositions(mod, RAW),
    gameIds: mod.gameIds,
  };
});

const curriculum = {
  id: "openings-revision",
  title: {
    en: "Opening Revision — 50 Super Openings",
    fr: "Révision d’ouvertures — 50 Super Ouvertures",
  },
  author: {
    en: "Move-by-Move curriculum (method inspired by Watson & Burgess)",
    fr: "Parcours Move-by-Move (méthode inspirée de Watson & Burgess)",
  },
  publisher: {
    en: "Study aid · not affiliated with Gambit / Olibris",
    fr: "Aide pédagogique · non affilié à Gambit / Olibris",
  },
  principles: [
    {
      id: "centre",
      title: { en: "Fight for the centre", fr: "Disputez le centre" },
      body: {
        en: "Occupy or pressure e4/d4/e5/d5 early. Ideal: two central pawns; if not, piece pressure.",
        fr: "Occupez ou pressez e4/d4/e5/d5 tôt. Idéal : deux pions centraux ; sinon, pression des pièces.",
      },
    },
    {
      id: "develop",
      title: { en: "Develop before you attack", fr: "Développez avant d’attaquer" },
      body: {
        en: "Bring out knights and bishops, castle, connect rooks. Too many pawn moves invite tactics.",
        fr: "Sortez cavaliers et fous, roquez, connectez les tours. Trop de coups de pion invite la tactique.",
      },
    },
    {
      id: "king",
      title: { en: "King safety", fr: "Sécurité du roi" },
      body: {
        en: "Castle early. Be careful with f-pawn pushes that open your king.",
        fr: "Roquez tôt. Méfiez-vous des poussées du pion f qui ouvrent votre roi.",
      },
    },
    {
      id: "queen",
      title: { en: "Don’t bring the queen out too early", fr: "Ne sortez pas la dame trop tôt" },
      body: {
        en: "Early queen sorties lose tempi to developing moves. Tempo matters.",
        fr: "Une dame sortie trop tôt perd des temps face aux coups de développement. Le tempo compte.",
      },
    },
    {
      id: "structure",
      title: { en: "Pawn structure tells the plan", fr: "La structure de pions dicte le plan" },
      body: {
        en: "Isolated, doubled, or backward pawns are not always bad — but they shape your breaks.",
        fr: "Pions isolés, doublés ou arriérés ne sont pas toujours mauvais — mais ils façonnent vos ruptures.",
      },
    },
  ],
  sections: familySections,
  modules,
  batteries: {
    knowledge: RAW.map(buildKnowledgeItem),
    skill: RAW.filter((_, i) => i % 2 === 0).map(buildSkillItem),
  },
};

const out = join(ROOT, "data", "openings-revision.json");
const pub = join(ROOT, "web", "public", "data", "openings-revision.json");
writeFileSync(out, JSON.stringify(curriculum, null, 2) + "\n");
mkdirSync(dirname(pub), { recursive: true });
copyFileSync(out, pub);
console.log(`Wrote ${modules.length} modules → ${out}`);
console.log(`Mirrored → ${pub}`);
