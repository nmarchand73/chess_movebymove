import { useEffect, useState } from "react";
import { loadPerformanceElos } from "../lib/lessonLoader";
import type { PerformanceElo } from "../types";

export type PerformanceEloIndex = Map<string, PerformanceElo>;

export function usePerformanceElos(): {
  performanceByLesson: PerformanceEloIndex;
  loading: boolean;
  error: string | null;
} {
  const [performanceByLesson, setPerformanceByLesson] = useState<PerformanceEloIndex>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadPerformanceElos()
      .then((data) => {
        if (cancelled) return;
        setPerformanceByLesson(new Map(Object.entries(data)));
        setError(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setPerformanceByLesson(new Map());
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { performanceByLesson, loading, error };
}
