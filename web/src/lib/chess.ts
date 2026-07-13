import { Chess } from "chess.js";
import type { AnnotationNode } from "../types";

export const STARTING_FEN = new Chess().fen();

export function isStartingPosition(fen: string): boolean {
  return fen === STARTING_FEN;
}

export function buildPositionAtPly(nodes: AnnotationNode[], ply: number): Chess {
  const chess = new Chess();
  for (const node of nodes) {
    if (!node.san || node.ply <= 0 || node.ply > ply) continue;
    chess.move(node.san);
  }
  return chess;
}

export function movesUpToPly(nodes: AnnotationNode[], ply: number): string[] {
  return nodes
    .filter((n) => n.san && n.ply > 0 && n.ply <= ply)
    .sort((a, b) => a.ply - b.ply)
    .map((n) => n.san as string);
}
