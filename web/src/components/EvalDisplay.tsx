import { useMemo } from "react";
import { isStartingPosition } from "../lib/chess";
import { bestMoveSan, formatEngineLine, formatEngineLines } from "../lib/engineLine";
import { evalBarPercent, formatEval, formatLineEval, type PositionEval } from "../lib/formatEval";
import type { EloSparklines as EloSparklineData, GamePerformance } from "../lib/performanceRating";
import type { EvalStatus } from "../hooks/usePositionEval";
import type { PerformanceStatus } from "../hooks/usePerformanceRating";
import type { Lang } from "../lib/lang";
import { fill, ui } from "../lib/uiCopy";
import { EloSparklines } from "./EloSparklines";

type GaugeProps = {
  fen: string;
  eval: PositionEval | null;
  status: EvalStatus;
  performance: GamePerformance;
  performanceStatus: PerformanceStatus;
  performanceSource?: "live" | "precomputed";
  sparklines?: EloSparklineData;
  maxPly?: number;
  hidden?: boolean;
  lang: Lang;
};

function formatSideElo(value: number | null, loading: boolean): string {
  if (value !== null) return String(value);
  return loading ? "…" : "—";
}

export function EvalGauge({
  fen,
  eval: evalData,
  status,
  performance,
  performanceStatus,
  performanceSource = "live",
  sparklines,
  maxPly = 0,
  hidden = false,
  lang,
}: GaugeProps) {
  const t = ui(lang);
  const label = formatEval(evalData);
  const barPct = evalBarPercent(evalData);
  const isLoading = status === "loading";
  const isError = status === "error";
  const atStart = isStartingPosition(fen);
  const perfLoading = performanceStatus === "loading";
  const showPerformance =
    performance.white.moves + performance.black.moves > 0 || perfLoading;
  const showSparklines =
    performanceSource === "live" &&
    sparklines &&
    maxPly > 0 &&
    sparklines.white.length + sparklines.black.length > 0;

  return (
    <div
      className={`eval-display${hidden ? " is-hidden" : ""}${isLoading ? " is-loading" : ""}`}
      aria-live="polite"
      aria-hidden={hidden}
    >
      <div className="eval-bar" aria-hidden="true">
        <div className="eval-bar-white" style={{ height: `${barPct}%` }} />
      </div>
      <div className="eval-readout">
        <span className="eval-label">{t.eval}</span>
        <span
          className={`eval-value${isLoading ? " is-loading" : ""}${isError ? " is-error" : ""}`}
          title={
            isError
              ? t.engineUnavailable
              : atStart
                ? t.whiteMovesFirst
                : evalData?.depth
                  ? fill(t.stockfishDepth, { n: evalData.depth })
                  : t.eval
          }
        >
          {isError ? "—" : isLoading && !evalData ? "…" : label}
        </span>
        {atStart && !isLoading && !isError ? (
          <span className="eval-hint">{t.whiteMovesFirst}</span>
        ) : showPerformance ? (
          <div
            className="eval-performance"
            title={performanceSource === "precomputed" ? t.lucasElo : t.runningElo}
          >
            <span className="eval-performance-label">{t.estElo}</span>
            <div className="eval-performance-values">
              <span className="eval-performance-side">
                W {formatSideElo(performance.white.elo, perfLoading)}
              </span>
              <span className="eval-performance-side">
                B {formatSideElo(performance.black.elo, perfLoading)}
              </span>
            </div>
            {showSparklines ? (
              <EloSparklines sparklines={sparklines} maxPly={maxPly} />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type ScenarioProps = {
  fen: string;
  eval: PositionEval | null;
  status: EvalStatus;
  hidden?: boolean;
  lang: Lang;
};

export function EngineBestLine({ fen, eval: evalData, status, hidden = false, lang }: ScenarioProps) {
  const t = ui(lang);
  const isLoading = status === "loading";

  const primary = useMemo(() => {
    if (evalData?.lines.length) {
      const line = formatEngineLines(fen, evalData.lines)[0];
      if (line) {
        return { eval: formatLineEval(line.cp, line.mate), moves: line.moves };
      }
    }
    if (evalData?.pvUci.length) {
      return { eval: formatEval(evalData), moves: formatEngineLine(fen, evalData.pvUci) };
    }
    const move = bestMoveSan(fen, evalData?.bestMoveUci);
    return move ? { eval: formatEval(evalData), moves: move } : null;
  }, [fen, evalData]);

  const tooltipLines = useMemo(() => {
    if (evalData?.lines.length) {
      return formatEngineLines(fen, evalData.lines, 3).map((line) => ({
        eval: formatLineEval(line.cp, line.mate),
        moves: line.moves,
      }));
    }
    if (evalData?.pvUci.length) {
      return [{ eval: formatEval(evalData), moves: formatEngineLine(fen, evalData.pvUci, 3) }];
    }
    const move = bestMoveSan(fen, evalData?.bestMoveUci);
    return move ? [{ eval: formatEval(evalData), moves: move }] : null;
  }, [fen, evalData]);

  const lines = tooltipLines ?? [];

  return (
    <div
      className={`engine-scenario-bar${hidden ? " is-hidden" : ""}${isLoading && !primary ? " is-loading" : ""}${lines.length > 0 ? " has-lines-tip" : ""}`}
      aria-hidden={hidden}
      tabIndex={lines.length > 0 ? 0 : undefined}
    >
      <span className="engine-scenario-label">{t.bestLine}</span>
      <span className="engine-scenario-moves">
        {primary?.moves ||
          (isLoading ? t.analyzing : status === "error" ? t.engineUnavailable : "…")}
      </span>
      {lines.length > 0 ? (
        <span className="engine-alt-lines-tooltip" role="tooltip">
          {lines.map((line, index) => (
            <span
              key={`${line.eval}-${index}`}
              className={`engine-alt-line${index === 0 ? " is-primary" : ""}`}
            >
              <span className="engine-alt-eval">{line.eval}</span>
              <span className="engine-alt-moves">{line.moves}</span>
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}
