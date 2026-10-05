import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { createConnectivityMonitor } from '../src/features/offline/domain/connectivity-monitor';

function setup(t: TestContext, probe: (signal: AbortSignal) => Promise<boolean>) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const changes: boolean[] = [];
  const monitor = createConnectivityMonitor({ initialOnline: true, probe, onChange: (online) => changes.push(online) });
  t.after(() => monitor.dispose());
  return { monitor, changes };
}

test('recovers automatically even if the native network remains stuck offline', async (t) => {
  let internet = false;
  const { monitor, changes } = setup(t, async () => internet);
  monitor.setActive(true);
  monitor.networkChanged(false);
  assert.equal(await monitor.check(), false);
  internet = true;
  t.mock.timers.tick(3_000);
  await setImmediate();
  assert.equal(changes.at(-1), true);
});

test('network restoration triggers an immediate check without waiting for the retry timer', async (t) => {
  let internet = false;
  const { monitor, changes } = setup(t, async () => internet);
  monitor.setActive(true);
  await monitor.check();
  internet = true;
  monitor.networkChanged(true);
  assert.equal(await monitor.check(), true);
  assert.deepEqual(changes, [false, true]);
});

test('Wi-Fi without internet and a failed request remain offline', async (t) => {
  const { monitor, changes } = setup(t, async () => { throw new Error('No internet'); });
  monitor.setActive(true);
  monitor.networkChanged(true);
  assert.equal(await monitor.check(), false);
  assert.deepEqual(changes, [false]);
});

test('concurrent manual checks wait for the same verified result', async (t) => {
  let finish!: (online: boolean) => void;
  let requests = 0;
  const { monitor, changes } = setup(t, () => {
    requests++;
    return new Promise((resolve) => { finish = resolve; });
  });
  monitor.setActive(true);
  const first = monitor.check();
  const second = monitor.check();
  assert.equal(first, second);
  await setImmediate();
  assert.equal(requests, 1);
  assert.deepEqual(changes, []);
  finish(true);
  assert.equal(await first, true);
  assert.deepEqual(changes, [true]);
});

test('a late success cannot override a newer disconnect', async (t) => {
  let finishOld!: (online: boolean) => void;
  let requests = 0;
  const { monitor, changes } = setup(t, async () => {
    if (++requests === 1) return new Promise((resolve) => { finishOld = resolve; });
    return false;
  });
  monitor.setActive(true);
  const oldCheck = monitor.check();
  await setImmediate();
  monitor.networkChanged(false);
  await monitor.check();
  finishOld(true);
  assert.equal(await oldCheck, false);
  assert.equal(changes.includes(true), false);
});

test('a stalled request times out and cannot prevent later recovery', async (t) => {
  let requests = 0;
  let signal!: AbortSignal;
  const { monitor, changes } = setup(t, async (nextSignal) => {
    signal = nextSignal;
    if (++requests === 1) return new Promise(() => {});
    return true;
  });
  monitor.setActive(true);
  const first = monitor.check();
  await setImmediate();
  t.mock.timers.tick(5_000);
  assert.equal(await first, false);
  assert.equal(signal.aborted, true);
  t.mock.timers.tick(3_000);
  await setImmediate();
  assert.deepEqual(changes, [false, true]);
});

test('checks pause in the background, resume immediately, and stop after disposal', async (t) => {
  let internet = false;
  let requests = 0;
  const { monitor, changes } = setup(t, async () => { requests++; return internet; });
  monitor.setActive(true);
  await monitor.check();
  monitor.setActive(false);
  internet = true;
  monitor.networkChanged(true);
  t.mock.timers.tick(60_000);
  await setImmediate();
  assert.equal(requests, 1);
  monitor.setActive(true);
  assert.equal(await monitor.check(), true);
  monitor.dispose();
  t.mock.timers.tick(60_000);
  await setImmediate();
  assert.equal(requests, 2);
  assert.deepEqual(changes, [false, true]);
});
