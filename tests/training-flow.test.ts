import assert from 'node:assert/strict';
import test from 'node:test';
import { exerciseCatalog } from '../firebase/exercise-catalog';
import { todaysPlanDay } from '../src/features/plans/domain/schedule';
import { validateCustomPlan } from '../src/features/plans/domain/validate-plan';
import type { UserPlan } from '../src/features/plans/domain/plan';
import type { WorkoutSession } from '../src/features/workout/domain/workout';
import { workoutStats } from '../src/features/workout/domain/workout-stats';

const plan: UserPlan = {
  id: 'test-plan', ownerId: 'test-user', sourcePlanId: null, isCustom: true, isOfficial: false,
  name: 'My training', description: '', level: 'beginner', goal: 'strength', createdAt: new Date(0),
  days: [
    { id: 'a', name: 'First day', order: 1, weekday: 0, exercises: [{ exerciseId: 'barbell-squat', order: 1, sets: 3 }] },
    { id: 'b', name: 'Second day', order: 2, weekday: 3, exercises: [{ exerciseId: 'barbell-row', order: 1, sets: 4 }] },
  ], restDays: [1, 2, 4, 5, 6],
};
const session = (date: string, status: WorkoutSession['status'] = 'completed'): WorkoutSession => ({
  id: date, userId: 'test-user', planId: 'test-plan', planDayId: 'a', startedAt: new Date(date + 'T09:00:00'),
  completedAt: new Date(date + 'T10:00:00'), completedDay: date, status,
  exercises: [{ exerciseId: 'barbell-squat', sets: [
    { id: 'a', setNumber: 1, reps: 10, weight: 20, completed: true },
    { id: 'b', setNumber: 2, reps: 10, weight: 100, completed: false },
  ] }],
});

test('new accounts have no invented training totals or streak', () => {
  assert.deepEqual(workoutStats([], new Date('2026-09-29T12:00:00')), { current: 0, best: 0, total: 0, weekly: 0, volume: 0, days: [] });
});
test('streaks deduplicate days, ignore unfinished sessions, and only count completed set volume', () => {
  const result = workoutStats([session('2026-09-27'), session('2026-09-28'), session('2026-09-28'), session('2026-09-29', 'cancelled')], new Date('2026-09-29T12:00:00'));
  assert.equal(result.current, 2);
  assert.equal(result.best, 2);
  assert.equal(result.total, 3);
  assert.equal(result.weekly, 2);
  assert.equal(result.volume, 400);
});
test('missing a calendar day resets current streak but preserves best', () => {
  const result = workoutStats([session('2026-09-25'), session('2026-09-26')], new Date('2026-09-29T12:00:00'));
  assert.equal(result.current, 0);
  assert.equal(result.best, 2);
});
test('weekly schedules return the assigned day and no workout on rest days', () => {
  assert.equal(todaysPlanDay(plan, 100, new Date('2026-09-28T12:00:00'))?.id, 'a');
  assert.equal(todaysPlanDay(plan, 0, new Date('2026-09-29T12:00:00')), null);
  assert.equal(todaysPlanDay(plan, 0, new Date('2026-10-01T12:00:00'))?.id, 'b');
});
test('legacy plans rotate based on actual completed sessions', () => {
  const legacy = { ...plan, restDays: [], days: plan.days.map(({ weekday: _weekday, ...day }) => day) };
  assert.equal(todaysPlanDay(legacy, 1)?.id, 'b');
  assert.equal(todaysPlanDay(legacy, 2)?.id, 'a');
});
test('valid custom plan covers all seven days', () => assert.doesNotThrow(() => validateCustomPlan(plan)));
test('incomplete days, duplicate exercises, invalid sets and overlapping rest days cannot save', () => {
  assert.throws(() => validateCustomPlan({ ...plan, days: [] }));
  assert.throws(() => validateCustomPlan({ ...plan, days: [{ ...plan.days[0], exercises: [] }] }));
  for (const sets of [0, -1, 1.5, 21]) {
    assert.throws(() => validateCustomPlan({ ...plan, days: [{ ...plan.days[0], exercises: [{ ...plan.days[0].exercises[0], sets }] }] }));
  }
  assert.throws(() => validateCustomPlan({ ...plan, days: [{ ...plan.days[0], exercises: [plan.days[0].exercises[0], plan.days[0].exercises[0]] }] }));
  assert.throws(() => validateCustomPlan({ ...plan, restDays: [0, 1, 2, 4, 5] }));
  assert.throws(() => validateCustomPlan({ ...plan, days: plan.days.map((day) => ({ ...day, weekday: 0 })) }));
});
test('reference catalog has unique IDs, briefs, instructions, and every muscle group', () => {
  assert.equal(exerciseCatalog.length, 35);
  assert.equal(new Set(exerciseCatalog.map((exercise) => exercise.id)).size, exerciseCatalog.length);
  assert.equal(new Set(exerciseCatalog.map((exercise) => exercise.primaryMuscle)).size, 7);
  for (const exercise of exerciseCatalog) {
    assert.ok(exercise.description);
    assert.ok(exercise.instructions.length);
    assert.equal(exercise.status, 'active');
  }
});
