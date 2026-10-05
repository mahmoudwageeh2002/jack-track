import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeMeasurement, parseMeasurements, readMeasurement, sortMeasurements, type BodyMeasurement } from '../src/features/profile/domain/profile';
import { streakStats } from '../src/features/workout/domain/workout-stats';

test('measurements accept decimal keyboards using either separator', () => {
  assert.deepEqual(parseMeasurements(' 72,45 ', '175.5'), { weightKg: 72.45, heightCm: 175.5 });
  assert.deepEqual(parseMeasurements('20', '50'), { weightKg: 20, heightCm: 50 });
  assert.deepEqual(parseMeasurements('500', '300'), { weightKg: 500, heightCm: 300 });
});

test('invalid measurements cannot become persisted progress', () => {
  for (const weight of ['', ' ', 'NaN', 'Infinity', '-10', '0', '19.99', '500.01', '75kg', '7e1', '70.123', '70,1.5']) {
    assert.throws(() => parseMeasurements(weight, '175'), /weight/);
  }
  for (const height of ['', '0', '-175', '49.99', '300.01', '175cm', 'Infinity', '1e2']) {
    assert.throws(() => parseMeasurements('75', height), /height/);
  }
});

test('streak merges duplicate and out-of-order completion days across a year boundary', () => {
  assert.deepEqual(streakStats(['2027-01-01', '2026-12-30', '2026-12-31', '2027-01-01'], new Date('2027-01-02T12:00:00')), {
    days: ['2026-12-30', '2026-12-31', '2027-01-01'], current: 3, best: 3,
  });
});

test('streak lasts through a rest day then expires without changing the best', () => {
  const days = ['2026-09-29', '2026-09-30'];
  assert.equal(streakStats(days, new Date('2026-10-01T23:59:00')).current, 2);
  assert.equal(streakStats(days, new Date('2026-10-02T00:01:00')).current, 0);
  assert.equal(streakStats(days, new Date('2026-10-02T00:01:00')).best, 2);
});

test('streak handles leap days and separated runs', () => {
  const result = streakStats(['2028-02-28', '2028-02-29', '2028-03-01', '2028-03-05'], new Date('2028-03-05T12:00:00'));
  assert.equal(result.best, 3);
  assert.equal(result.current, 1);
});

const checkIn = (id: string, time: string, weightKg = 75): BodyMeasurement => ({
  id, day: '2026-10-04', recordedAt: new Date(`2026-10-04T${time}`), weightKg, heightCm: 175,
});

test('same-day check-ins remain separate and sort by recording time', () => {
  const morning = checkIn('morning', '08:00:00', 75);
  const evening = checkIn('evening', '20:00:00', 76);
  const source = [evening, morning];
  assert.deepEqual(sortMeasurements(source), [morning, evening]);
  assert.deepEqual(source, [evening, morning]);
  assert.deepEqual(mergeMeasurement([morning], evening), [morning, evening]);
});

test('retrying an entry updates the same history item without duplicating it', () => {
  const first = checkIn('first', '08:00:00');
  const second = checkIn('second', '08:00:00');
  const history = mergeMeasurement(mergeMeasurement([first], second), second);
  assert.equal(history.length, 2);
  assert.deepEqual(history.map((entry) => entry.id), ['first', 'second']);
});

test('legacy daily measurements keep their IDs and saved timestamp', () => {
  const recordedAt = new Date('2026-10-04T10:30:00');
  const result = readMeasurement('body-2026-10-04', {
    day: '2026-10-04', weightKg: 75, heightCm: 175, updatedAt: { toDate: () => recordedAt },
  });
  assert.equal(result?.id, 'body-2026-10-04');
  assert.equal(result?.recordedAt.getTime(), recordedAt.getTime());
  const withoutTimestamp = readMeasurement('legacy', { day: '2026-10-04', weightKg: 75, heightCm: 175 });
  assert.equal(withoutTimestamp?.recordedAt.getTime(), new Date('2026-10-04T00:00:00').getTime());
});

test('recording time stays stable when a saved check-in is retried later', () => {
  const recordedAt = new Date('2026-10-04T08:00:00');
  const result = readMeasurement('entry', {
    day: '2026-10-04', weightKg: 75, heightCm: 175,
    recordedAt: { toDate: () => recordedAt }, updatedAt: { toDate: () => new Date('2026-10-04T09:00:00') },
  });
  assert.equal(result?.recordedAt.getTime(), recordedAt.getTime());
});

test('invalid history records cannot break the list or graph', () => {
  const valid = { day: '2026-10-04', weightKg: 75, heightCm: 175 };
  for (const invalid of [{ day: '2026-02-30' }, { day: 'invalid' }, { weightKg: NaN }, { heightCm: Infinity }, { heightCm: '175' }, { weightKg: -1 }]) {
    assert.equal(readMeasurement('bad', { ...valid, ...invalid }), null);
  }
});
