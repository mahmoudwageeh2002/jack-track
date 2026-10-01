import { useQuery } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { useAppSelector } from '@/core/store';
import { confirmed, requireDatabase } from '@/core/utils/firestore-request';
import type { WorkoutSession } from '../domain/workout';

export function useWorkoutHistory() {
  const uid = useAppSelector((state) => state.auth.user?.uid);
  return useQuery({
    queryKey: ['sessions', uid], enabled: !!uid,
    queryFn: async () => {
      const snapshot = await confirmed(getDocs(collection(requireDatabase(), 'users', uid!, 'workoutSessions')));
      return snapshot.docs.map((item): WorkoutSession => {
        const data = item.data();
        return { ...data, id: item.id, startedAt: data.startedAt?.toDate?.() ?? new Date(0), completedAt: data.completedAt?.toDate?.() } as WorkoutSession;
      }).filter((session) => session.status === 'completed');
    },
  });
}

export function useProfile() {
  const uid = useAppSelector((state) => state.auth.user?.uid);
  return useQuery({
    queryKey: ['profile', uid], enabled: !!uid,
    queryFn: async () => {
      const snapshot = await confirmed(getDoc(doc(requireDatabase(), 'users', uid!)));
      const data = snapshot.data();
      return { displayName: typeof data?.displayName === 'string' ? data.displayName : null };
    },
  });
}
