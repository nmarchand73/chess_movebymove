import { useMemo } from "react";
import type { EloSparklines as EloSparklineData } from "../lib/performanceRating";

type Props = {
  sparklines: EloSparklineData;
  maxPly: number;
};

const WIDTH = 44;
const HEIGHT = 22;
const PAD_X = 2;
const PAD_Y = 3;

function toPolyline(
  points: EloSparklineData["white"],
  maxPly: number,
  yMin: number,
  yMax: number,
): string {
  if (!points.length || maxPly <= 0) return "";

  const xSpan = WIDTH - PAD_X * 2;
  const ySpan = HEIGHT - PAD_Y * 2;

  return points
    .map((point) => {
      const x = PAD_X + ((point.ply - 1) / maxPly) * xSpan;
      const y = PAD_Y + (1 - (point.elo - yMin) / yMax) * ySpan;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function EloSparklines({ sparklines, maxPly }: Props) {
  const geometry = useMemo(() => {
    const values = [...sparklines.white, ...sparklines.black].map((point) => point.elo);
    if (!values.length) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(max - min, 120);

    return {
      yMin: min,
      yMax: span,
      white: toPolyline(sparklines.white, maxPly, min, span),
      black: toPolyline(sparklines.black, maxPly, min, span),
      lastWhite: sparklines.white.at(-1),
      lastBlack: sparklines.black.at(-1),
    };
  }, [sparklines, maxPly]);

  if (!geometry) return null;
  if (sparklines.white.length + sparklines.black.length === 0) return null;

  const dot = (point: { ply: number; elo: number } | undefined, className: string) => {
    if (!point || maxPly <= 0) return null;
    const xSpan = WIDTH - PAD_X * 2;
    const ySpan = HEIGHT - PAD_Y * 2;
    const x = PAD_X + ((point.ply - 1) / maxPly) * xSpan;
    const y = PAD_Y + (1 - (point.elo - geometry.yMin) / geometry.yMax) * ySpan;
    return <circle className={className} cx={x} cy={y} r={1.6} />;
  };

  return (
    <div className="elo-sparklines-wrap" title="Running Est. Elo by move">
      <svg
        className="elo-sparklines"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={WIDTH}
        height={HEIGHT}
        aria-hidden="true"
      >
        {geometry.white ? (
          <polyline className="elo-sparkline elo-sparkline-white" points={geometry.white} />
        ) : null}
        {geometry.black ? (
          <polyline className="elo-sparkline elo-sparkline-black" points={geometry.black} />
        ) : null}
        {dot(geometry.lastWhite, "elo-spark-dot elo-spark-dot-white")}
        {dot(geometry.lastBlack, "elo-spark-dot elo-spark-dot-black")}
      </svg>
      <div className="elo-sparklines-legend" aria-hidden="true">
        <span className="elo-sparklines-key elo-sparklines-key-white">W</span>
        <span className="elo-sparklines-key elo-sparklines-key-black">B</span>
      </div>
    </div>
  );
}
