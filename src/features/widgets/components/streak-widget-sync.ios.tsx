import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useWorkoutHistory } from '@/features/workout/hooks/use-workout-history';
import { useAppSelector } from '@/core/store';

export function StreakWidgetSync() {
  const uid = useAppSelector((state) => state.auth.user?.uid);
  const { refetch } = useWorkoutHistory();

  useEffect(() => {
    if (!uid) return;
    const subscription = AppState.addEventListener('change', (state) => {
      // Refresh after time-zone changes, midnight, or workouts on another device.
      if (state === 'active') void refetch();
    });
    return () => subscription.remove();
  }, [uid, refetch]);

  return null;
}
