import { useCallback, useEffect, useRef, useState } from "react";
import type { Lesson } from "../types.ts";
import { buildAnalysisPrompt } from "../lib/analysisPrompt.ts";

type Props = {
  lesson: Lesson;
  ply: number;
};

export function ExportPromptButton({ lesson, ply }: Props) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    const prompt = buildAnalysisPrompt(lesson, ply);
    try {
      await navigator.clipboard.writeText(prompt);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setStatus("idle"), 2000);
  }, [lesson, ply]);

  const label = status === "copied" ? "Prompt copied" : status === "error" ? "Copy failed" : "Copy analysis prompt";

  return (
    <button
      type="button"
      className="secondary export-prompt-btn"
      onClick={handleCopy}
      title="Copy an AI prompt with the game PGN up to the current move"
    >
      {label}
    </button>
  );
}
