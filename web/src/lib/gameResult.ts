export type GameWinner = "white" | "black" | "draw" | null;

export function gameWinner(result: string | undefined): GameWinner {
  if (!result || result === "*") return null;
  if (result === "1-0") return "white";
  if (result === "0-1") return "black";
  if (result.startsWith("1/2")) return "draw";
  return null;
}

export function formatGameResult(result: string | undefined): string {
  if (!result || result === "*") return "—";
  return result;
}

export function resultWinnerClass(side: "white" | "black", winner: GameWinner): string {
  if (winner === null || winner === "draw") return "";
  return winner === side ? " is-winner" : " is-loser";
}
