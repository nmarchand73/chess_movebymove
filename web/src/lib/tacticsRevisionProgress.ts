const KEY = "move-by-move-tactics-revision";

export type TacticsExerciseProgress = {
  attempts: number;
  solved: boolean;
  revealed: boolean;
  firstTry: boolean;
  /** 3 first try, 2 second, 1 later, 0 if revealed before solving. */
  points: number | null;
};

export type TacticsRevisionProgress = {
  seenModules: Record<string, boolean>;
  exercises: Record<string, TacticsExerciseProgress>;
};

function defaultExercise(): TacticsExerciseProgress {
  return {
    attempts: 0,
    solved: false,
    revealed: false,
    firstTry: false,
    points: null,
  };
}

export function loadTacticsRevisionProgress(): TacticsRevisionProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { seenModules: {}, exercises: {} };
    const parsed = JSON.parse(raw) as TacticsRevisionProgress;
    return {
      seenModules: parsed.seenModules ?? {},
      exercises: parsed.exercises ?? {},
    };
  } catch {
    return { seenModules: {}, exercises: {} };
  }
}

export function saveTacticsRevisionProgress(state: TacticsRevisionProgress): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function markTacticsModuleSeen(moduleId: string): void {
  const state = loadTacticsRevisionProgress();
  state.seenModules[moduleId] = true;
  saveTacticsRevisionProgress(state);
}

export function seenTacticsModuleCount(state: TacticsRevisionProgress = loadTacticsRevisionProgress()): number {
  return Object.keys(state.seenModules).filter((id) => state.seenModules[id]).length;
}

export function getTacticsExerciseProgress(
  id: string,
  state: TacticsRevisionProgress = loadTacticsRevisionProgress(),
): TacticsExerciseProgress {
  return state.exercises[id] ?? defaultExercise();
}

export function pointsForAttempt(attemptsBeforeThis: number, revealed: boolean): number {
  if (revealed) return 0;
  if (attemptsBeforeThis <= 0) return 3;
  if (attemptsBeforeThis === 1) return 2;
  return 1;
}

export function recordTacticsAttempt(
  id: string,
  result: "correct" | "wrong" | "reveal",
): TacticsExerciseProgress {
  const state = loadTacticsRevisionProgress();
  const current = getTacticsExerciseProgress(id, state);
  if (current.solved || current.revealed) {
    return current;
  }

  if (result === "reveal") {
    const next: TacticsExerciseProgress = {
      ...current,
      revealed: true,
      points: 0,
    };
    state.exercises[id] = next;
    saveTacticsRevisionProgress(state);
    return next;
  }

  const attempts = current.attempts + 1;
  if (result === "correct") {
    const next: TacticsExerciseProgress = {
      attempts,
      solved: true,
      revealed: false,
      firstTry: attempts === 1,
      points: pointsForAttempt(attempts - 1, false),
    };
    state.exercises[id] = next;
    saveTacticsRevisionProgress(state);
    return next;
  }

  const next: TacticsExerciseProgress = {
    ...current,
    attempts,
  };
  state.exercises[id] = next;
  saveTacticsRevisionProgress(state);
  return next;
}

export function resetTacticsRevisionProgress(): void {
  localStorage.removeItem(KEY);
}

export function modulePracticeSummary(
  exerciseIds: string[],
  state: TacticsRevisionProgress = loadTacticsRevisionProgress(),
): { done: number; points: number; max: number } {
  let done = 0;
  let points = 0;
  for (const id of exerciseIds) {
    const p = getTacticsExerciseProgress(id, state);
    if (p.solved || p.revealed) done += 1;
    if (p.points != null) points += p.points;
  }
  return { done, points, max: exerciseIds.length * 3 };
}
