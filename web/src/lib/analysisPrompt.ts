import { Chess } from "chess.js";
import type { Lesson } from "../types.ts";
import { movesUpToPly } from "./chess.ts";

export const ANALYSIS_PROMPT_INSTRUCTIONS = `Act as an International Master of chess.
Analyze a chess game move by move, explaining what happened in each move, and the result should be displayed in a pgn file where the comments are in each move and in braces, following the pgn standard.
The writing style should be instructive and detailed aimed at an intermediate player.
Consider the following context: The analysis should include intermediate comments, covering both the player's and the opponent's moves. Additionally, it should include an evaluation of the positions after each move, focusing on both tactics and strategy.

Analyze the following chess game move by move, providing detailed comments for each move and displaying the result in a pgn file. The comments should be in braces and follow the pgn standard. The comments should be intermediate, covering both the player's and the opponent's moves, and including an evaluation of the positions after each move. The analysis should focus on both tactics and strategy.
The answer must be in Français.
The game is:`;

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
