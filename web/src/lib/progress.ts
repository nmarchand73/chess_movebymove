const KEY = "move-by-move-progress";

export type ProgressState = {
  lastLessonId?: string;
  lastPly?: number;
  reviewQueue: Array<{ lessonId: string; ply: number }>;
  gameProgress: Record<string, number>;
};

function defaultState(): ProgressState {
  return { reviewQueue: [], gameProgress: {} };
}

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as ProgressState;
    return { ...defaultState(), ...parsed, gameProgress: parsed.gameProgress ?? {} };
  } catch {
    return defaultState();
  }
}

export function saveProgress(state: ProgressState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function markContinue(lessonId: string, ply: number, moveCount?: number): void {
  const state = loadProgress();
  state.lastLessonId = lessonId;
  state.lastPly = ply;
  if (moveCount) {
    state.gameProgress[lessonId] = Math.round((ply / moveCount) * 100);
  }
  saveProgress(state);
}

export function getGameProgress(lessonId: string): number {
  return loadProgress().gameProgress[lessonId] ?? 0;
}

export function enqueueReview(lessonId: string, ply: number): void {
  const state = loadProgress();
  const exists = state.reviewQueue.some((r) => r.lessonId === lessonId && r.ply === ply);
  if (!exists) state.reviewQueue.push({ lessonId, ply });
  saveProgress(state);
}
