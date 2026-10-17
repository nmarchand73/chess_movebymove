const KEY = "move-by-move-opening-revision";

export type OpeningRevisionProgress = {
  seenModules: Record<string, boolean>;
  knowledgeScore: number;
  knowledgeTotal: number;
  skillScore: number;
  skillTotal: number;
};

function defaultState(): OpeningRevisionProgress {
  return {
    seenModules: {},
    knowledgeScore: 0,
    knowledgeTotal: 0,
    skillScore: 0,
    skillTotal: 0,
  };
}

export function loadOpeningRevisionProgress(): OpeningRevisionProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...(JSON.parse(raw) as OpeningRevisionProgress) };
  } catch {
    return defaultState();
  }
}

export function saveOpeningRevisionProgress(state: OpeningRevisionProgress): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function markModuleSeen(moduleId: string): void {
  const state = loadOpeningRevisionProgress();
  state.seenModules[moduleId] = true;
  saveOpeningRevisionProgress(state);
}

export function recordBatteryScore(
  kind: "knowledge" | "skill",
  score: number,
  total: number,
): void {
  const state = loadOpeningRevisionProgress();
  if (kind === "knowledge") {
    state.knowledgeScore = score;
    state.knowledgeTotal = total;
  } else {
    state.skillScore = score;
    state.skillTotal = total;
  }
  saveOpeningRevisionProgress(state);
}

export function seenModuleCount(state: OpeningRevisionProgress = loadOpeningRevisionProgress()): number {
  return Object.values(state.seenModules).filter(Boolean).length;
}
