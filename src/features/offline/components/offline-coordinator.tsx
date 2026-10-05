import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { useAppSelector } from '@/core/store';
import { AppText } from '@/components/ui/app-text';
import { GlassButton } from '@/components/ui/glass-button';
import { ProfileSheet } from '@/features/profile/components/profile-sheet';
import { useActivePlan, useExercises } from '@/features/plans/hooks/use-plans';
import { useWorkoutHistory } from '@/features/workout/hooks/use-workout-history';
import { useWorkoutStore } from '@/features/workout/store/workout-store';
import { offlineStorage } from '../data/offline-storage';
import { checkConnectivity, runOnlineAction, useOfflineState, watchConnectivity } from '../data/connectivity';
import { syncPendingWorkouts } from '../data/workout-sync';
import { offlineEligibility } from '../domain/offline-eligibility';
import { OfflineUnavailableSheet } from './offline-unavailable-sheet';

export function OfflineCoordinator() {
  const { user, initialized } = useAppSelector((state) => state.auth);
  const uid = user?.uid;
  const online = useOfflineState((state) => state.online);
  const ready = useOfflineState((state) => state.ready);
  const offlineEpoch = useOfflineState((state) => state.offlineEpoch);
  const blockedAction = useOfflineState((state) => state.blockedAction);
  const active = useActivePlan();
  const catalog = useExercises();
  const history = useWorkoutHistory();
  const client = useQueryClient();
  const [dismissed, setDismissed] = useState('');

  useEffect(() => watchConnectivity(), []);
  useEffect(() => {
    let disposed = false;
    useOfflineState.setState({ pending: 0, syncing: false, syncError: null, storageError: null });
    if (!uid) return;
    void useWorkoutStore.getState().hydrate(uid);
    void offlineStorage.read(uid).then((account) => {
      if (!disposed) useOfflineState.setState({ pending: account.pending.length });
    }).catch(() => {
      if (!disposed) useOfflineState.setState({ storageError: 'Could not read your saved workouts. Please reopen the app.' });
    });
    const unsubscribe = offlineStorage.subscribe((owner, account) => {
      if (owner === uid && !disposed) useOfflineState.setState({ pending: account.pending.length });
    });
    return () => { disposed = true; unsubscribe(); };
  }, [uid]);

  useEffect(() => {
    if (!ready) return;
    void client.invalidateQueries();
    if (uid && online) void syncPendingWorkouts(uid);
  }, [client, uid, online, ready]);

  useEffect(() => {
    const refresh = async () => {
      if (await checkConnectivity()) {
        if (uid) void syncPendingWorkouts(uid);
        void client.invalidateQueries();
      }
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh().catch(() => {});
    });
    const retry = setInterval(() => {
      if (uid && AppState.currentState === 'active') void syncPendingWorkouts(uid);
    }, 30_000);
    return () => { subscription.remove(); clearInterval(retry); };
  }, [client, uid]);

  const planEligibility = offlineEligibility(uid, active.data, catalog.data);
  const eligibility = planEligibility === 'ready' && history.isError ? 'download' : planEligibility;
  const reason = !online && ready && initialized && (!uid || (!active.isPending && !catalog.isPending && !history.isPending)) && eligibility !== 'ready' ? `${uid ?? 'guest'}:${eligibility}:${offlineEpoch}` : '';
  if (!online && blockedAction) return <OfflineUnavailableSheet action={blockedAction} onClose={() => { useOfflineState.setState({ blockedAction: null }); setDismissed(reason); }} />;
  if (!reason || dismissed === reason) return null;
  const close = () => setDismissed(reason);
  return <ProfileSheet title="Get ready for offline workouts" onClose={close}>
    <AppText color="muted">{eligibility === 'account'
      ? 'Turn on Wi-Fi or mobile data, then create an account or sign in and choose a workout plan. We’ll save your plan on this device so you can train offline.'
      : eligibility === 'plan'
        ? 'Connect to the internet and create or select a workout plan. Open it once to save it on this device, then you can train without a connection.'
        : 'Connect to the internet once to finish downloading your plan, exercise instructions, and workout history. Then your workouts will be available offline.'}</AppText>
    {Platform.OS !== 'web' && <GlassButton label="Open settings" onPress={() => { void Linking.openSettings().catch(() => {}); }} />}
    <GlassButton label="Check connection" variant="secondary" onPress={() => { void checkConnectivity().catch(() => {}); }} />
    <GlassButton label={uid ? 'Create a plan when connected' : 'Create an account when connected'} variant="ghost" onPress={() => { close(); if (uid) runOnlineAction('Creating a plan', () => router.push('/create-plan')); else router.push('/register'); }} />
    {!uid && <GlassButton label="I already have an account" variant="ghost" onPress={() => { close(); router.push('/login'); }} />}
  </ProfileSheet>;
}
