import { createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { clockFormatter, eligibleQuote, localClock, nextQuoteDate, pickQuote, quietAt, quoteBody, validMinute } from './quotes.mjs';
import { canDeliver, failedRequestStatus } from './delivery-policy.mjs';

initializeApp();
const db = getFirestore();
const devices = db.collection('notificationQuoteDevices');
const deliveries = db.collection('notificationQuoteDeliveries');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const callableOptions = { region: 'us-central1', maxInstances: 5, timeoutSeconds: 30 };
function registrationInput(data) {
  if (!data || typeof data.token !== 'string' || !/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(data.token) || data.token.length > 200 ||
      typeof data.secret !== 'string' || !/^[a-f0-9-]{72}$/i.test(data.secret)) throw new HttpsError('invalid-argument', 'Invalid device registration.');
  return data;
}
export const registerNotificationDevice = onCall(callableOptions, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to enable daily quotes.');
  const data = registrationInput(request.data);
  if (![data.quoteMinute, data.quietStart, data.quietEnd].every(validMinute) || typeof data.timeZone !== 'string' || data.timeZone.length > 100 || quietAt(data.quoteMinute, data.quietStart, data.quietEnd)) throw new HttpsError('invalid-argument', 'Invalid notification time.');
  try { clockFormatter(data.timeZone); } catch { throw new HttpsError('invalid-argument', 'Invalid time zone.'); }
  const now = new Date();
  const ref = devices.doc(hash(data.token));
  await db.runTransaction(async (transaction) => {
    const previous = (await transaction.get(ref)).data();
    const sameOwner = previous?.uid === request.auth.uid;
    const sameTime = sameOwner && previous.quoteMinute === data.quoteMinute && previous.timeZone === data.timeZone && previous.enabled;
    transaction.set(ref, {
      uid: request.auth.uid, token: data.token, secretHash: hash(data.secret), enabled: true,
      quoteMinute: data.quoteMinute, quietStart: data.quietStart, quietEnd: data.quietEnd, timeZone: data.timeZone,
      nextQuoteAt: sameTime ? previous.nextQuoteAt : Timestamp.fromDate(nextQuoteDate(now, data.quoteMinute, data.timeZone)),
      recentQuoteIds: sameOwner ? previous.recentQuoteIds ?? [] : [],
      lastQuoteDay: sameOwner ? previous.lastQuoteDay ?? null : null,
      updatedAt: Timestamp.fromDate(now),
    });
  });
  return { registered: true };
});

export const revokeNotificationDevice = onCall(callableOptions, async (request) => {
  const data = registrationInput(request.data);
  // Possession of the installation secret authorizes revocation after offline logout.
  // Revocation cannot read personal data or subscribe a device to notifications.
  const ref = devices.doc(hash(data.token));
  await db.runTransaction(async (transaction) => {
    const device = (await transaction.get(ref)).data();
    if (device?.secretHash === hash(data.secret)) transaction.update(ref, { enabled: false, uid: null, updatedAt: Timestamp.now() });
  });
  return { revoked: true };
});

