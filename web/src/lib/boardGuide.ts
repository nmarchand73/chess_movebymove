import { Chess, type Chess as ChessType } from "chess.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

const CASTLE_ROOK_BY_KING: Record<string, [string, string]> = {
  e1g1: ["h1", "f1"],
  e1c1: ["a1", "d1"],
  e8g8: ["h8", "f8"],
  e8c8: ["a8", "d8"],
};

export type SquarePieceMap = Record<string, string>;

export type BoardGuide =
  | { kind: "waiting_signal" }
  | { kind: "lesson_complete" }
  | {
      kind: "setup";
      mismatchedSquares: string[];
      mismatchCount: number;
    }
  | {
      kind: "play_move";
      san: string;
      from: string;
      to: string;
      side: "white" | "black";
    };

/** Expand a FEN placement into square → piece letter (empty omitted). */
export function placementToMap(placement: string): SquarePieceMap {
  const map: SquarePieceMap = {};
  const ranks = placement.split("/");
  for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
    const rank = 8 - rankIndex;
    const row = ranks[rankIndex] ?? "";
    let file = 0;
    for (const ch of row) {
      if (ch >= "1" && ch <= "8") {
        file += Number(ch);
        continue;
      }
      if (file < 8) {
        map[`${FILES[file]!}${rank}`] = ch;
      }
      file += 1;
    }
  }
  return map;
}

export function mismatchedSquares(expectedPlacement: string, boardPlacement: string): string[] {
  const expected = placementToMap(expectedPlacement);
  const actual = placementToMap(boardPlacement);
  const squares = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  const mismatches: string[] = [];
  for (const sq of squares) {
    if ((expected[sq] ?? "") !== (actual[sq] ?? "")) {
      mismatches.push(sq);
    }
  }
  return mismatches.sort();
}

export function resolveNextMoveLights(
  chess: ChessType,
  expectedSan: string,
): { from: string; to: string } | null {
  const move = chess.moves({ verbose: true }).find((m) => m.san === expectedSan);
  if (!move) return null;
  return { from: move.from, to: move.to };
}

/** Squares that change when playing `expectedSan` from the lesson position. */
export function expectedMoveDiffSquares(
  chess: ChessType,
  expectedSan: string,
  lessonPlacement: string,
): string[] | null {
  const move = chess.moves({ verbose: true }).find((m) => m.san === expectedSan);
  if (!move) return null;

  let afterPlacement: string;
  try {
    const next = new Chess(chess.fen());
    const played = next.move(expectedSan);
    if (!played) return null;
    afterPlacement = next.fen().split(" ")[0]!;
  } catch {
    return null;
  }

  const diff = new Set(mismatchedSquares(lessonPlacement, afterPlacement));
  const castleRook = CASTLE_ROOK_BY_KING[`${move.from}${move.to}`];
  if (castleRook) {
    for (const sq of castleRook) diff.add(sq);
  }
  if (move.flags.includes("e")) {
    diff.add(`${move.to[0]}${move.from[1]}`);
  }
  return [...diff].sort();
}

/**
 * True when the physical board is mid-execution of the expected move (piece
 * lifted, capture removed, castling in progress) — a strict subset of that
 * move's changed squares. A fully completed next position is NOT progress
 * (rewind / reset must show setup LEDs so the player can put pieces back).
 */
export function isProgressTowardExpectedMove(
  chess: ChessType,
  lessonPlacement: string,
  boardPlacement: string,
  expectedSan: string,
): boolean {
  const moveDiff = expectedMoveDiffSquares(chess, expectedSan, lessonPlacement);
  if (!moveDiff || moveDiff.length === 0) return false;
  const current = mismatchedSquares(lessonPlacement, boardPlacement);
  // Need at least one change, but not the full completed move.
  if (current.length === 0 || current.length >= moveDiff.length) return false;
  const allowed = new Set(moveDiff);
  return current.every((sq) => allowed.has(sq));
}

/**
 * Expected mover is off its from-square and not yet on `to` (in hand / transit).
 * Only when every mismatch lies on the expected move's squares (allows minor
 * sensor noise inside that set, but not a mid-game board after rewind).
 */
export function isExpectedPieceInHand(
  lessonPlacement: string,
  boardPlacement: string,
  from: string,
  to: string,
  moveDiff: readonly string[],
): boolean {
  const expected = placementToMap(lessonPlacement);
  const actual = placementToMap(boardPlacement);
  const piece = expected[from];
  if (!piece) return false;
  if (actual[from]) return false; // still on origin
  if (actual[to] === piece) return false; // already completed onto destination
  const mismatches = mismatchedSquares(lessonPlacement, boardPlacement);
  if (mismatches.length === 0) return false;
  const allowed = new Set(moveDiff);
  return mismatches.every((sq) => allowed.has(sq));
}

