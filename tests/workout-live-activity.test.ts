import assert from 'node:assert/strict';
import test from 'node:test';
import { workoutActivityProps, type WorkoutActivityProps } from '../src/features/widgets/domain/workout-activity';
import { createWorkoutActivitySync, type ActivityRecord } from '../src/features/widgets/domain/workout-activity-sync';
import type { WorkoutSession } from '../src/features/workout/domain/workout';

const catalog = [{ id: 'squat', name: 'Squat' }, { id: 'press', name: 'Bench Press' }, { id: 'row', name: 'Cable Row' }];
function workout(): WorkoutSession {
  return {
    id: 'session', userId: 'alice', planId: 'plan', planDayId: 'day', status: 'in_progress', startedAt: new Date('2026-10-04T12:00:00Z'),
    exercises: catalog.map(({ id }) => ({ exerciseId: id, sets: [1, 2].map((n) => ({ id: `${id}-${n}`, setNumber: n, weight: 0, reps: 0, completed: false })) })),
  };
}
const props = () => workoutActivityProps(workout(), 'alice', catalog, 'Full body')!;

test('shows the first unfinished exercise, the next one, and set progress', () => {
  const session = workout();
  let view = workoutActivityProps(session, 'alice', catalog)!;
  assert.equal(view.currentExercise, 'Squat');
  assert.equal(view.nextExercise, 'Bench Press');
  assert.equal(view.currentSet, 1);
  session.exercises[0].sets[0].completed = true;
  view = workoutActivityProps(session, 'alice', catalog)!;
  assert.equal(view.currentSet, 2);
  assert.equal(view.completedSets, 1);
  session.exercises[0].sets[1].completed = true;
  view = workoutActivityProps(session, 'alice', catalog)!;
  assert.equal(view.currentExercise, 'Bench Press');
  assert.equal(view.nextExercise, 'Cable Row');
  assert.equal(view.totalSets, 6);
  assert.equal(view.startedAt, session.startedAt.getTime());
});

test('skips exercises completed out of order and moves back when a set is unchecked', () => {
  const session = workout();
  session.exercises[1].sets.forEach((set) => { set.completed = true; });
  assert.equal(workoutActivityProps(session, 'alice', catalog)?.nextExercise, 'Cable Row');
  session.exercises[0].sets.forEach((set) => { set.completed = true; });
  assert.equal(workoutActivityProps(session, 'alice', catalog)?.currentExercise, 'Cable Row');
  session.exercises[0].sets[0].completed = false;
  assert.equal(workoutActivityProps(session, 'alice', catalog)?.currentExercise, 'Squat');
});

test('all completed sets stay visible until the workout is actually saved', () => {
  const session = workout();
  session.exercises.forEach((exercise) => exercise.sets.forEach((set) => { set.completed = true; }));
  const view = workoutActivityProps(session, 'alice', catalog)!;
  assert.equal(view.allSetsComplete, true);
  assert.equal(view.currentExercise, 'All sets complete');
  assert.equal(view.completedSets, view.totalSets);
  session.status = 'completed';
  assert.equal(workoutActivityProps(session, 'alice', catalog), null);
});

test('ignores other accounts and empty sessions; missing catalog names have a safe fallback', () => {
  const session = workout();
  assert.equal(workoutActivityProps(session, 'bob', catalog), null);
  assert.equal(workoutActivityProps(session, null, catalog), null);
  assert.equal(workoutActivityProps(session, 'alice', [])?.currentExercise, 'Exercise');
  session.exercises = [];
  assert.equal(workoutActivityProps(session, 'alice', catalog), null);
});

function nativeHarness(initial: ActivityRecord | null = null) {
  let stored = initial;
  const active = new Map<string, ReturnType<typeof instance>>();
  const starts: WorkoutActivityProps[] = [];
  const updates: WorkoutActivityProps[] = [];
  const ends: string[] = [];
  const errors: unknown[] = [];
  function instance(id: string) {
    return {
      getId: () => id,
      async update(value: WorkoutActivityProps) { updates.push(value); },
      async end() { ends.push(id); active.delete(id); },
    };
  }
  if (initial) active.set(initial.activityId, instance(initial.activityId));
  const dependencies = {
    factory: {
      getInstances: () => [...active.values()],
      start(value: WorkoutActivityProps, url: string) {
        assert.equal(url, 'jacktrack:///workout');
        starts.push(value);
        const activity = instance(`native-${starts.length}`);
        active.set(activity.getId(), activity);
        return activity;
      },
    },
    async read() { return stored; },
    async write(record: ActivityRecord | null) { stored = record; },
    onError(error: unknown) { errors.push(error); },
  };
  return { dependencies, active, starts, updates, ends, errors, stored: () => stored };
}

