import type { LessonSummary, PlayerAggregate, PerformanceElo } from "../types";

function addSample(
  map: Map<string, { total: number; count: number; white: number; black: number }>,
  name: string,
  elo: number,
  color: "white" | "black",
): void {
  const existing = map.get(name) ?? { total: 0, count: 0, white: 0, black: 0 };
  existing.total += elo;
  existing.count += 1;
  if (color === "white") existing.white += 1;
  else existing.black += 1;
  map.set(name, existing);
}

export function aggregatePlayerElos(lessons: LessonSummary[]): PlayerAggregate[] {
  const map = new Map<string, { total: number; count: number; white: number; black: number }>();

  for (const lesson of lessons) {
    const elo = lesson.performanceElo;
    if (!elo) continue;
    addSample(map, lesson.players.white, elo.white, "white");
    addSample(map, lesson.players.black, elo.black, "black");
  }

  return [...map.entries()]
    .map(([name, stats]) => ({
      name,
      games: stats.count,
      avgElo: Math.round(stats.total / stats.count),
      asWhite: stats.white,
      asBlack: stats.black,
    }))
    .sort((a, b) => b.avgElo - a.avgElo || a.name.localeCompare(b.name));
}

export function formatPlayerWithElo(name: string, elo: number | undefined): string {
  if (elo === undefined) return name;
  return `${name} (~${elo})`;
}

export function formatGameElos(performanceElo: PerformanceElo | undefined): string | null {
  if (!performanceElo) return null;
  return `${performanceElo.white} · ${performanceElo.black}`;
}

export function gamesWithPerformanceElo(lessons: LessonSummary[]): number {
  return lessons.filter((lesson) => lesson.performanceElo).length;
}
