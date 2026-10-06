import { clockFormatter, localClock, quietAt } from './quotes.mjs';

export function canDeliver(job, device, now) {
  if (!device?.enabled || device.uid !== job.uid || device.secretHash !== job.secretHash || job.deadline.toMillis() <= now.getTime()) return false;
  const clock = localClock(now, clockFormatter(device.timeZone));
  return !quietAt(clock.minute, device.quietStart, device.quietEnd);
}

export function failedRequestStatus(httpStatus, attempts) {
  // A timeout might happen after Expo accepted the notification. Retrying that
  // uncertain outcome could show a duplicate; retry only explicit rejections.
  if ((httpStatus === 429 || httpStatus >= 500) && attempts < 3) return 'queued';
  return httpStatus ? 'failed' : 'uncertain';
}
