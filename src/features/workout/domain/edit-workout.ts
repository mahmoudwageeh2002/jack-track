import type { WorkoutExercise, WorkoutSession } from './workout';

export type WorkoutExerciseEdit = { exerciseId: string; sets: number };

export function minimumWorkoutSets(exercise?: WorkoutExercise) {
  // Preserve the position and identity of every set that already has recorded data.
  return exercise?.sets.reduce((minimum, set, index) => set.completed || set.reps > 0 || set.weight > 0 ? index + 1 : minimum, 1) ?? 1;
}

export function moveWorkoutExercise<T>(items: T[], from: number, to: number): T[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return items;
  const next = [...items];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

export function editWorkoutExercises(
  session: WorkoutSession | null,
  sessionId: string,
  edits: WorkoutExerciseEdit[],
  availableExerciseIds: string[],
): WorkoutSession {
  if (!session || session.id !== sessionId || session.status !== 'in_progress') throw new Error('This workout is no longer active. Reopen the workout to edit it.');
  if (!edits.length) throw new Error('Keep at least one exercise in your workout.');
  if (new Set(edits.map((edit) => edit.exerciseId)).size !== edits.length) throw new Error('Each exercise can only appear once.');
  const existing = new Map(session.exercises.map((exercise) => [exercise.exerciseId, exercise]));
  const available = new Set(availableExerciseIds);
  const exercises = edits.map(({ exerciseId, sets }) => {
    const original = existing.get(exerciseId);
    if (!original && !available.has(exerciseId)) throw new Error('Choose an exercise from your downloaded library.');
    if (!Number.isInteger(sets) || sets < minimumWorkoutSets(original) || sets > Math.max(20, original?.sets.length ?? 0)) {
      throw new Error('Use 1–20 sets and keep all sets that already have recorded data.');
    }
    if (original?.sets.length === sets) return original;
    return {
      exerciseId,
      sets: Array.from({ length: sets }, (_, index) => original?.sets[index] ?? {
        id: `${exerciseId}-${index}`, setNumber: index + 1, weight: 0, reps: 0, completed: false,
      }),
    };
  });
  if (exercises.length === session.exercises.length && exercises.every((exercise, index) => exercise === session.exercises[index])) return session;
  return { ...session, exercises };
}
