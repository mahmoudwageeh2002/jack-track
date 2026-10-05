import { format } from 'date-fns';
import type { WorkoutSession } from '../../workout/domain/workout';

type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown> };
export type OfflineAccount = {
  version: 1;
  resources: Record<string, unknown>;
  history: WorkoutSession[];
  pending: WorkoutSession[];
  draft: WorkoutSession | null;
};

export function mergeSessions(...lists: WorkoutSession[][]) {
  return [...new Map(lists.flat().map((session) => [session.id, session])).values()];
}

function encode(value: unknown): unknown {
  if (value instanceof Date) return { __jackTrackDate: value.toISOString() };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)]));
  return value;
}

export function createOfflineStorage(storage: Storage) {
  const locks = new Map<string, Promise<unknown>>();
  const listeners = new Set<(uid: string, account: OfflineAccount) => void>();
  const key = (uid: string) => `jack-track:offline:v1:${uid}`;

  async function read(uid: string): Promise<OfflineAccount> {
    const raw = await storage.getItem(key(uid));
    if (!raw) return { version: 1, resources: {}, history: [], pending: [], draft: null };
    const account = JSON.parse(raw, (_, item) => item && typeof item === 'object' && typeof item.__jackTrackDate === 'string' ? new Date(item.__jackTrackDate) : item) as OfflineAccount;
    if (account.version !== 1 || !account.resources || !Array.isArray(account.history) || !Array.isArray(account.pending)) {
      throw new Error('Could not read saved workouts on this device. Your saved data has not been replaced.');
    }
    return account;
  }

  function update(uid: string, change: (account: OfflineAccount) => void): Promise<OfflineAccount> {
    // Serialize read-modify-write operations per account, including draft edits
    // racing a completed workout or an upload acknowledgement.
    const task = (locks.get(uid) ?? Promise.resolve()).catch(() => {}).then(async () => {
      const account = await read(uid);
      change(account);
      await storage.setItem(key(uid), JSON.stringify(encode(account)));
      listeners.forEach((listener) => listener(uid, account));
      return account;
    });
    locks.set(uid, task);
    return task;
  }

  return {
    async read(uid: string) { await locks.get(uid)?.catch(() => {}); return read(uid); },
    subscribe(listener: (uid: string, account: OfflineAccount) => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    cache<T>(uid: string, resource: string, value: T) {
      return update(uid, (account) => { account.resources[resource] = value; });
    },
    saveDraft(session: WorkoutSession) {
      return update(session.userId, (account) => {
        if (!account.history.some((item) => item.id === session.id)) account.draft = session;
      });
    },
    complete(uid: string, session: WorkoutSession, now = new Date()) {
      if (uid !== session.userId) return Promise.reject(new Error('This workout belongs to another account.'));
      return update(uid, (account) => {
        if (!session.exercises.some((exercise) => exercise.sets.some((set) => set.completed))) throw new Error('Complete at least one set before saving.');
        const existing = account.history.find((item) => item.id === session.id);
        if (!existing) {
          const completion: WorkoutSession = { ...session, status: 'completed', completedAt: now, completedDay: format(now, 'yyyy-MM-dd') };
          account.history = mergeSessions(account.history, [completion]);
          account.pending = mergeSessions(account.pending, [completion]);
        }
        if (account.draft?.id === session.id) account.draft = null;
      });
    },
    mergeRemote(uid: string, sessions: WorkoutSession[]) {
      return update(uid, (account) => {
        account.history = mergeSessions(account.history, sessions.filter((session) => session.userId === uid), account.pending);
        account.resources['history-downloaded'] = true;
      });
    },
    acknowledge(uid: string, id: string) {
      return update(uid, (account) => { account.pending = account.pending.filter((session) => session.id !== id); });
    },
  };
}