test('starts once, updates on progress, and ends on workout completion', async () => {
  const native = nativeHarness();
  const sync = createWorkoutActivitySync(native.dependencies);
  const input = { ownerId: 'alice', props: props(), foreground: true };
  await sync(input);
  await sync(input);
  assert.equal(native.starts.length, 1);
  assert.equal(native.updates.length, 0);
  await sync({ ...input, props: { ...input.props, completedSets: 1, currentSet: 2 } });
  assert.equal(native.updates.length, 1);
  await sync({ ...input, props: null });
  assert.equal(native.active.size, 0);
  assert.equal(native.stored(), null);
});

test('restores the existing native activity after process restart without duplicates', async () => {
  const record = { ownerId: 'alice', sessionId: 'session', activityId: 'restored' };
  const native = nativeHarness(record);
  const sync = createWorkoutActivitySync(native.dependencies);
  await sync({ ownerId: 'alice', props: undefined, foreground: true });
  assert.equal(native.active.size, 1);
  await sync({ ownerId: 'alice', props: props(), foreground: true });
  assert.equal(native.starts.length, 0);
  assert.equal(native.updates.length, 1);
});

test('sign-out and switching accounts while hydrating remove the previous activity', async () => {
  for (const ownerId of [null, 'bob']) {
    const native = nativeHarness({ ownerId: 'alice', sessionId: 'session', activityId: 'old' });
    await createWorkoutActivitySync(native.dependencies)({ ownerId, props: undefined, foreground: true });
    assert.deepEqual(native.ends, ['old']);
    assert.equal(native.stored(), null);
  }
});

test('dismissed activities stay dismissed for that session, but a new workout can start', async () => {
  const native = nativeHarness({ ownerId: 'alice', sessionId: 'session', activityId: 'dismissed' });
  native.active.clear();
  const sync = createWorkoutActivitySync(native.dependencies);
  await sync({ ownerId: 'alice', props: props(), foreground: true });
  assert.equal(native.starts.length, 0);
  await sync({ ownerId: 'alice', props: { ...props(), sessionId: 'next' }, foreground: true });
  assert.equal(native.starts.length, 1);
});

test('does not start in background and can start immediately on returning to the app', async () => {
  const native = nativeHarness();
  const sync = createWorkoutActivitySync(native.dependencies);
  await sync({ ownerId: 'alice', props: props(), foreground: false });
  assert.equal(native.starts.length, 0);
  await sync({ ownerId: 'alice', props: props(), foreground: true });
  assert.equal(native.starts.length, 1);
});

test('sign-out during async restoration cannot start a stale account activity', async () => {
  const native = nativeHarness();
  let finishRead!: (record: ActivityRecord | null) => void;
  const sync = createWorkoutActivitySync({ ...native.dependencies, read: () => new Promise((resolve) => { finishRead = resolve; }) });
  const first = sync({ ownerId: 'alice', props: props(), foreground: true });
  await Promise.resolve();
  const signedOut = sync({ ownerId: null, props: null, foreground: true });
  finishRead(null);
  await Promise.all([first, signedOut]);
  assert.equal(native.starts.length, 0);
});

test('disabled Live Activities cannot reject workout updates or poison later retries', async () => {
  const native = nativeHarness();
  const start = native.dependencies.factory.start;
  native.dependencies.factory.start = () => { throw new Error('Activities disabled'); };
  const sync = createWorkoutActivitySync(native.dependencies);
  await sync({ ownerId: 'alice', props: props(), foreground: true });
  assert.equal(native.errors.length, 1);
  native.dependencies.factory.start = start;
  await sync({ ownerId: 'alice', props: props(), foreground: true });
  assert.equal(native.starts.length, 1);
});

test('an activity is removed if its identity cannot be saved for safe restoration', async () => {
  const native = nativeHarness();
  const sync = createWorkoutActivitySync({ ...native.dependencies, async write() { throw new Error('Disk full'); } });
  await sync({ ownerId: 'alice', props: props(), foreground: true });
  assert.equal(native.active.size, 0);
  assert.equal(native.errors.length, 1);
});
