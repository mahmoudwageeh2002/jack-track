import { router } from 'expo-router';
import { View } from 'react-native';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { GlassButton } from '@/components/ui/glass-button';
import { LoadState } from '@/components/ui/load-state';
import { useAppSelector } from '@/core/store';
import { useActivePlan, useExercises, useRefreshAccountOnFocus } from '@/features/plans/hooks/use-plans';
import { offlineEligibility } from '@/features/offline/domain/offline-eligibility';
import { workoutStats } from '@/features/workout/domain/workout-stats';
import { useProfile, useWorkoutHistory } from '@/features/workout/hooks/use-workout-history';
import { StreakCard } from '../components/streak-card';
import { TodayWorkoutCard } from '../components/today-workout-card';
import { WeeklySummary } from '../components/weekly-summary';

export function HomeScreen() {
  useRefreshAccountOnFocus();
  const user = useAppSelector((state) => state.auth.user);
  const profile = useProfile();
  const active = useActivePlan();
  const catalog = useExercises();
  const history = useWorkoutHistory();
  const stats = workoutStats(history.data ?? []);
  const name = profile.data?.displayName || user?.displayName;
  if (!user) return <AppScreen tabScreen><AppText variant="title" weight="bold">Your training starts here</AppText><GlassButton label="Log in" onPress={() => router.replace('/login')} /></AppScreen>;
  return <AppScreen tabScreen>
    <View style={{ gap: 6 }}><AppText color="muted">Welcome{name ? ', ' + name.split(' ')[0] : ''}</AppText><AppText variant="title" weight="bold">Ready to train?</AppText></View>
    {history.isSuccess && active.isSuccess && catalog.isSuccess && offlineEligibility(user.uid, active.data, catalog.data) === 'ready' && <AppText variant="small" color="primary">Your plan is saved for offline workouts.</AppText>}
    <LoadState loading={history.isLoading} error={history.error} retry={() => { void history.refetch(); }} />
    {history.isSuccess && <StreakCard stats={stats} />}
    <LoadState loading={active.isLoading} error={active.error} retry={() => { void active.refetch(); }} />
    {active.isSuccess && (!active.data || history.isSuccess) && <TodayWorkoutCard plan={active.data} completedSessions={(history.data ?? []).filter((session) => session.planId === active.data?.id).length} />}
    {history.isSuccess && stats.total > 0 && <WeeklySummary workouts={stats.weekly} volume={stats.volume} />}
  </AppScreen>;
}
