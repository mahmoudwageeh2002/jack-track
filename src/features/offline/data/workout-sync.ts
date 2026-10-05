import { auth } from '@/core/config/firebase';
import { queryClient } from '@/app/query-client';
import { syncWorkoutSummary } from '@/features/workout/data/workout-data';
import { workoutStats } from '@/features/workout/domain/workout-stats';
import type { WorkoutSession } from '@/features/workout/domain/workout';
import { syncStreakWidget } from '@/features/widgets/streak-widget-sync';
import { offlineStorage } from './offline-storage';
import { useOfflineState } from './connectivity';
import { drainWorkouts } from '../domain/drain-workouts';

const running = new Map<string, Promise<void>>();
const owns = (uid: string) => auth?.currentUser?.uid === uid;

export async function saveWorkoutLocally(uid: string, session: WorkoutSession) {
  if (!owns(uid)) throw new Error('Sign in to the account that started this workout.');
  const saved = await offlineStorage.complete(uid, session);
  syncStreakWidget(uid, workoutStats(saved.history));
  return saved.history;
}

export function syncPendingWorkouts(uid: string): Promise<void> {
  if (running.has(uid)) return running.get(uid)!;
  const task = (async () => {
    if (!owns(uid) || !useOfflineState.getState().online) return;
    useOfflineState.setState({ syncing: true, syncError: null });
    let uploaded = false;
    try {
      uploaded = (await drainWorkouts(offlineStorage, uid,
        () => owns(uid) && useOfflineState.getState().online,
        (next, history) => syncWorkoutSummary(uid, history, next))) > 0;
    } catch (error) {
      if (owns(uid)) useOfflineState.setState({ syncError: error instanceof Error ? error.message : 'Workouts are saved on this device. Sync will retry.' });
    } finally {
      if (owns(uid)) {
        useOfflineState.setState({ syncing: false });
        if (uploaded) {
          void queryClient.invalidateQueries({ queryKey: ['sessions', uid] });
          void queryClient.invalidateQueries({ queryKey: ['profile', uid] });
        }
      }
    }
  })();
  running.set(uid, task);
  void task.finally(() => running.delete(uid));
  return task;
}
