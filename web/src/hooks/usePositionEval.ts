import { useEffect, useState } from "react";
import { hasDisplayableEval, type PositionEval } from "../lib/formatEval";
import { ANALYSIS_DEPTH, analyzeFen, getCachedEval } from "../lib/stockfishEngine";

export type EvalStatus = "idle" | "loading" | "ready" | "error";

export function usePositionEval(fen: string | null, enabled = true): {
  eval: PositionEval | null;
  status: EvalStatus;
} {
  const [evalForFen, setEvalForFen] = useState<string | null>(null);
  const [evalData, setEvalData] = useState<PositionEval | null>(null);
  const [status, setStatus] = useState<EvalStatus>("idle");

  const evalForCurrentFen = fen && evalForFen === fen ? evalData : null;

  useEffect(() => {
    if (!fen || !enabled) {
      setEvalForFen(null);
      setEvalData(null);
      setStatus("idle");
      return;
    }

    const cached = getCachedEval(fen);
    const cachedUsable = cached && hasDisplayableEval(cached);

    if (cachedUsable) {
      setEvalForFen(fen);
      setEvalData(cached);
      if (cached.depth >= ANALYSIS_DEPTH) {
        setStatus("ready");
        return;
      }
      setStatus("loading");
    } else {
      setEvalForFen(null);
      setEvalData(null);
      setStatus("loading");
    }

    let cancelled = false;

    const partialTimer = window.setInterval(() => {
      const partial = getCachedEval(fen);
      if (partial && hasDisplayableEval(partial) && !cancelled) {
        setEvalForFen(fen);
        setEvalData(partial);
      }
    }, 120);

    analyzeFen(fen, "high")
      .then((result) => {
        if (cancelled) return;
        setEvalForFen(fen);
        setEvalData(result);
        if (hasDisplayableEval(result)) {
          setStatus("ready");
        } else if (result.depth >= ANALYSIS_DEPTH) {
          setStatus("error");
        } else {
          setStatus("loading");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setEvalForFen(null);
        setEvalData(null);
        setStatus("error");
      });

    return () => {
      cancelled = true;
      window.clearInterval(partialTimer);
    };
  }, [fen, enabled]);

  return { eval: evalForCurrentFen, status };
}