/** Exactly one square differs: an own-side piece missing (= clean lift). */
export function findLiftedOwnSquare(
  expectedPlacement: string,
  boardPlacement: string,
  turn: "w" | "b",
): string | null {
  if (mismatchedSquares(expectedPlacement, boardPlacement).length !== 1) return null;
  const expected = placementToMap(expectedPlacement);
  const actual = placementToMap(boardPlacement);
  const liftedOwn: string[] = [];
  let otherMissing = 0;
  for (const [sq, piece] of Object.entries(expected)) {
    if (actual[sq]) continue;
    const isWhite = piece === piece.toUpperCase();
    const isOwn = (turn === "w" && isWhite) || (turn === "b" && !isWhite);
    if (isOwn) liftedOwn.push(sq);
    else otherMissing += 1;
  }
  if (otherMissing > 0 || liftedOwn.length !== 1) return null;
  return liftedOwn[0]!;
}

function playMoveGuide(
  nextSan: string,
  lights: { from: string; to: string },
  chess: ChessType,
): BoardGuide {
  return {
    kind: "play_move",
    san: nextSan,
    from: lights.from,
    to: lights.to,
    side: chess.turn() === "w" ? "white" : "black",
  };
}

export function buildBoardGuide(input: {
  boardPlacement: string | null;
  lessonPlacement: string;
  nextSan: string | null;
  chess: ChessType;
  atEnd: boolean;
  /** After rewind / ply jump: require an exact physical match before move guides. */
  requireExactSync?: boolean;
}): BoardGuide {
  if (input.atEnd) return { kind: "lesson_complete" };
  if (!input.boardPlacement) return { kind: "waiting_signal" };

  const mismatches = mismatchedSquares(input.lessonPlacement, input.boardPlacement);

  // Rewind / scrub: light every wrong square until the board matches the diagram.
  if (input.requireExactSync && mismatches.length > 0) {
    return {
      kind: "setup",
      mismatchedSquares: mismatches,
      mismatchCount: mismatches.length,
    };
  }

  if (!input.nextSan) {
    if (mismatches.length > 0) {
      return {
        kind: "setup",
        mismatchedSquares: mismatches,
        mismatchCount: mismatches.length,
      };
    }
    return { kind: "lesson_complete" };
  }

  const lights = resolveNextMoveLights(input.chess, input.nextSan);
  if (!lights) {
    return {
      kind: "setup",
      mismatchedSquares: mismatches,
      mismatchCount: mismatches.length,
    };
  }

  if (mismatches.length === 0) {
    return playMoveGuide(input.nextSan, lights, input.chess);
  }

  const moveDiff =
    expectedMoveDiffSquares(input.chess, input.nextSan, input.lessonPlacement) ?? [
      lights.from,
      lights.to,
    ];

  // Piece for the guided move is in hand — keep from/to LEDs (move-diff only).
  if (
    isExpectedPieceInHand(
      input.lessonPlacement,
      input.boardPlacement,
      lights.from,
      lights.to,
      moveDiff,
    )
  ) {
    return playMoveGuide(input.nextSan, lights, input.chess);
  }

  // Clean mid-move toward the expected SAN (capture removed, etc.).
  if (
    isProgressTowardExpectedMove(
      input.chess,
      input.lessonPlacement,
      input.boardPlacement,
      input.nextSan,
    )
  ) {
    return playMoveGuide(input.nextSan, lights, input.chess);
  }

  // Any clean own-piece lift: do not flood setup LEDs — keep the lesson move guide.
  const lifted = findLiftedOwnSquare(
    input.lessonPlacement,
    input.boardPlacement,
    input.chess.turn(),
  );
  if (lifted) {
    return playMoveGuide(input.nextSan, lights, input.chess);
  }

  return {
    kind: "setup",
    mismatchedSquares: mismatches,
    mismatchCount: mismatches.length,
  };
}

/** Squares to light for the current guide state. */
export function guideLedSquares(guide: BoardGuide): string[] {
  switch (guide.kind) {
    case "waiting_signal":
    case "lesson_complete":
      return [];
    case "setup":
      return guide.mismatchedSquares;
    case "play_move":
      return [guide.from, guide.to];
    default: {
      const _exhaustive: never = guide;
      return _exhaustive;
    }
  }
}
