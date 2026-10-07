import assert from 'node:assert/strict';
import test from 'node:test';
import { workoutDefaults, freshWorkoutSet } from '../src/features/workout/domain/workout-defaults';
import { editWorkoutExercises, minimumWorkoutSets } from '../src/features/workout/domain/edit-workout';
import { createOfflineStorage } from '../src/features/offline/domain/offline-storage';
import { drainWorkouts } from '../src/features/offline/domain/drain-workouts';
import { workoutStats } from '../src/features/workout/domain/workout-stats';
import type { WorkoutSession, WorkoutSet } from '../src/features/workout/domain/workout';

function saved(id = 'old', date = '2026-10-01T12:00:00Z'): WorkoutSession {
  return {
    id, userId: 'alice', planId: 'plan', planDayId: 'push', startedAt: new Date(date), completedAt: new Date(date), status: 'completed',
    exercises: [{ exerciseId: 'press', sets: [40, 45, 50].map((weight, index) => ({
      id: `old-${index}`, setNumber: index + 1, weight, reps: 12 - index * 2, completed: true, estimatedOneRepMax: 999,
    })) }],
  };
}
function next(history: WorkoutSession[], count = 3): WorkoutSession {
  const defaults = workoutDefaults('alice', 'plan', 'push', history);
  return {
    id: 'next', userId: 'alice', planId: 'plan', planDayId: 'push', status: 'in_progress', startedAt: new Date('2026-10-06T12:00:00Z'),
    exercises: [{ exerciseId: 'press', sets: Array.from({ length: count }, (_, index) => freshWorkoutSet('press', index, defaults)) }],
  };
}

test('each new set starts with previous weight/reps, fresh identity, and no completion or old metrics', () => {
  const source = saved();
  const workout = next([source]);
  assert.deepEqual(workout.exercises[0].sets.map(({ weight, reps }) => [weight, reps]), [[40, 12], [45, 10], [50, 8]]);
  for (const [index, set] of workout.exercises[0].sets.entries()) {
    assert.equal(set.completed, false);
    assert.equal(set.prefilledFromHistory, true);
    assert.equal(set.estimatedOneRepMax, undefined);
    assert.notEqual(set.id, source.exercises[0].sets[index].id);
  }
  assert.equal(workoutStats([workout]).total, 0);
  workout.exercises[0].sets[0].weight = 60;
  assert.equal(source.exercises[0].sets[0].weight, 40);
});

test('uses latest completion time rather than upload or array order and matches set numbers after reordering', () => {
  const older = saved();
  const newer = saved('newer', '2026-10-05T12:00:00Z');
  newer.exercises[0].sets[0].weight = 70;
  newer.exercises[0].sets.reverse();
  for (const history of [[older, newer], [newer, older]]) assert.equal(next(history).exercises[0].sets[0].weight, 70);
});

test('never borrows from another account, workout day, plan, or unfinished session', () => {
  const base = saved();
  for (const change of [{ userId: 'bob' }, { planId: 'other-plan' }, { planDayId: 'pull' }, { status: 'in_progress' as const }, { status: 'cancelled' as const }, { completedAt: undefined }]) {
    const workout = next([{ ...base, ...change }]);
    assert.ok(workout.exercises[0].sets.every((set) => set.weight === 0 && set.reps === 0 && !set.completed));
  }
});

test('skipped and invalid sets cannot overwrite last completed values; zero bodyweight is valid', () => {
  const old = saved();
  const latest = saved('latest', '2026-10-05T12:00:00Z');
  const bad: Partial<WorkoutSet>[] = [{ completed: false, weight: 99 }, { weight: NaN }, { weight: -5 }, { reps: 0 }, { reps: 1.5 }];
  for (const change of bad) {
    latest.exercises[0].sets[0] = { ...old.exercises[0].sets[0], ...change };
    assert.equal(next([old, latest]).exercises[0].sets[0].weight, 40);
  }
  latest.exercises[0].sets[0] = { ...old.exercises[0].sets[0], weight: 0, reps: 15 };
  assert.equal(next([old, latest]).exercises[0].sets[0].weight, 0);
  assert.equal(next([old, latest]).exercises[0].sets[0].reps, 15);
});

