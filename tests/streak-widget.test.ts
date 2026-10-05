import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyStreakWidget, streakWidgetTimeline } from '../src/features/widgets/domain/streak-widget';

test('a completed workout stays active tomorrow and expires the following midnight', () => {
  const timeline = streakWidgetTimeline({ days: ['2026-10-03', '2026-10-04'], best: 5, total: 12 }, new Date('2026-10-04T21:30:00'));
  assert.deepEqual(timeline.slice(0, 3).map(({ props }) => props.current), [2, 2, 0]);
  assert.deepEqual(timeline.slice(0, 3).map(({ props }) => props.completedToday), [true, false, false]);
  assert.ok(timeline.every(({ props }) => props.best === 5 && props.total === 12));
  assert.equal(timeline[1].date.getTime(), new Date('2026-10-05T00:00:00').getTime());
  assert.equal(timeline[2].date.getTime(), new Date('2026-10-06T00:00:00').getTime());
});

test('a streak last completed yesterday expires at the next midnight', () => {
  const timeline = streakWidgetTimeline({ days: ['2026-12-30', '2026-12-31'], best: 2, total: 2 }, new Date('2027-01-01T23:59:00'));
  assert.deepEqual(timeline.slice(0, 3).map(({ props }) => props.current), [2, 0, 0]);
  assert.ok(timeline.every(({ props }) => !props.completedToday));
});

test('multiple workouts on one day do not inflate the streak', () => {
  const [{ props }] = streakWidgetTimeline({ days: ['2026-10-04', '2026-10-04'], best: 0, total: 2 }, new Date('2026-10-04T12:00:00'));
  assert.equal(props.current, 1);
  assert.equal(props.best, 1);
  assert.equal(props.total, 2);
  assert.equal(props.week?.filter((day) => day.completed).length, 1);
});

test('the week runs Monday through Sunday with today and future days distinguished', () => {
  const [{ props }] = streakWidgetTimeline({ days: ['2026-09-28', '2026-09-30'], best: 1, total: 2 }, new Date('2026-09-30T12:00:00'));
  assert.deepEqual(props.week?.map((day) => day.date), ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  assert.deepEqual(props.week?.map((day) => day.completed), [true, false, true, false, false, false, false]);
  assert.deepEqual(props.week?.filter((day) => day.isToday).map((day) => day.date), ['2026-09-30']);
  assert.equal(props.week?.filter((day) => day.isFuture).length, 4);
});

test('the timeline switches to a fresh week on Monday', () => {
  const timeline = streakWidgetTimeline({ days: ['2026-10-03', '2026-10-04'], best: 2, total: 2 }, new Date('2026-10-04T23:59:00'));
  assert.equal(timeline[0].props.week?.[6].isToday, true);
  assert.equal(timeline[1].props.week?.[0].date, '2026-10-05');
  assert.equal(timeline[1].props.week?.[0].isToday, true);
  assert.equal(timeline[1].props.week?.filter((day) => day.completed).length, 0);
  assert.equal(timeline[1].props.current, 2);
});

test('the final timeline entry never leaves an old calendar labeled as this week', () => {
  const timeline = streakWidgetTimeline({ days: ['2026-10-04'], best: 1, total: 1 }, new Date('2026-10-04T12:00:00'));
  assert.equal(timeline[7].props.week?.length, 7);
  assert.deepEqual(timeline.at(-1)?.props.week, []);
  assert.equal(timeline.at(-1)?.props.current, 0);
  assert.equal(timeline.at(-1)?.props.weekLabel, 'Open to refresh week');
});

test('new accounts and expired streaks have no active count', () => {
  for (const days of [[], ['2026-09-01']]) {
    const timeline = streakWidgetTimeline({ days, best: days.length, total: days.length }, new Date('2026-10-04T12:00:00'));
    assert.ok(timeline.every(({ props }) => props.current === 0 && !props.completedToday && props.status === 'ready'));
  }
});

test('clearing or changing accounts removes all personal metrics', () => {
  for (const status of ['signedOut', 'loading'] as const) {
    assert.deepEqual(emptyStreakWidget(status), { current: 0, best: 0, total: 0, completedToday: false, status });
  }
});

test('updates use local calendar midnights across daylight-saving transitions', () => {
  const previousTZ = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const timeline = streakWidgetTimeline({ days: ['2026-03-07'], best: 1, total: 1 }, new Date('2026-03-07T12:00:00'));
    assert.equal(timeline[1].date.getHours(), 0);
    assert.equal(timeline[2].date.getHours(), 0);
    assert.equal(timeline[2].date.getTime() - timeline[1].date.getTime(), 23 * 60 * 60 * 1000);
    assert.deepEqual(timeline.slice(0, 3).map(({ props }) => props.current), [1, 1, 0]);
  } finally {
    if (previousTZ === undefined) delete process.env.TZ;
    else process.env.TZ = previousTZ;
  }
});
