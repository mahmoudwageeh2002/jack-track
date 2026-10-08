import type { WorkoutSession, WorkoutSet } from './workout';

type SetValues = Pick<WorkoutSet, 'weight' | 'reps'>;
export type WorkoutDefaults = Map<string, Map<number, SetValues>>;

// Read the user's saved workout history, including completions waiting to sync.
// Match stable exercise IDs and set numbers so reordering cannot mix up values.
export function workoutDefaults(userId: string, planId: string, planDayId: string, history: WorkoutSession[]): WorkoutDefaults {
  const defaults: WorkoutDefaults = new Map();
  const sessions = history.filter((session) => session.userId === userId && session.planId === planId && session.planDayId === planDayId &&
    session.status === 'completed' && session.completedAt && Number.isFinite(session.completedAt.getTime()))
    .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime() || b.id.localeCompare(a.id));
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const sets = defaults.get(exercise.exerciseId) ?? new Map<number, SetValues>();
      for (const set of exercise.sets) {
        if (!set.completed || !Number.isInteger(set.setNumber) || set.setNumber < 1 ||
          !Number.isFinite(set.weight) || set.weight < 0 || !Number.isInteger(set.reps) || set.reps <= 0 || sets.has(set.setNumber)) continue;
        sets.set(set.setNumber, { weight: set.weight, reps: set.reps });
      }
      defaults.set(exercise.exerciseId, sets);
    }
  }
  return defaults;
}

export function freshWorkoutSet(exerciseId: string, index: number, defaults?: WorkoutDefaults): WorkoutSet {
  const previous = defaults?.get(exerciseId)?.get(index + 1);
  return {
    id: `${exerciseId}-${index}`, setNumber: index + 1,
    weight: previous?.weight ?? 0, reps: previous?.reps ?? 0, completed: false,
    ...(previous ? { prefilledFromHistory: true } : {}),
  };
}

export function hasRecordedSetValues(set: WorkoutSet) {
  return set.completed || (!set.prefilledFromHistory && (set.reps > 0 || set.weight > 0));
}
