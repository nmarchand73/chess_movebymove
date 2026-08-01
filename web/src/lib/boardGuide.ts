import type { Chess } from "chess.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

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
  chess: Chess,
  expectedSan: string,
): { from: string; to: string } | null {
  const move = chess.moves({ verbose: true }).find((m) => m.san === expectedSan);
  if (!move) return null;
  return { from: move.from, to: move.to };
}

export function buildBoardGuide(input: {
  boardPlacement: string | null;
  lessonPlacement: string;
  nextSan: string | null;
  chess: Chess;
  atEnd: boolean;
}): BoardGuide {
  if (input.atEnd) return { kind: "lesson_complete" };
  if (!input.boardPlacement) return { kind: "waiting_signal" };

  const mismatches = mismatchedSquares(input.lessonPlacement, input.boardPlacement);
  if (mismatches.length > 0) {
    return {
      kind: "setup",
      mismatchedSquares: mismatches,
      mismatchCount: mismatches.length,
    };
  }

  if (!input.nextSan) return { kind: "lesson_complete" };

  const lights = resolveNextMoveLights(input.chess, input.nextSan);
  if (!lights) {
    return {
      kind: "setup",
      mismatchedSquares: [],
      mismatchCount: 0,
    };
  }

  return {
    kind: "play_move",
    san: input.nextSan,
    from: lights.from,
    to: lights.to,
    side: input.chess.turn() === "w" ? "white" : "black",
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
