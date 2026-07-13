import { Chess } from "chess.js";
import type { AnnotationNode } from "../types.ts";
import { buildPositionAtPly } from "./chess.ts";

export type SanResolution =
  | { kind: "jump"; ply: number }
  | { kind: "preview"; fen: string; label: string }
  | { kind: "none" };

const MOVE_PREFIX = /^(\d+)\s*(\.{2,3}|\.{1,3})?\s*/;
const MOVE_ONLY = /^([NBRQK]?[a-h]?x?[a-h][1-8](?:=[NBRQK])?[+#?!]*|O-O-O|O-O)$/i;

function plyForMoveNumber(moveNum: number, side: "white" | "black"): number {
  if (side === "white") return (moveNum - 1) * 2 + 1;
  return (moveNum - 1) * 2 + 2;
}

function sideFromDots(dots: string | undefined, explicitBlack: boolean): "white" | "black" | null {
  if (dots?.includes("...")) return "black";
  if (dots === "." || dots === "..") return "white";
  if (explicitBlack) return "black";
  return null;
}

/** Strip move number prefix and return SAN token. */
export function parseSanToken(notation: string): { moveNum?: number; side?: "white" | "black"; san: string } {
  const trimmed = notation.trim();
  const prefix = trimmed.match(MOVE_PREFIX);
  if (prefix) {
    const moveNum = Number(prefix[1]);
    const rest = trimmed.slice(prefix[0].length).trim();
    const side = sideFromDots(prefix[2], prefix[0].includes("..."));
    const san = rest.replace(/^\.+\s*/, "").trim();
    return { moveNum, side: side ?? undefined, san };
  }
  return { san: trimmed };
}

function tryMove(chess: Chess, san: string): Chess | null {
  const trial = new Chess(chess.fen());
  try {
    trial.move(san, { strict: false });
    return trial;
  } catch {
    const moves = trial.moves({ verbose: true });
    const normalized = san.replace(/[+#!?]+$/, "");
    const match = moves.find((m) => m.san.replace(/[+#!?]+$/, "") === normalized);
    if (!match) return null;
    try {
      const again = new Chess(chess.fen());
      again.move(match.san);
      return again;
    } catch {
      return null;
    }
  }
}

function findMainLinePly(nodes: AnnotationNode[], moveNum: number, side: "white" | "black", san: string): number | null {
  const targetPly = plyForMoveNumber(moveNum, side);
  const node = nodes.find((n) => n.ply === targetPly && n.san);
  if (!node?.san) return null;
  const a = node.san.replace(/[+#!?]+$/, "").replace(/^[NBRQK]/, "").toLowerCase();
  const b = san.replace(/[+#!?]+$/, "").replace(/^[NBRQK]/, "").toLowerCase();
  if (a === b || node.san.replace(/[+#!?]+$/, "") === san.replace(/[+#!?]+$/, "")) {
    return targetPly;
  }
  return null;
}

export function resolveSanClick(
  notation: string,
  nodes: AnnotationNode[],
  currentPly: number,
): SanResolution {
  const { moveNum, side, san } = parseSanToken(notation);
  if (!san || !MOVE_ONLY.test(san)) return { kind: "none" };

  if (moveNum && side) {
    const mainPly = findMainLinePly(nodes, moveNum, side, san);
    if (mainPly !== null) return { kind: "jump", ply: mainPly };
    const basePly = side === "white" ? moveNum * 2 - 2 : moveNum * 2 - 1;
    const base = buildPositionAtPly(nodes, Math.max(0, basePly));
    const after = tryMove(base, san);
    if (after) {
      return { kind: "preview", fen: after.fen(), label: notation.trim() };
    }
    return { kind: "none" };
  }

  const bases = [currentPly, currentPly - 1, currentPly + 1].filter((p) => p >= 0);
  for (const basePly of bases) {
    const base = buildPositionAtPly(nodes, basePly);
    const after = tryMove(base, san);
    if (after) {
      const mainAt = nodes.find(
        (n) =>
          n.san &&
          n.ply > 0 &&
          n.san.replace(/[+#!?]+$/, "") === san.replace(/[+#!?]+$/, ""),
      );
      if (mainAt) return { kind: "jump", ply: mainAt.ply };
      return { kind: "preview", fen: after.fen(), label: san };
    }
  }

  return { kind: "none" };
}

export function previewAlternative(
  nodes: AnnotationNode[],
  currentPly: number,
  alt: { label: string; move: string },
): SanResolution {
  const fromLabel = resolveSanClick(alt.label, nodes, currentPly);
  if (fromLabel.kind !== "none") return fromLabel;

  const bases = [currentPly, currentPly - 1];
  for (const basePly of bases) {
    const base = buildPositionAtPly(nodes, basePly);
    const after = tryMove(base, alt.move);
    if (after) {
      return { kind: "preview", fen: after.fen(), label: alt.label };
    }
  }
  return { kind: "none" };
}

export function nextAnnotatedPly(nodes: AnnotationNode[], fromPly: number, maxPly: number): number | null {
  for (let p = fromPly + 1; p <= maxPly; p++) {
    const node = nodes.find((n) => n.ply === p);
    if (node?.text?.trim() || node?.isCritical) return p;
  }
  return null;
}

export function formatAnnotatedJumpLabel(nodes: AnnotationNode[], targetPly: number): string {
  const node = nodes.find((n) => n.ply === targetPly);
  if (!node?.san) return `move ${targetPly}`;
  const moveNum = Math.ceil(targetPly / 2);
  const prefix = targetPly % 2 === 1 ? `${moveNum}.` : `${moveNum}...`;
  return `${prefix}${node.san}`;
}
