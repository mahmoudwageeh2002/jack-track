import type { WorkoutSession } from '../../workout/domain/workout';
import type { createOfflineStorage } from './offline-storage';

export async function drainWorkouts(
  storage: ReturnType<typeof createOfflineStorage>, uid: string, canSync: () => boolean,
  upload: (session: WorkoutSession, confirmedHistory: WorkoutSession[]) => Promise<unknown>,
) {
  let uploaded = 0;
  while (canSync()) {
    const account = await storage.read(uid);
    const next = account.pending[0];
    if (!next || !canSync()) break;
    const pendingIds = new Set(account.pending.map((session) => session.id));
    await upload(next, account.history.filter((session) => !pendingIds.has(session.id)));
    await storage.acknowledge(uid, next.id);
    uploaded++;
  }
  return uploaded;
}
