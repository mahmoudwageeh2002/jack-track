import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Appearance, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { container } from '@/app/container';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { GlassButton } from '@/components/ui/glass-button';
import { LoadState } from '@/components/ui/load-state';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useAppSelector } from '@/core/store';
import { PlanCard } from '@/features/plans/components/plan-card';
import { useActivePlan, useOwnedPlans, useRefreshAccountOnFocus } from '@/features/plans/hooks/use-plans';
import { workoutStats } from '@/features/workout/domain/workout-stats';
import { useProfile, useWorkoutHistory } from '@/features/workout/hooks/use-workout-history';
import { useAppTheme } from '@/hooks/use-app-theme';

export function ProfileScreen() {
  useRefreshAccountOnFocus();
  const { isDark } = useAppTheme();
  const user = useAppSelector((state) => state.auth.user);
  const profile = useProfile();
  const active = useActivePlan();
  const plans = useOwnedPlans();
  const history = useWorkoutHistory();
  const client = useQueryClient();
  const [leaving, setLeaving] = useState(false);
  const stats = workoutStats(history.data ?? []);
  const logOut = async () => {
    setLeaving(true);
    try {
      await container.authRepository.logOut();
      client.clear();
      router.replace('/login');
    } catch {
      Toast.show({ type: 'error', text1: 'Could not log out. Please try again.' });
    } finally { setLeaving(false); }
  };
  if (!user) return <AppScreen tabScreen><AppText>Log in to see your profile.</AppText><GlassButton label="Log in" onPress={() => router.replace('/login')} /></AppScreen>;
  return <AppScreen tabScreen>
    <AppText variant="title" weight="bold">{profile.data?.displayName || user.displayName || 'Your profile'}</AppText>
    <AppText color="muted">{user.email}</AppText>
    <LoadState loading={history.isLoading} error={history.error} retry={() => { void history.refetch(); }} />
    {history.isSuccess && <View style={{ flexDirection: 'row', gap: 8 }}>
      {[{ value: stats.current, label: 'Current streak' }, { value: stats.best, label: 'Best streak' }, { value: stats.total, label: 'Workouts' }].map((stat) =>
        <SurfaceCard key={stat.label} style={{ flex: 1, padding: 12, gap: 8 }}><AppText variant="subtitle" weight="bold">{stat.value}</AppText><AppText variant="small" color="muted">{stat.label}</AppText></SurfaceCard>)}
    </View>}
    {history.isSuccess && stats.total === 0 && <AppText color="muted">Your progress will appear after your first completed workout.</AppText>}
    <AppText variant="subtitle" weight="bold">Selected plan</AppText>
    <LoadState loading={active.isLoading} error={active.error} retry={() => { void active.refetch(); }} />
    {active.data && <PlanCard plan={active.data} active />}
    {active.isSuccess && !active.data && <AppText color="muted">You haven’t selected a plan yet.</AppText>}
    <AppText variant="subtitle" weight="bold">My custom plans</AppText>
    <LoadState loading={plans.isLoading} error={plans.error} retry={() => { void plans.refetch(); }} />
    {plans.data?.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
    {plans.isSuccess && !plans.data.length && <AppText color="muted">Plans you create will appear here.</AppText>}
    <GlassButton label="Create a plan" onPress={() => router.push('/create-plan')} />
    <GlassButton label={isDark ? 'Switch to light appearance' : 'Switch to dark appearance'} variant="secondary" onPress={() => Appearance.setColorScheme(isDark ? 'light' : 'dark')} />
    <GlassButton label="Log out" variant="danger" loading={leaving} onPress={logOut} />
  </AppScreen>;
}
