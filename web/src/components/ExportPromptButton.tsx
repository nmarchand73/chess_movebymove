import { useCallback, useEffect, useRef, useState } from "react";
import type { Lesson } from "../types.ts";
import { buildAnalysisPrompt } from "../lib/analysisPrompt.ts";
import type { Lang } from "../lib/lang";
import { ui } from "../lib/uiCopy";

type Props = {
  lesson: Lesson;
  ply: number;
  lang: Lang;
};

export function ExportPromptButton({ lesson, ply, lang }: Props) {
  const t = ui(lang);
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

  const label =
    status === "copied" ? t.promptCopied : status === "error" ? t.copyFailed : t.copyPrompt;

  return (
    <button
      type="button"
      className="secondary export-prompt-btn"
      onClick={handleCopy}
      title={t.copyPrompt}
    >
      {label}
    </button>
  );
}