async function expoRequest(path, body) {
  const response = await fetch(`https://exp.host/--/api/v2/push/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const error = new Error('Expo request failed');
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function disableDevice(job) {
  const ref = devices.doc(job.deviceId);
  await db.runTransaction(async (transaction) => {
    const device = (await transaction.get(ref)).data();
    if (device?.uid === job.uid && device.secretHash === job.secretHash) transaction.update(ref, { enabled: false });
  });
}

async function enqueueQuotes(now) {
  const due = await devices.where('enabled', '==', true).where('nextQuoteAt', '<=', Timestamp.fromDate(now)).orderBy('nextQuoteAt').limit(200).get();
  if (due.empty) return;
  const snapshot = await db.collection('quotes').where('active', '==', true).get();
  const quotes = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })).filter(eligibleQuote);
  if (!quotes.length) { logger.warn('No active, valid quotes are available. Seed the quotes collection.'); return; }
  for (const candidate of due.docs) {
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(candidate.ref);
      const device = current.data();
      if (!device?.enabled || device.nextQuoteAt.toMillis() > now.getTime()) return;
      const clock = localClock(now, clockFormatter(device.timeZone));
      const jobRef = deliveries.doc(`${candidate.id}_${clock.day}`);
      const existing = await transaction.get(jobRef);
      transaction.update(candidate.ref, { nextQuoteAt: Timestamp.fromDate(nextQuoteDate(now, device.quoteMinute, device.timeZone)) });
      // Skip reminders delayed over 30 minutes rather than delivering them at night.
      if (existing.exists || device.lastQuoteDay === clock.day || now.getTime() - device.nextQuoteAt.toMillis() > 30 * 60_000 || quietAt(clock.minute, device.quietStart, device.quietEnd)) return;
      const quote = pickQuote(quotes, device.recentQuoteIds);
      transaction.create(jobRef, {
        deviceId: candidate.id, uid: device.uid, secretHash: device.secretHash,
        quoteId: quote.id, body: quoteBody(quote), status: 'queued', attempts: 0,
        readyAt: Timestamp.fromDate(now), deadline: Timestamp.fromMillis(now.getTime() + 30 * 60_000),
        createdAt: Timestamp.fromDate(now), expiresAt: Timestamp.fromMillis(now.getTime() + 30 * 86400_000),
      });
      transaction.update(candidate.ref, { lastQuoteDay: clock.day, recentQuoteIds: [...(device.recentQuoteIds ?? []), quote.id].slice(-7) });
    });
  }
}

async function sendQueuedQuotes(now, stopAt) {
  const queued = await deliveries.where('status', '==', 'queued').where('readyAt', '<=', Timestamp.fromDate(now)).orderBy('readyAt').limit(100).get();
  for (const candidate of queued.docs) {
    // Leave unclaimed jobs queued if this invocation is near its time budget.
    if (Date.now() >= stopAt) break;
    now = new Date();
    const claimed = await db.runTransaction(async (transaction) => {
      const job = (await transaction.get(candidate.ref)).data();
      if (job?.status !== 'queued') return null;
      const device = (await transaction.get(devices.doc(job.deviceId))).data();
      if (!canDeliver(job, device, now)) {
        transaction.update(candidate.ref, { status: 'cancelled' }); return null;
      }
      transaction.update(candidate.ref, { status: 'sending', attempts: job.attempts + 1 });
      return { ...job, token: device.token, attempts: job.attempts + 1 };
    });
    if (!claimed) continue;
    try {
      const response = await expoRequest('send', {
        to: claimed.token, title: 'Your daily motivation', body: claimed.body, sound: 'default', channelId: 'quotes',
        expiration: Math.floor(claimed.deadline.toMillis() / 1000),
        data: { kind: 'quote', uid: claimed.uid, quoteId: claimed.quoteId, deliveryId: candidate.id },
      });
      const ticket = Array.isArray(response.data) ? response.data[0] : response.data;
      if (ticket?.status === 'ok' && typeof ticket.id === 'string') {
        await candidate.ref.update({ status: 'accepted', receiptId: ticket.id, receiptDue: Timestamp.fromMillis(now.getTime() + 15 * 60_000) });
      } else if (ticket?.details?.error === 'MessageRateExceeded' && claimed.attempts < 3) {
        await candidate.ref.update({ status: 'queued', readyAt: Timestamp.fromMillis(now.getTime() + claimed.attempts * 5 * 60_000) });
      } else {
        if (ticket?.details?.error === 'DeviceNotRegistered') await disableDevice(claimed);
        await candidate.ref.update({ status: 'failed', error: ticket?.details?.error ?? 'InvalidTicket' });
      }
    } catch (error) {
      // Retry only explicit temporary HTTP rejection. A lost response may have
      // followed acceptance; do not blindly send a second visible notification.
      const status = failedRequestStatus(error.status, claimed.attempts);
      await candidate.ref.update({ status, readyAt: Timestamp.fromMillis(now.getTime() + claimed.attempts * 5 * 60_000) });
      logger.warn('Quote delivery attempt failed', { deliveryId: candidate.id, status });
    }
  }
}

async function checkReceipts(now) {
  const accepted = await deliveries.where('status', '==', 'accepted').where('receiptDue', '<=', Timestamp.fromDate(now)).orderBy('receiptDue').limit(100).get();
  if (accepted.empty) return;
  const response = await expoRequest('getReceipts', { ids: accepted.docs.map((doc) => doc.data().receiptId) });
  for (const document of accepted.docs) {
    const job = document.data();
    const receipt = response.data?.[job.receiptId];
    if (!receipt) {
      await document.ref.update({ status: now.getTime() - job.createdAt.toMillis() > 24 * 3600_000 ? 'receiptExpired' : 'accepted', receiptDue: Timestamp.fromMillis(now.getTime() + 15 * 60_000) });
    } else {
      if (receipt.details?.error === 'DeviceNotRegistered') await disableDevice(job);
      // "delivered" here means accepted by APNs/FCM, not read by the person.
      await document.ref.update({ status: receipt.status === 'ok' ? 'providerAccepted' : 'failed', error: receipt.details?.error ?? null });
    }
  }
}

export const sendDailyQuotes = onSchedule({ schedule: 'every 5 minutes', timeZone: 'UTC', region: 'us-central1', maxInstances: 1, concurrency: 1, timeoutSeconds: 540, retryCount: 0 }, async () => {
  const now = new Date();
  await enqueueQuotes(now);
  await sendQueuedQuotes(new Date(), now.getTime() + 450_000);
  await checkReceipts(new Date());
  const expired = await deliveries.where('expiresAt', '<=', Timestamp.now()).limit(300).get();
  if (!expired.empty) {
    const batch = db.batch();
    expired.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
});
