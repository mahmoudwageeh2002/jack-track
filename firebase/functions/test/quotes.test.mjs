import assert from 'node:assert/strict';
import test from 'node:test';
import { clockFormatter, eligibleQuote, localClock, nextQuoteDate, pickQuote, quietAt, quoteBody } from '../src/quotes.mjs';
import { canDeliver, failedRequestStatus } from '../src/delivery-policy.mjs';

test('quotes avoid the recent list and immediate repeats when the library is exhausted', () => {
  const quotes = ['a', 'b', 'c'].map((id) => ({ id, text: id, active: true }));
  assert.equal(pickQuote(quotes, ['a', 'b'], () => 0).id, 'c');
  assert.notEqual(pickQuote(quotes, ['a', 'b', 'c'], () => 0.99).id, 'c');
  assert.equal(pickQuote([quotes[0]], ['a']).id, 'a');
  assert.equal(pickQuote([]), null);
});

test('invalid or inactive quotes are excluded and author is optional', () => {
  for (const quote of [{}, { active: false, text: 'Hello' }, { active: true, text: ' ' }, { active: true, text: 'x'.repeat(501) }]) assert.equal(eligibleQuote(quote), false);
  assert.equal(eligibleQuote({ active: true, text: 'A little progress.' }), true);
  assert.equal(quoteBody({ text: ' Hello ', author: ' Jack Track ' }), 'Hello — Jack Track');
  assert.equal(quoteBody({ text: 'Hello', author: null }), 'Hello');
});

test('quote scheduling respects IANA time zones and starts strictly in the future', () => {
  const next = nextQuoteDate(new Date('2026-10-05T00:00:00Z'), 600, 'Asia/Kolkata');
  assert.equal(next.toISOString(), '2026-10-05T04:30:00.000Z');
  assert.equal(nextQuoteDate(next, 600, 'Asia/Kolkata').toISOString(), '2026-10-06T04:30:00.000Z');
  assert.throws(() => clockFormatter('Invalid/Zone'));
});

test('a skipped DST clock time moves to the next valid day; fall-back keeps calendar day identity', () => {
  assert.equal(nextQuoteDate(new Date('2026-03-08T05:00:00Z'), 150, 'America/New_York').toISOString(), '2026-03-09T06:30:00.000Z');
  const first = nextQuoteDate(new Date('2026-11-01T04:00:00Z'), 90, 'America/New_York');
  const second = nextQuoteDate(first, 90, 'America/New_York');
  const formatter = clockFormatter('America/New_York');
  assert.equal(second.getTime() - first.getTime(), 3600_000);
  // The persisted per-device/day job key suppresses the second occurrence.
  assert.equal(localClock(first, formatter).day, localClock(second, formatter).day);
});

test('quiet-hour boundaries include the start, exclude the end, and allow disabled quiet hours', () => {
  assert.equal(quietAt(23 * 60, 23 * 60, 8 * 60), true);
  assert.equal(quietAt(7 * 60, 23 * 60, 8 * 60), true);
  assert.equal(quietAt(8 * 60, 23 * 60, 8 * 60), false);
  assert.equal(quietAt(600, 600, 600), false);
});

test('queued quotes are cancelled after revocation, account change, secret change, expiry, or quiet hours', () => {
  const now = new Date('2026-10-05T10:00:00Z');
  const job = { uid: 'alice', secretHash: 'secret-a', deadline: { toMillis: () => now.getTime() + 60_000 } };
  const device = { uid: 'alice', secretHash: 'secret-a', enabled: true, timeZone: 'UTC', quietStart: 1380, quietEnd: 480 };
  assert.equal(canDeliver(job, device, now), true);
  for (const changed of [null, { ...device, enabled: false }, { ...device, uid: 'bob' }, { ...device, secretHash: 'secret-b' }, { ...device, quietEnd: 660 }]) assert.equal(canDeliver(job, changed, now), false);
  assert.equal(canDeliver(job, device, new Date(now.getTime() + 60_000)), false);
});

test('only explicit temporary HTTP rejection is retried; lost responses do not duplicate a push', () => {
  assert.equal(failedRequestStatus(429, 1), 'queued');
  assert.equal(failedRequestStatus(503, 2), 'queued');
  assert.equal(failedRequestStatus(503, 3), 'failed');
  assert.equal(failedRequestStatus(400, 1), 'failed');
  assert.equal(failedRequestStatus(undefined, 1), 'uncertain');
});
