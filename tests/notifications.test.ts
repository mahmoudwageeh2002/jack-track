import assert from 'node:assert/strict';
import test from 'node:test';
import type { UserPlan } from '../src/features/plans/domain/plan';
import type { WorkoutSession } from '../src/features/workout/domain/workout';
import { defaultNotificationPreferences, inQuietHours, localReminders, minuteOfDay, notificationDestination, validateNotificationPreferences } from '../src/features/notifications/domain/notifications';

const now = new Date('2026-10-05T12:00:00'); // Monday
const plan: UserPlan = {
  id: 'plan', ownerId: 'alice', sourcePlanId: null, isCustom: true, name: 'Training', description: '',
  goal: 'strength', level: 'beginner', isOfficial: false, createdAt: now,
  days: [0, 2, 4].map((weekday) => ({ id: `day-${weekday}`, name: 'Training', weekday, order: weekday, exercises: [] })),
};
const prefs = { ...defaultNotificationPreferences, workouts: true, streaks: true };
const session = (day: string, overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: day, userId: 'alice', planId: 'plan', planDayId: 'day-0', status: 'completed',
  startedAt: new Date(`${day}T10:00:00`), completedAt: new Date(`${day}T11:00:00`), completedDay: day, exercises: [], ...overrides,
});

test('notifications are opt-in and workouts only cover training days in the coming week', () => {
  assert.deepEqual(localReminders('alice', plan, [], defaultNotificationPreferences, now), []);
  const reminders = localReminders('alice', plan, [], prefs, now);
  assert.deepEqual(reminders.map((reminder) => reminder.date.getDay()), [1, 3, 5]);
  assert.ok(reminders.every((reminder) => reminder.date.getHours() === 20));
});

test('no plan and another account’s plan cannot generate workout reminders', () => {
  assert.deepEqual(localReminders('bob', plan, [], prefs, now), []);
  assert.deepEqual(localReminders('alice', null, [], prefs, now), []);
});

test('offline completion cancels today’s reminders and moves the streak deadline to tomorrow', () => {
  const before = localReminders('alice', plan, [session('2026-10-04')], prefs, now);
  assert.equal(before.filter((item) => item.date.getDate() === 5).length, 2);
  const after = localReminders('alice', plan, [session('2026-10-04'), session('2026-10-05')], prefs, now);
  assert.equal(after.filter((item) => item.date.getDate() === 5).length, 0);
  const streak = after.filter((item) => item.kind === 'streak');
  assert.equal(streak.length, 1);
  assert.equal(streak[0].date.getDate(), 6);
  assert.match(streak[0].body, /2-day streak/);
});

test('completed workouts from other accounts and unfinished workouts do not suppress reminders', () => {
  const reminders = localReminders('alice', plan, [session('2026-10-05', { userId: 'bob' }), session('2026-10-05', { status: 'in_progress' })], prefs, now);
  assert.equal(reminders.filter((item) => item.date.getDate() === 5).length, 1);
  assert.equal(reminders.filter((item) => item.kind === 'streak').length, 0);
});

test('broken streaks never create a future streak reminder', () => {
  assert.equal(localReminders('alice', plan, [session('2026-10-03')], prefs, now).filter((item) => item.kind === 'streak').length, 0);
});

test('matching reminder times merge and past times never schedule immediately', () => {
  const reminders = localReminders('alice', plan, [session('2026-10-04')], { ...prefs, streakTime: '20:00' }, now);
  assert.equal(reminders.filter((item) => item.date.getDate() === 5).length, 1);
  assert.equal(reminders[reminders.length - 1].kind, 'streak');
  assert.ok(localReminders('alice', plan, [], prefs, new Date('2026-10-05T21:00:00')).every((item) => item.date.getDate() > 5));
});

test('quiet hours support overnight windows and reject conflicting enabled schedules', () => {
  assert.equal(inQuietHours(60, 23 * 60, 8 * 60), true);
  assert.equal(inQuietHours(8 * 60, 23 * 60, 8 * 60), false);
  assert.equal(inQuietHours(60, 60, 60), false);
  assert.throws(() => validateNotificationPreferences({ ...prefs, workoutTime: '23:00' }));
  for (const value of ['24:00', '9:00', '12:60', '09:30:00']) assert.throws(() => minuteOfDay(value));
  assert.equal(minuteOfDay('09:30'), 570);
});

test('taps only route known kinds belonging to the signed-in account', () => {
  assert.equal(notificationDestination({ kind: 'workout', uid: 'alice' }, 'alice'), '/workout');
  assert.equal(notificationDestination({ kind: 'quote', uid: 'alice' }, 'alice'), '/(tabs)');
  assert.equal(notificationDestination({ kind: 'streak', uid: 'alice' }, 'alice'), '/(tabs)/profile');
  assert.equal(notificationDestination({ kind: 'workout', uid: 'alice' }, 'bob'), null);
  assert.equal(notificationDestination({ kind: 'workout', uid: 'alice' }, null), null);
  assert.equal(notificationDestination({ kind: 'https://example.com', uid: 'alice' }, 'alice'), null);
});

test('local reminder times follow the local clock across daylight-saving changes', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const daily = { ...plan, days: [{ ...plan.days[0], weekday: undefined }] };
    const reminders = localReminders('alice', daily, [], prefs, new Date('2026-03-07T12:00:00'));
    assert.equal(reminders.length, 7);
    assert.ok(reminders.every((item) => item.date.getHours() === 20));
    assert.equal(reminders[1].date.getTime() - reminders[0].date.getTime(), 23 * 3600_000);
    const early = localReminders('alice', daily, [], { ...prefs, workoutTime: '02:30', quietStart: '03:00', quietEnd: '08:00' }, new Date('2026-03-08T00:00:00'));
    assert.ok(early.every((item) => item.date.getDate() !== 8));
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
