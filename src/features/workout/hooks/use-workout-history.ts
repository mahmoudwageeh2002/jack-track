import { useQuery } from '@tanstack/react-query';
import { collection, getDocsFromServer } from 'firebase/firestore';
import { useAppSelector } from '@/core/store';
import { confirmed, requireDatabase } from '@/core/utils/firestore-request';
import type { WorkoutSession } from '../domain/workout';
import { syncWorkoutSummary } from '../data/workout-data';
import { offlineStorage } from '@/features/offline/data/offline-storage';
import { useOfflineState } from '@/features/offline/data/connectivity';
import { syncStreakWidget } from '@/features/widgets/streak-widget-sync';
import { workoutStats } from '../domain/workout-stats';
export { useProfile } from '@/features/profile/data/profile-data';

export function useWorkoutHistory() {
  const uid = useAppSelector((state) => state.auth.user?.uid);
  const ready = useOfflineState((state) => state.ready);
  return useQuery({
    queryKey: ['sessions', uid], enabled: !!uid && ready, networkMode: 'always',
    queryFn: async () => {
      let account = await offlineStorage.read(uid!);
      if (!useOfflineState.getState().online && !account.resources['history-downloaded'] && !account.history.length) {
        throw new Error('Connect once to download your workout history before training offline.');
      }
      if (useOfflineState.getState().online) {
        try {
          const snapshot = await confirmed(getDocsFromServer(collection(requireDatabase(), 'users', uid!, 'workoutSessions')));
          const sessions = snapshot.docs.map((item): WorkoutSession => {
            const data = item.data();
            return { ...data, userId: uid!, id: item.id, startedAt: data.startedAt?.toDate?.() ?? new Date(0), completedAt: data.completedAt?.toDate?.() } as WorkoutSession;
          }).filter((session) => session.status === 'completed');
          account = await offlineStorage.mergeRemote(uid!, sessions);
          // Only confirmed server sessions participate in summary backfills.
          await syncWorkoutSummary(uid!, sessions);
        } catch (error) {
          const code = (error as { code?: string }).code;
          if (code === 'permission-denied' || code === 'unauthenticated') throw error;
          // Local history (including queued workouts) remains usable on network failure.
          account = await offlineStorage.read(uid!);
          if (!account.resources['history-downloaded'] && !account.history.length) throw error;
        }
      }
      account = await offlineStorage.read(uid!);
      syncStreakWidget(uid!, workoutStats(account.history));
      return account.history;
    },
  });
}
