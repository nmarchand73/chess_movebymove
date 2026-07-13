import { Chess } from "chess.js";
import type { EnginePvLine } from "./formatEval";

const MAX_PV_PLIES = 6;

export type FormattedEngineLine = {
  cp: number | null;
  mate: number | null;
  moves: string;
};

function uciToMove(uci: string): { from: string; to: string; promotion?: string } {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci[4],
  };
}

/** Convert engine PV (UCI) to a numbered SAN line from the given position. */
export function formatEngineLine(fen: string, pvUci: string[], maxPlies = MAX_PV_PLIES): string {
  if (!pvUci.length) return "";

  const chess = new Chess(fen);
  const parts: string[] = [];

  for (const uci of pvUci.slice(0, maxPlies)) {
    const moveNum = chess.moveNumber();
    const isWhite = chess.turn() === "w";
    const { from, to, promotion } = uciToMove(uci);
    let move;
    try {
      move = chess.move({
        from,
        to,
        promotion: promotion as "q" | "r" | "b" | "n" | undefined,
      });
    } catch {
      break;
    }
    if (!move) break;

    if (isWhite) {
      parts.push(`${moveNum}.${move.san}`);
    } else if (parts.length > 0 && parts[parts.length - 1]?.startsWith(`${moveNum}.`)) {
      parts[parts.length - 1] = `${parts[parts.length - 1]} ${move.san}`;
    } else {
      parts.push(`${moveNum}...${move.san}`);
    }
  }

  return parts.join(" ");
}

export function formatEngineLines(
  fen: string,
  lines: EnginePvLine[],
  maxPlies = MAX_PV_PLIES,
): FormattedEngineLine[] {
  return lines
    .filter((line): line is EnginePvLine => Boolean(line?.pvUci.length))
    .map((line) => ({
      cp: line.cp,
      mate: line.mate,
      moves: formatEngineLine(fen, line.pvUci, maxPlies),
    }))
    .filter((line) => line.moves.length > 0);
}

export function bestMoveSan(fen: string, bestMoveUci: string | null | undefined): string | null {
  if (!bestMoveUci) return null;

  const chess = new Chess(fen);
  const { from, to, promotion } = uciToMove(bestMoveUci);
  try {
    const move = chess.move({
      from,
      to,
      promotion: promotion as "q" | "r" | "b" | "n" | undefined,
    });
    return move?.san ?? null;
  } catch {
    return null;
  }
}
