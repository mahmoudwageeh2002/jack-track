import { create } from 'zustand';
import { collection, doc } from 'firebase/firestore';
import { requireDatabase } from '@/core/utils/firestore-request';
import type { PlanDay, UserPlan } from '@/features/plans/domain/plan';
import type { WorkoutSession } from '../domain/workout';

type WorkoutState = {
  session: WorkoutSession | null;
  start: (userId: string, plan: UserPlan, day: PlanDay) => void;
  updateSet: (exerciseId: string, setId: string, weight: number, reps: number) => void;
  toggleSet: (exerciseId: string, setId: string) => void;
  reset: () => void;
};

export const useWorkoutStore = create<WorkoutState>((set) => ({
  session: null,
  start: (userId, plan, day) => set((state) => {
    if (state.session?.userId === userId && state.session.planId === plan.id && state.session.planDayId === day.id) return state;
    return { session: {
      id: doc(collection(requireDatabase(), 'users', userId, 'workoutSessions')).id,
      userId, planId: plan.id, planDayId: day.id, startedAt: new Date(), status: 'in_progress',
      exercises: day.exercises.map((move) => ({
        exerciseId: move.exerciseId,
        sets: Array.from({ length: move.sets }, (_, index) => ({ id: move.exerciseId + '-' + index, setNumber: index + 1, weight: 0, reps: 0, completed: false })),
      })),
    } };
  }),
  updateSet: (exerciseId, setId, weight, reps) => set((state) => ({
    session: state.session ? { ...state.session, exercises: state.session.exercises.map((exercise) => exercise.exerciseId === exerciseId ? {
      ...exercise, sets: exercise.sets.map((item) => item.id === setId ? { ...item, weight, reps, completed: true } : item),
    } : exercise) } : null,
  })),
  toggleSet: (exerciseId, setId) => set((state) => ({
    session: state.session ? { ...state.session, exercises: state.session.exercises.map((exercise) => exercise.exerciseId === exerciseId ? {
      ...exercise, sets: exercise.sets.map((item) => item.id === setId ? { ...item, completed: !item.completed } : item),
    } : exercise) } : null,
  })),
  reset: () => set({ session: null }),
}));