test('new exercise and additional unmatched sets start empty without repeating another set’s numbers', () => {
  const defaults = workoutDefaults('alice', 'plan', 'push', [saved()]);
  assert.equal(freshWorkoutSet('row', 0, defaults).weight, 0);
  assert.equal(freshWorkoutSet('press', 3, defaults).reps, 0);
  assert.equal(next([saved()], 5).exercises[0].sets.length, 5);
});

test('suggested sets can be reduced, but editing or completing them protects their recorded data', () => {
  const workout = next([saved()]);
  assert.equal(minimumWorkoutSets(workout.exercises[0]), 1);
  assert.equal(editWorkoutExercises(workout, workout.id, [{ exerciseId: 'press', sets: 1 }], []).exercises[0].sets.length, 1);
  workout.exercises[0].sets[2].completed = true;
  assert.throws(() => editWorkoutExercises(workout, workout.id, [{ exerciseId: 'press', sets: 1 }], []), /recorded data/);
  workout.exercises[0].sets[2].completed = false;
  workout.exercises[0].sets[2].prefilledFromHistory = false;
  assert.equal(minimumWorkoutSets(workout.exercises[0]), 3);
});

test('adding an exercise or set during a workout prefills history and preserves sets already edited', () => {
  const previous = saved();
  previous.exercises.push({ exerciseId: 'row', sets: [{ id: 'old-row', setNumber: 1, weight: 25, reps: 10, completed: true }] });
  const workout = next([previous], 1);
  workout.exercises[0].sets[0] = { ...workout.exercises[0].sets[0], weight: 80, reps: 5, completed: true, prefilledFromHistory: false };
  const edited = editWorkoutExercises(workout, workout.id, [{ exerciseId: 'row', sets: 1 }, { exerciseId: 'press', sets: 3 }], ['row'], [previous]);
  assert.equal(edited.exercises[0].sets[0].weight, 25);
  assert.equal(edited.exercises[1].sets[0], workout.exercises[0].sets[0]);
  assert.equal(edited.exercises[1].sets[1].weight, 45);
});

test('offline completion survives restart, uploads user-owned values, and prefills the next session before sync', async () => {
  const values = new Map<string, string>();
  const disk = { async getItem(key: string) { return values.get(key) ?? null; }, async setItem(key: string, value: string) { values.set(key, value); } };
  const first = createOfflineStorage(disk);
  await first.mergeRemote('alice', [saved()]);
  const workout = next((await first.read('alice')).history);
  workout.exercises[0].sets[0] = { ...workout.exercises[0].sets[0], weight: 65, reps: 9, completed: true, prefilledFromHistory: false };
  await first.saveDraft(workout);
  const restarted = createOfflineStorage(disk);
  assert.deepEqual((await restarted.read('alice')).draft, workout);
  await restarted.complete('alice', workout, new Date('2026-10-06T13:00:00Z'));
  const account = await restarted.read('alice');
  assert.equal(next(account.history).exercises[0].sets[0].weight, 65);
  assert.equal(next(account.history).exercises[0].sets[0].reps, 9);
  assert.equal(next(account.history).exercises[0].sets[1].weight, 45);
  assert.equal(next((await restarted.read('bob')).history).exercises[0].sets[0].weight, 0);
  const uploaded: WorkoutSession[] = [];
  await drainWorkouts(restarted, 'alice', () => true, async (session) => { uploaded.push(session); });
  assert.equal(uploaded[0].userId, 'alice');
  assert.equal(uploaded[0].exercises[0].sets[0].weight, 65);
  assert.equal(next((await restarted.read('alice')).history).exercises[0].sets[0].weight, 65);
});
