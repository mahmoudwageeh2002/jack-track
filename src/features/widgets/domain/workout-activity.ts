import type { WorkoutSession } from '@/features/workout/domain/workout';

export type WorkoutActivityProps = {
  sessionId: string;
  workoutName: string;
  startedAt: number;
  currentExercise: string;
  nextExercise: string;
  currentSet: number;
  exerciseSets: number;
  completedSets: number;
  totalSets: number;
  allSetsComplete: boolean;
};

export function workoutActivityProps(
  session: WorkoutSession | null,
  uid: string | null,
  exercises: { id: string; name: string }[],
  workoutName = 'Workout',
): WorkoutActivityProps | null {
  if (!session || session.userId !== uid || session.status !== 'in_progress') return null;
  const totalSets = session.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  if (!totalSets || !Number.isFinite(session.startedAt.getTime())) return null;
  const remaining = session.exercises.filter((exercise) => exercise.sets.some((set) => !set.completed));
  const current = remaining[0];
  const next = remaining[1];
  const names = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
  const name = (id: string) => (names.get(id)?.trim() || 'Exercise').slice(0, 80);
  return {
    sessionId: session.id,
    workoutName: workoutName.slice(0, 80),
    startedAt: session.startedAt.getTime(),
    currentExercise: current ? name(current.exerciseId) : 'All sets complete',
    nextExercise: next ? name(next.exerciseId) : current ? 'Finish workout' : 'Save your workout in Jack Track',
    currentSet: current ? current.sets.findIndex((set) => !set.completed) + 1 : 0,
    exerciseSets: current?.sets.length ?? 0,
    completedSets: session.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.completed).length, 0),
    totalSets,
    allSetsComplete: !current,
  };
}
