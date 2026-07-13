import { formatGameResult, gameWinner, resultWinnerClass } from "../lib/gameResult";

type Props = {
  result?: string;
};

export function GameResultBadge({ result }: Props) {
  const winner = gameWinner(result);
  const label = formatGameResult(result);

  return (
    <span
      className={`lesson-result${winner === "white" ? " white-won" : winner === "black" ? " black-won" : winner === "draw" ? " is-draw" : ""}`}
      title={
        winner === "white"
          ? "White won"
          : winner === "black"
            ? "Black won"
            : winner === "draw"
              ? "Draw"
              : "Game result"
      }
    >
      {label}
    </span>
  );
}

export { gameWinner, resultWinnerClass };
