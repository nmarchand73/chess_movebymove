import { Chess } from "chess.js";
import type { Lesson } from "../types.ts";
import { movesUpToPly } from "./chess.ts";

export const ANALYSIS_PROMPT_INSTRUCTIONS = `Agis comme un Maître International et un entraîneur d'échecs expérimenté.

Analyse la partie fournie coup par coup et génère un PGN intégralement annoté en français, destiné à un joueur de niveau intermédiaire.

Pour chaque coup des Blancs et des Noirs, ajoute immédiatement après le coup un commentaire entre accolades \`{ }\` indiquant :

- l'objectif du coup ;
- son impact tactique ou stratégique ;
- l'évaluation concise de la position : \`=\`, \`+=\`, \`=+\`, \`+-\` ou \`-+\` ;
- les menaces, faiblesses, pièces mal placées ou non protégées pertinentes ;
- lorsque c'est pertinent, la classification du coup joué : \`?!\`, \`?\` ou \`??\`.

Aux moments importants, indique dans le commentaire :

- un label : \`Moment critique\`, \`Décision stratégique\`, \`Occasion tactique\`, \`Erreur décisive\` ou \`Meilleure défense\` ;
- deux ou trois coups candidats ;
- de courtes variantes en notation SAN ;
- le meilleur coup s'il diffère du coup joué ;
- une explication concrète permettant de retrouver le meilleur coup devant l'échiquier.

Pour les variantes, écris uniquement des suites SAN séparées par des virgules, sans numéros de coups, sans points et sans parenthèses. Exemple : \`Variante : exd4, Qxd4, Nc6\`.

Pour les positions critiques, ajoute dans le commentaire une section courte intitulée \`Processus de réflexion :\` fondée sur cette méthode :

1. Identifier les menaces adverses.
2. Examiner les échecs, les prises et les menaces directes.
3. Repérer les pièces non protégées, surchargées ou mal placées.
4. Générer deux ou trois candidats.
5. Calculer les variantes forcées.
6. Comparer les positions finales.
7. Choisir le coup le plus sûr tactiquement et le plus actif stratégiquement.

Explique également, lorsque c'est pertinent :

- le développement et la sécurité des rois ;
- le contrôle du centre ;
- la structure de pions et les ruptures ;
- les colonnes, diagonales, cases faibles et avant-postes ;
- la coordination et l'activité des pièces ;
- les motifs tactiques ;
- les plans disponibles dans l'ouverture, le milieu de jeu et la finale.

Contraintes PGN strictes :

- Retourne uniquement le PGN annoté, sans introduction ni conclusion hors PGN.
- N'utilise aucun bloc Markdown.
- Conserve exactement les en-têtes du PGN fourni.
- Utilise uniquement des guillemets standards \`"\`.
- Place toutes les explications entre accolades \`{ }\`.
- N'ajoute jamais de texte explicatif en dehors des commentaires PGN.
- N'ajoute jamais \`?!\`, \`?\` ou \`??\` directement après un coup SAN ; place toujours ces classifications dans le commentaire.
- N'utilise dans les commentaires aucune séquence susceptible d'être interprétée comme un coup PGN.
- N'invente aucun coup.
- Vérifie la légalité de chaque coup dans la position courante.
- Respecte exactement l'ordre et le numéro des coups fournis.
- Le PGN doit pouvoir être importé dans un logiciel d'échecs standard.
- Si la partie est incomplète, analyse uniquement les coups fournis et indique-le dans le commentaire final.

Après le dernier coup, ajoute un commentaire PGN final résumant :

- l'ouverture et ses idées ;
- les principaux tournants ;
- les meilleurs et les moins bons choix des deux joueurs ;
- le thème tactique ou stratégique décisif ;
- trois leçons pratiques ;
- une checklist réutilisable pour trouver le meilleur coup.

Partie à analyser :`;

export function buildGamePgn(lesson: Lesson, ply: number): string {
  const chess = new Chess();
  const isComplete = ply >= lesson.moveCount;

  chess.header("Event", lesson.event ?? lesson.title);
  chess.header("White", lesson.players.white);
  chess.header("Black", lesson.players.black);
  chess.header("Result", isComplete && lesson.result ? lesson.result : "*");
  if (lesson.eco) chess.header("ECO", lesson.eco);
  if (lesson.opening) chess.header("Opening", lesson.opening);

  for (const san of movesUpToPly(lesson.nodes, ply)) {
    chess.move(san);
  }

  return chess.pgn({ maxWidth: 0 });
}

export function buildAnalysisPrompt(lesson: Lesson, ply: number): string {
  const pgn = buildGamePgn(lesson, ply);
  return `${ANALYSIS_PROMPT_INSTRUCTIONS}\n\n${pgn}`;
}
