import { formatGameResult, gameWinner, resultWinnerClass } from "../lib/gameResult";
import type { Lang } from "../lib/lang";
import { ui } from "../lib/uiCopy";

type Props = {
  result?: string;
  lang: Lang;
};

export function GameResultBadge({ result, lang }: Props) {
  const t = ui(lang);
  const winner = gameWinner(result);
  const label = formatGameResult(result);

  return (
    <span
      className={`lesson-result${winner === "white" ? " white-won" : winner === "black" ? " black-won" : winner === "draw" ? " is-draw" : ""}`}
      title={
        winner === "white"
          ? t.whiteWon
          : winner === "black"
            ? t.blackWon
            : winner === "draw"
              ? t.draw
              : t.gameResult
      }
    >
      {label}
    </span>
  );
}

export { gameWinner, resultWinnerClass };
