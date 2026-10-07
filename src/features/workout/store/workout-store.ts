import { create } from 'zustand';
import { collection, doc } from 'firebase/firestore';
import { requireDatabase } from '@/core/utils/firestore-request';
import type { PlanDay, UserPlan } from '@/features/plans/domain/plan';
import type { WorkoutSession } from '../domain/workout';
import { offlineStorage } from '@/features/offline/data/offline-storage';
import { useOfflineState } from '@/features/offline/data/connectivity';
import { editWorkoutExercises, type WorkoutExerciseEdit } from '../domain/edit-workout';
import { freshWorkoutSet, workoutDefaults } from '../domain/workout-defaults';

type WorkoutState = {
  session: WorkoutSession | null;
  readyForUid: string | null;
  hydrate: (uid: string) => Promise<void>;
  start: (userId: string, plan: UserPlan, day: PlanDay, history: WorkoutSession[]) => void;
  updateSet: (exerciseId: string, setId: string, weight: number, reps: number) => void;
  toggleSet: (exerciseId: string, setId: string) => void;
  editExercises: (sessionId: string, edits: WorkoutExerciseEdit[], availableExerciseIds: string[], history: WorkoutSession[]) => void;
  reset: () => void;
};

let hydration = 0;
export const useWorkoutStore = create<WorkoutState>((set) => ({
  session: null,
  readyForUid: null,
  hydrate: async (uid) => {
    const generation = ++hydration;
    set({ session: null, readyForUid: null });
    try {
      const account = await offlineStorage.read(uid);
      if (generation === hydration) set({ session: account.draft?.userId === uid ? account.draft : null, readyForUid: uid });
    } catch {
      if (generation === hydration) useOfflineState.setState({ storageError: 'Could not load saved workouts. Try reopening the app before starting a new workout.' });
    }
  },
  start: (userId, plan, day, history) => set((state) => {
    if (state.readyForUid !== userId) return state;
    if (state.session?.userId === userId && state.session.planId === plan.id && state.session.planDayId === day.id) return state;
    const defaults = workoutDefaults(userId, plan.id, day.id, history);
    return { session: {
      id: doc(collection(requireDatabase(), 'users', userId, 'workoutSessions')).id,
      userId, planId: plan.id, planDayId: day.id, startedAt: new Date(), status: 'in_progress',
      exercises: day.exercises.map((move) => ({
        exerciseId: move.exerciseId,
        sets: Array.from({ length: move.sets }, (_, index) => freshWorkoutSet(move.exerciseId, index, defaults)),
      })),
    } };
  }),
  updateSet: (exerciseId, setId, weight, reps) => set((state) => ({
    session: state.session ? { ...state.session, exercises: state.session.exercises.map((exercise) => exercise.exerciseId === exerciseId ? {
      ...exercise, sets: exercise.sets.map((item) => item.id === setId ? { ...item, weight, reps, completed: true, prefilledFromHistory: false } : item),
    } : exercise) } : null,
  })),
  toggleSet: (exerciseId, setId) => set((state) => ({
    session: state.session ? { ...state.session, exercises: state.session.exercises.map((exercise) => exercise.exerciseId === exerciseId ? {
      ...exercise, sets: exercise.sets.map((item) => item.id === setId ? { ...item, completed: !item.completed, prefilledFromHistory: false } : item),
    } : exercise) } : null,
  })),
  editExercises: (sessionId, edits, availableExerciseIds, history) => set((state) => ({
    session: editWorkoutExercises(state.session, sessionId, edits, availableExerciseIds, history),
  })),
  reset: () => { hydration++; set({ session: null, readyForUid: null }); },
}));

useWorkoutStore.subscribe((state, previous) => {
  if (!state.session || state.session === previous.session) return;
  void offlineStorage.saveDraft(state.session).then(() => {
    useOfflineState.setState({ storageError: null });
  }).catch(() => {
    useOfflineState.setState({ storageError: 'Your latest sets could not be saved on this device. Free up storage and try saving again.' });
  });
});
