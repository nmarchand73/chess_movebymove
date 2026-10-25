const KEY = "move-by-move-kasparov-chess";

export type KasparovExerciseProgress = {
  attempts: number;
  solved: boolean;
  revealed: boolean;
  firstTry: boolean;
  /** 3 first try, 2 second, 1 later, 0 if revealed before solving. */
  points: number | null;
};

export type KasparovChessProgress = Record<string, KasparovExerciseProgress>;

function defaultExercise(): KasparovExerciseProgress {
  return {
    attempts: 0,
    solved: false,
    revealed: false,
    firstTry: false,
    points: null,
  };
}

export function loadKasparovChessProgress(): KasparovChessProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as KasparovChessProgress;
  } catch {
    return {};
  }
}

export function saveKasparovChessProgress(state: KasparovChessProgress): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function getExerciseProgress(
  id: string,
  state: KasparovChessProgress = loadKasparovChessProgress(),
): KasparovExerciseProgress {
  return state[id] ?? defaultExercise();
}

export function pointsForAttempt(attemptsBeforeThis: number, revealed: boolean): number {
  if (revealed) return 0;
  if (attemptsBeforeThis <= 0) return 3;
  if (attemptsBeforeThis === 1) return 2;
  return 1;
}

export function recordKasparovAttempt(
  id: string,
  result: "correct" | "wrong" | "reveal",
): KasparovExerciseProgress {
  const state = loadKasparovChessProgress();
  const current = getExerciseProgress(id, state);
  if (current.solved || current.revealed) {
    return current;
  }

  if (result === "reveal") {
    const next: KasparovExerciseProgress = {
      ...current,
      revealed: true,
      points: 0,
    };
    state[id] = next;
    saveKasparovChessProgress(state);
    return next;
  }

  const attempts = current.attempts + 1;
  if (result === "correct") {
    const next: KasparovExerciseProgress = {
      attempts,
      solved: true,
      revealed: false,
      firstTry: attempts === 1,
      points: pointsForAttempt(attempts - 1, false),
    };
    state[id] = next;
    saveKasparovChessProgress(state);
    return next;
  }

  const next: KasparovExerciseProgress = {
    ...current,
    attempts,
  };
  state[id] = next;
  saveKasparovChessProgress(state);
  return next;
}

export function resetKasparovChessProgress(): void {
  saveKasparovChessProgress({});
}

export function kasparovProgressSummary(
  exerciseIds: string[],
  state: KasparovChessProgress = loadKasparovChessProgress(),
): { done: number; firstTry: number; points: number; maxPoints: number } {
  let done = 0;
  let firstTry = 0;
  let points = 0;
  for (const id of exerciseIds) {
    const s = state[id];
    if (!s) continue;
    if (s.solved || s.revealed) {
      done += 1;
      if (s.firstTry) firstTry += 1;
      points += s.points ?? 0;
    }
  }
  return { done, firstTry, points, maxPoints: exerciseIds.length * 3 };
}

export function doneExerciseCount(
  state: KasparovChessProgress = loadKasparovChessProgress(),
): number {
  return Object.values(state).filter((s) => s.solved || s.revealed).length;
}
