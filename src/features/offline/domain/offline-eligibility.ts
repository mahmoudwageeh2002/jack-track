import type { UserPlan } from '../../plans/domain/plan';
import type { Exercise } from '../../exercises/domain/exercise';

export function offlineEligibility(uid: string | undefined, plan: UserPlan | null | undefined, exercises: Exercise[] | undefined) {
  if (!uid) return 'account';
  if (!plan || plan.ownerId !== uid) return 'plan';
  const ids = new Set(exercises?.map((exercise) => exercise.id));
  if (plan.days.some((day) => day.exercises.some((exercise) => !ids.has(exercise.exerciseId)))) return 'download';
  return 'ready';
}
