import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Camera, ChevronRight, Pencil, Ruler, Settings, Weight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Appearance, Pressable, StyleSheet, View } from 'react-native';
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
import { StreakCard } from '@/features/home/components/streak-card';
import { WeightChart } from '@/features/progress/components/weight-chart';
import { useMeasurements } from '../data/profile-data';
import { EditProfileSheet, MeasurementsSheet, ProfileAvatar } from '../components/profile-editors';
import { ProfileSheet } from '../components/profile-sheet';
import { MeasurementHistory } from '../components/measurement-history';
import { runOnlineAction, useOfflineState } from '@/features/offline/data/connectivity';
import { NotificationSettings } from '@/features/notifications/components/notification-settings';
import { useNotificationState } from '@/features/notifications/data/preferences';

export function ProfileScreen() {
  useRefreshAccountOnFocus();
  const { isDark, colors } = useAppTheme();
  const user = useAppSelector((state) => state.auth.user);
  const profile = useProfile();
  const active = useActivePlan();
  const plans = useOwnedPlans();
  const history = useWorkoutHistory();
  const measurements = useMeasurements();
  const client = useQueryClient();
  const [leaving, setLeaving] = useState(false);
  const [sheet, setSheet] = useState<'profile' | 'measurements' | 'settings' | 'notifications' | null>(null);
  // A replaced modal can finish dismissing after the next sheet has opened.
  const closeSheet = (dismissed: NonNullable<typeof sheet>) => {
    setSheet((current) => current === dismissed ? null : current);
  };
  const notificationsReady = useNotificationState((state) => state.ready && state.uid === user?.uid);
  const online = useOfflineState((state) => state.online);
  useEffect(() => useOfflineState.subscribe((state, previous) => {
    if (!state.online && previous.online && (sheet === 'profile' || sheet === 'measurements')) {
      setSheet(null);
      useOfflineState.setState({ blockedAction: sheet === 'profile' ? 'Editing your profile' : 'Updating body measurements' });
    }
  }), [sheet]);
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
  const displayedProfile = { displayName: profile.data?.displayName || user.displayName, photoURL: profile.data?.photoURL ?? null, weightKg: profile.data?.weightKg ?? null, heightCm: profile.data?.heightCm ?? null };
  return <AppScreen tabScreen>
    <View style={styles.row}><AppText variant="title" weight="bold" style={{ flex: 1 }}>Profile</AppText>
      <Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => setSheet('settings')} style={[styles.settings, { backgroundColor: colors.surface, borderColor: colors.border }]}><Settings color={colors.text} size={22} /></Pressable>
    </View>
    <View style={styles.identity}>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit profile photo" disabled={online && !profile.isSuccess} onPress={() => runOnlineAction('Editing your profile', () => setSheet('profile'))}>
        <ProfileAvatar uri={displayedProfile.photoURL} size={104} />
        <View style={[styles.camera, { backgroundColor: colors.primary, borderColor: colors.background }]}><Camera size={16} color="white" /></View>
      </Pressable>
      <AppText variant="title" weight="bold" style={{ textAlign: 'center' }}>{displayedProfile.displayName || 'Your profile'}</AppText>
      <AppText color="muted">{user.email}</AppText>
      <View><GlassButton label="Edit profile" compact variant="secondary" disabled={online && !profile.isSuccess} icon={<Pencil size={15} color={colors.primary} />} onPress={() => runOnlineAction('Editing your profile', () => setSheet('profile'))} /></View>
    </View>
    <LoadState loading={profile.isLoading} error={profile.error} retry={() => { void profile.refetch(); }} />
    <Pressable accessibilityRole="button" accessibilityLabel="Add weight and height check-in" disabled={online && !profile.isSuccess} onPress={() => runOnlineAction('Updating body measurements', () => setSheet('measurements'))}>
      <SurfaceCard style={{ gap: 20 }}>
        <View style={styles.row}><AppText variant="subtitle" weight="bold" style={{ flex: 1 }}>Body measurements</AppText><ChevronRight size={20} color={colors.textMuted} /></View>
        <View style={styles.row}>
          <View style={styles.measure}><Weight color={colors.primary} size={22} /><AppText variant="title" weight="bold">{displayedProfile.weightKg ?? '—'}<AppText variant="small" color="muted"> kg</AppText></AppText><AppText variant="small" color="muted">Weight</AppText></View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.measure}><Ruler color={colors.primary} size={22} /><AppText variant="title" weight="bold">{displayedProfile.heightCm ?? '—'}<AppText variant="small" color="muted"> cm</AppText></AppText><AppText variant="small" color="muted">Height</AppText></View>
        </View>
        <AppText variant="small" color="primary">{displayedProfile.weightKg ? 'Tap to add a new check-in' : 'Add your weight and height'}</AppText>
      </SurfaceCard>
    </Pressable>
    <LoadState loading={measurements.isLoading} error={measurements.error} retry={() => { void measurements.refetch(); }} />
    {measurements.data && <>
      <WeightChart measurements={measurements.data} />
      <MeasurementHistory key={user.uid + ':' + (measurements.data.at(-1)?.id ?? 'empty')} measurements={measurements.data} onAdd={() => runOnlineAction('Updating body measurements', () => setSheet('measurements'))} />
    </>}
    <LoadState loading={history.isLoading} error={history.error} retry={() => { void history.refetch(); }} />
    {history.isSuccess && <View style={{ flexDirection: 'row', gap: 8 }}>
      {[{ value: stats.current, label: 'Current streak' }, { value: stats.best, label: 'Best streak' }, { value: stats.total, label: 'Workouts' }].map((stat) =>
        <SurfaceCard key={stat.label} style={{ flex: 1, padding: 12, gap: 8 }}><AppText variant="subtitle" weight="bold">{stat.value}</AppText><AppText variant="small" color="muted">{stat.label}</AppText></SurfaceCard>)}
    </View>}
    {history.isSuccess && stats.total === 0 && <AppText color="muted">Your progress will appear after your first completed workout.</AppText>}
    {history.isSuccess && <StreakCard stats={stats} />}
    <AppText variant="subtitle" weight="bold">Selected plan</AppText>
    <LoadState loading={active.isLoading} error={active.error} retry={() => { void active.refetch(); }} />
    {active.data && <PlanCard plan={active.data} active />}
    {active.isSuccess && !active.data && <AppText color="muted">You haven’t selected a plan yet.</AppText>}
    <AppText variant="subtitle" weight="bold">My custom plans</AppText>
    <LoadState loading={plans.isLoading} error={plans.error} retry={() => { void plans.refetch(); }} />
    {plans.data?.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
    {plans.isSuccess && !plans.data.length && <AppText color="muted">Plans you create will appear here.</AppText>}
    <GlassButton label="Create a plan" onPress={() => runOnlineAction('Creating a plan', () => router.push('/create-plan'))} />
    {sheet === 'profile' && <EditProfileSheet uid={user.uid} profile={displayedProfile} onClose={() => closeSheet('profile')} />}
    {sheet === 'measurements' && <MeasurementsSheet uid={user.uid} profile={displayedProfile} onClose={() => closeSheet('measurements')} />}
    {sheet === 'notifications' && <NotificationSettings uid={user.uid} onClose={() => closeSheet('notifications')} />}
    {sheet === 'settings' && <ProfileSheet title="Settings" busy={leaving} onClose={() => closeSheet('settings')}>
      <AppText color="muted">Appearance</AppText>
      <GlassButton label={isDark ? 'Switch to light appearance' : 'Switch to dark appearance'} variant="secondary" disabled={leaving} onPress={() => Appearance.setColorScheme(isDark ? 'light' : 'dark')} />
      <AppText color="muted">Account</AppText>
      <GlassButton label="Notifications" variant="secondary" disabled={leaving || !notificationsReady} onPress={() => setSheet('notifications')} />
      <GlassButton label="Log out" variant="danger" loading={leaving} onPress={logOut} />
    </ProfileSheet>}
  </AppScreen>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settings: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  identity: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  camera: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  measure: { flex: 1, alignItems: 'center', gap: 8 },
  divider: { width: 1, height: 72 },
});
