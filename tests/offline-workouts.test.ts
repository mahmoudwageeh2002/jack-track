import assert from 'node:assert/strict';
import test from 'node:test';
import { createOfflineStorage } from '../src/features/offline/domain/offline-storage';
import { drainWorkouts } from '../src/features/offline/domain/drain-workouts';
import { offlineEligibility } from '../src/features/offline/domain/offline-eligibility';
import { workoutStats } from '../src/features/workout/domain/workout-stats';
import type { WorkoutSession } from '../src/features/workout/domain/workout';
import type { UserPlan } from '../src/features/plans/domain/plan';
import type { Exercise } from '../src/features/exercises/domain/exercise';

function memoryStorage() {
  const values = new Map<string, string>();
  return { values, async getItem(key: string) { return values.get(key) ?? null; }, async setItem(key: string, value: string) { values.set(key, value); } };
}
function draft(id = 'workout-1', uid = 'alice'): WorkoutSession {
  return { id, userId: uid, planId: 'plan', planDayId: 'day', status: 'in_progress', startedAt: new Date('2026-10-04T20:00:00'), exercises: [{ exerciseId: 'squat', sets: [{ id: 'set-1', setNumber: 1, weight: 50, reps: 10, completed: true }] }] };
}

test('plan, exercise instructions, draft and dates survive a process restart', async () => {
  const disk = memoryStorage();
  const first = createOfflineStorage(disk);
  await first.cache('alice', 'active-plan', { id: 'plan', createdAt: new Date('2026-10-01T12:00:00') });
  await first.cache('alice', 'exercises', [{ id: 'squat', instructions: ['Bend your knees'] }]);
  await first.saveDraft(draft());
  const restored = await createOfflineStorage(disk).read('alice');
  assert.equal(restored.draft?.startedAt.getTime(), draft().startedAt.getTime());
  assert.equal(restored.draft?.exercises[0].sets[0].weight, 50);
  assert.ok((restored.resources['active-plan'] as { createdAt: Date }).createdAt instanceof Date);
  assert.deepEqual(restored.resources.exercises, [{ id: 'squat', instructions: ['Bend your knees'] }]);
});

test('completed workouts persist immediately, clear the draft, and update offline streaks', async () => {
  const disk = memoryStorage();
  const storage = createOfflineStorage(disk);
  await storage.saveDraft(draft());
  await storage.complete('alice', draft(), new Date('2026-10-04T21:00:00'));
  const restored = await createOfflineStorage(disk).read('alice');
  assert.equal(restored.draft, null);
  assert.equal(restored.pending.length, 1);
  assert.equal(restored.history[0].completedDay, '2026-10-04');
  assert.equal(workoutStats(restored.history, new Date('2026-10-05T12:00:00')).current, 1);
});

test('retrying finish on another day retains the original completion and one queued item', async () => {
  const storage = createOfflineStorage(memoryStorage());
  await storage.complete('alice', draft(), new Date('2026-10-04T23:59:00'));
  await storage.complete('alice', draft(), new Date('2026-10-05T00:02:00'));
  const account = await storage.read('alice');
  assert.equal(account.pending.length, 1);
  assert.equal(account.history.length, 1);
  assert.equal(account.pending[0].completedDay, '2026-10-04');
});

test('concurrent cache writes and completions cannot drop queued workouts or resurrect a finished draft', async () => {
  const storage = createOfflineStorage(memoryStorage());
  await Promise.all([storage.cache('alice', 'active-plan', { id: 'plan' }), storage.complete('alice', draft('one')), storage.complete('alice', draft('two')), storage.saveDraft(draft('one'))]);
  const account = await storage.read('alice');
  assert.equal(account.pending.length, 2);
  assert.equal(account.draft, null);
  assert.deepEqual(account.resources['active-plan'], { id: 'plan' });
});

test('accounts cannot read, queue, or upload each other’s workouts', async () => {
  const storage = createOfflineStorage(memoryStorage());
  await storage.complete('alice', draft());
  assert.equal((await storage.read('bob')).history.length, 0);
  await assert.rejects(storage.complete('bob', draft()), /another account/);
  let attempts = 0;
  await drainWorkouts(storage, 'alice', () => false, async () => { attempts++; });
  assert.equal(attempts, 0);
  assert.equal((await storage.read('alice')).pending.length, 1);
});

test('reconnection uploads original IDs and days, then acknowledges only confirmed saves', async () => {
  const storage = createOfflineStorage(memoryStorage());
  await storage.complete('alice', draft('one'), new Date('2026-10-04T20:00:00'));
  await storage.complete('alice', draft('two'), new Date('2026-10-05T20:00:00'));
  const sent: string[] = [];
  const count = await drainWorkouts(storage, 'alice', () => true, async (session, confirmed) => {
    assert.equal(confirmed.length, sent.length);
    sent.push(session.completedDay!);
  });
  assert.equal(count, 2);
  assert.deepEqual(sent, ['2026-10-04', '2026-10-05']);
  assert.equal((await storage.read('alice')).pending.length, 0);
  assert.equal((await storage.read('alice')).history.length, 2);
});

test('an upload that fails after committing stays queued and retries with the same ID', async () => {
  const storage = createOfflineStorage(memoryStorage());
  await storage.complete('alice', draft());
  const server = new Set<string>();
  await assert.rejects(drainWorkouts(storage, 'alice', () => true, async (session) => { server.add(session.id); throw new Error('connection lost'); }));
  assert.equal((await storage.read('alice')).pending.length, 1);
  await drainWorkouts(storage, 'alice', () => true, async (session) => { server.add(session.id); });
  assert.equal(server.size, 1);
  assert.equal((await storage.read('alice')).pending.length, 0);
});

test('signing out during upload stops the remaining queue', async () => {
  const storage = createOfflineStorage(memoryStorage());
  await storage.complete('alice', draft('one'));
  await storage.complete('alice', draft('two'));
  let loggedIn = true;
  await drainWorkouts(storage, 'alice', () => loggedIn, async () => { loggedIn = false; });
  assert.deepEqual((await storage.read('alice')).pending.map((session) => session.id), ['two']);
});

test('merging a server response cannot hide a workout saved while the request was in flight', async () => {
  const storage = createOfflineStorage(memoryStorage());
  await storage.complete('alice', draft());
  await storage.mergeRemote('alice', []);
  assert.equal((await storage.read('alice')).history.length, 1);
  await storage.mergeRemote('alice', (await storage.read('alice')).history);
  assert.equal((await storage.read('alice')).history.length, 1);
});

test('failed disk writes never report a completed workout as saved', async () => {
  const disk = memoryStorage();
  const storage = createOfflineStorage({ ...disk, async setItem() { throw new Error('disk full'); } });
  await assert.rejects(storage.complete('alice', draft()), /disk full/);
  assert.equal((await storage.read('alice')).history.length, 0);
});

test('offline eligibility requires the current account’s plan and its exercise instructions', () => {
  const plan = { ownerId: 'alice', days: [{ exercises: [{ exerciseId: 'squat' }] }] } as UserPlan;
  const exercises = [{ id: 'squat' }] as Exercise[];
  assert.equal(offlineEligibility(undefined, plan, exercises), 'account');
  assert.equal(offlineEligibility('bob', plan, exercises), 'plan');
  assert.equal(offlineEligibility('alice', null, exercises), 'plan');
  assert.equal(offlineEligibility('alice', plan, []), 'download');
  assert.equal(offlineEligibility('alice', plan, exercises), 'ready');
});
