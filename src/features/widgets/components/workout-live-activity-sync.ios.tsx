import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAppSelector } from '@/core/store';
import { useActivePlan, useExercises } from '@/features/plans/hooks/use-plans';
import { useWorkoutStore } from '@/features/workout/store/workout-store';
import { workoutActivityProps } from '../domain/workout-activity';
import { syncWorkoutLiveActivity } from '../workout-live-activity-sync.ios';

export function WorkoutLiveActivitySync() {
  const { user, initialized } = useAppSelector((state) => state.auth);
  const active = useActivePlan();
  const catalog = useExercises();

  useEffect(() => {
    if (!initialized) return;
    const refresh = () => {
      const { session, readyForUid } = useWorkoutStore.getState();
      const uid = user?.uid ?? null;
      const workoutName = active.data?.id === session?.planId
        ? active.data?.days.find((day) => day.id === session?.planDayId)?.name : undefined;
      syncWorkoutLiveActivity({
        ownerId: uid,
        props: uid && readyForUid !== uid ? undefined : workoutActivityProps(session, uid, catalog.data ?? [], workoutName),
        foreground: AppState.currentState === 'active',
      });
    };
    refresh();
    // Subscribe outside the workout screen so navigating away doesn't end the activity.
    const unsubscribe = useWorkoutStore.subscribe(refresh);
    const subscription = AppState.addEventListener('change', refresh);
    return () => { unsubscribe(); subscription.remove(); };
  }, [initialized, user?.uid, active.data, catalog.data]);

  return null;
}
