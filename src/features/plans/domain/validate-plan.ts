import type { PlanDay, UserPlan } from './plan';

export function validateDays(days: PlanDay[]) {
  if (!days.length || days.length > 7) throw new Error('Choose between 1 and 7 training days.');
  if (new Set(days.map((day) => day.id)).size !== days.length) throw new Error('Each training day must be unique.');
  for (const day of days) {
    if (!day.name.trim() || !day.exercises.length) throw new Error('Give every training day a name and at least one exercise.');
    if (new Set(day.exercises.map((move) => move.exerciseId)).size !== day.exercises.length) throw new Error('An exercise can only be added once per day.');
    for (const move of day.exercises) {
      if (!move.exerciseId || !Number.isInteger(move.sets) || move.sets < 1 || move.sets > 20) throw new Error('Choose between 1 and 20 sets for each exercise.');
    }
  }
}

export function validateCustomPlan(plan: Omit<UserPlan, 'ownerId'>) {
  if (!plan.name.trim() || plan.name.trim().length > 80) throw new Error('Give your plan a name up to 80 characters.');
  validateDays(plan.days);
  const training = plan.days.map((day) => day.weekday);
  if (training.some((day) => day === undefined || !Number.isInteger(day) || day < 0 || day > 6) || new Set(training).size !== training.length) {
    throw new Error('Choose a different weekday for each training day.');
  }
  const rest = plan.restDays ?? [];
  if (rest.some((day) => !Number.isInteger(day) || day < 0 || day > 6 || training.includes(day)) ||
    new Set(rest).size !== rest.length || training.length + rest.length !== 7) {
    throw new Error('Choose training or rest for every day of the week.');
  }
}
