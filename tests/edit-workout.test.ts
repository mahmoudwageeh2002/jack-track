import assert from 'node:assert/strict';
import test from 'node:test';
import { editWorkoutExercises, minimumWorkoutSets, moveWorkoutExercise } from '../src/features/workout/domain/edit-workout';
import type { WorkoutSession } from '../src/features/workout/domain/workout';
import { createOfflineStorage } from '../src/features/offline/domain/offline-storage';
import { workoutActivityProps } from '../src/features/widgets/domain/workout-activity';

function workout(): WorkoutSession {
  return {
    id: 'session', userId: 'alice', planId: 'plan', planDayId: 'day', status: 'in_progress', startedAt: new Date('2026-10-05T12:00:00Z'),
    exercises: ['squat', 'press', 'row'].map((exerciseId) => ({ exerciseId, sets: [0, 1, 2].map((index) => ({
      id: `${exerciseId}-${index}`, setNumber: index + 1, weight: index === 0 ? 50 : 0, reps: index === 0 ? 8 : 0, completed: index === 0,
    })) })),
  };
}
const edits = (session: WorkoutSession) => session.exercises.map((exercise) => ({ exerciseId: exercise.exerciseId, sets: exercise.sets.length }));

test('dragging in either direction changes only the order and preserves every recorded set', () => {
  const session = workout();
  const next = editWorkoutExercises(session, session.id, moveWorkoutExercise(edits(session), 0, 2), []);
  assert.deepEqual(next.exercises.map((exercise) => exercise.exerciseId), ['press', 'row', 'squat']);
  assert.equal(next.exercises[2], session.exercises[0]);
  assert.equal(next.startedAt, session.startedAt);
  assert.deepEqual(session.exercises.map((exercise) => exercise.exerciseId), ['squat', 'press', 'row']);
  const restored = editWorkoutExercises(next, session.id, moveWorkoutExercise(edits(next), 2, 0), []);
  assert.deepEqual(restored, session);
});

test('same-position and invalid drops do not change the list', () => {
  const items = edits(workout());
  for (const [from, to] of [[0, 0], [-1, 1], [0, 3], [0, 0.5], [NaN, 1]]) assert.equal(moveWorkoutExercise(items, from, to), items);
});

test('increasing and decreasing unrecorded sets preserves completed data and stable IDs', () => {
  const session = workout();
  const next = editWorkoutExercises(session, session.id, [{ exerciseId: 'squat', sets: 5 }, { exerciseId: 'press', sets: 1 }, { exerciseId: 'row', sets: 3 }], []);
  assert.equal(next.exercises[0].sets[0], session.exercises[0].sets[0]);
  assert.equal(next.exercises[1].sets[0], session.exercises[1].sets[0]);
  assert.equal(next.exercises[0].sets.length, 5);
  assert.deepEqual(next.exercises[0].sets[4], { id: 'squat-4', setNumber: 5, reps: 0, weight: 0, completed: false });
});

test('reducing sets cannot erase completed or entered data, including out-of-order sets', () => {
  const session = workout();
  session.exercises[0].sets[2].weight = 20;
  assert.equal(minimumWorkoutSets(session.exercises[0]), 3);
  assert.throws(() => editWorkoutExercises(session, session.id, [{ exerciseId: 'squat', sets: 2 }], []), /recorded data/);
});

test('adding an exercise uses the downloaded catalog and starts with empty sets', () => {
  const session = workout();
  const next = editWorkoutExercises(session, session.id, [...edits(session), { exerciseId: 'curl', sets: 2 }], ['curl']);
  assert.equal(next.exercises[3].exerciseId, 'curl');
  assert.equal(next.exercises[3].sets.length, 2);
  assert.ok(next.exercises[3].sets.every((set) => !set.completed && set.weight === 0 && set.reps === 0));
});

test('removing an exercise leaves the remaining data intact', () => {
  const session = workout();
  const next = editWorkoutExercises(session, session.id, edits(session).slice(1), []);
  assert.equal(next.exercises[0], session.exercises[1]);
  assert.equal(next.exercises[1], session.exercises[2]);
});

test('rejects duplicates, unavailable exercises, invalid counts, and empty workouts', () => {
  const session = workout();
  assert.throws(() => editWorkoutExercises(session, session.id, [], []), /at least one/);
  assert.throws(() => editWorkoutExercises(session, session.id, [edits(session)[0], edits(session)[0]], []), /only appear once/);
  assert.throws(() => editWorkoutExercises(session, session.id, [{ exerciseId: 'unknown', sets: 3 }], []), /downloaded library/);
  for (const sets of [0, -1, 1.5, 21, NaN, Infinity]) assert.throws(() => editWorkoutExercises(session, session.id, [{ exerciseId: 'squat', sets }], []));
});

test('an editor opened for an old session cannot overwrite another or a finished workout', () => {
  const session = workout();
  assert.throws(() => editWorkoutExercises(session, 'old-session', edits(session), []), /no longer active/);
  assert.throws(() => editWorkoutExercises(null, session.id, edits(session), []), /no longer active/);
  assert.throws(() => editWorkoutExercises({ ...session, status: 'completed' }, session.id, edits(session), []), /no longer active/);
});

test('saved order survives offline restart and is retained when the workout is completed', async () => {
  const values = new Map<string, string>();
  const disk = { async getItem(key: string) { return values.get(key) ?? null; }, async setItem(key: string, value: string) { values.set(key, value); } };
  const session = workout();
  const next = editWorkoutExercises(session, session.id, moveWorkoutExercise(edits(session), 2, 0), []);
  await createOfflineStorage(disk).saveDraft(next);
  const restarted = createOfflineStorage(disk);
  const restored = (await restarted.read('alice')).draft!;
  assert.deepEqual(restored, next);
  await restarted.complete('alice', restored);
  assert.deepEqual((await restarted.read('alice')).pending[0].exercises, next.exercises);
});

test('Dynamic Island follows the reordered current and next exercises', () => {
  const session = workout();
  const next = editWorkoutExercises(session, session.id, moveWorkoutExercise(edits(session), 2, 0), []);
  const view = workoutActivityProps(next, 'alice', [{ id: 'row', name: 'Cable Row' }, { id: 'squat', name: 'Squat' }, { id: 'press', name: 'Bench Press' }]);
  assert.equal(view?.currentExercise, 'Cable Row');
  assert.equal(view?.nextExercise, 'Squat');
  assert.equal(view?.completedSets, 3);
});
