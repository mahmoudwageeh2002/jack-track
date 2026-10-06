import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';
import { useAppSelector } from '@/core/store';
import { offlineStorage } from '@/features/offline/data/offline-storage';
import { useOfflineState } from '@/features/offline/data/connectivity';
import type { UserPlan } from '@/features/plans/domain/plan';
import { localReminders, notificationDestination } from '../domain/notifications';
import { notificationPermission, notificationsAvailable, observeNotificationTaps, observePushTokenChanges, replaceReminders } from '../data/device';
import { loadNotificationPreferences, useNotificationState } from '../data/preferences';
import { syncPushRegistration } from '../data/push-registration';

export function NotificationCoordinator() {
  const { user, initialized } = useAppSelector((state) => state.auth);
  const uid = user?.uid ?? null;
  const { ready, preferences, permission, uid: preferencesUid } = useNotificationState();
  const online = useOfflineState((state) => state.online);
  const navigation = useRootNavigationState();
  const [resume, setResume] = useState(0);
  const [tap, setTap] = useState<{ id: string; data: Record<string, unknown> } | null>(null);
  const handled = useRef<string | null>(null);

  useEffect(() => { if (initialized) void loadNotificationPreferences(uid); }, [initialized, uid]);
  useEffect(() => {
    // Remove the previous account's schedule before loading this account's cache.
    if (initialized) void replaceReminders([]).catch(() => {});
  }, [initialized, uid]);
  useEffect(() => {
    const refresh = () => {
      void notificationPermission().then((next) => useNotificationState.setState({ permission: next })).catch(() => {});
      setResume((value) => value + 1);
    };
    refresh();
    const app = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    const unsubscribe = observeNotificationTaps((id, data) => setTap({ id, data }));
    const unsubscribeToken = observePushTokenChanges(refresh);
    return () => { app.remove(); unsubscribe(); unsubscribeToken(); };
  }, []);
  useEffect(() => {
    if (!initialized || !navigation?.key || !tap || handled.current === tap.id) return;
    handled.current = tap.id;
    const destination = notificationDestination(tap.data, uid);
    if (destination) router.push(destination);
  }, [initialized, navigation?.key, tap, uid]);

  useEffect(() => {
    if (!initialized || !notificationsAvailable()) return;
    if (!uid) { void replaceReminders([]).catch(() => {}); return; }
    if (!ready || preferencesUid !== uid) return;
    let disposed = false;
    let previousSchedule: string | null = null;
    const refresh = async () => {
      try {
        const account = await offlineStorage.read(uid);
        if (disposed) return;
        const plan = account.resources['active-plan'] as UserPlan | null | undefined;
        const reminders = permission === 'granted' ? localReminders(uid, plan ?? null, account.history, preferences) : [];
        const signature = JSON.stringify(reminders);
        if (signature === previousSchedule) return;
        await replaceReminders(reminders);
        previousSchedule = signature;
        if (!disposed) useNotificationState.setState({ localError: null });
      } catch {
        if (!disposed) useNotificationState.setState({ localError: 'Could not update reminders. Open notification settings to try again.' });
      }
    };
    void refresh();
    const unsubscribe = offlineStorage.subscribe((owner) => { if (owner === uid) void refresh(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 60_000);
    return () => { disposed = true; unsubscribe(); clearInterval(timer); };
  }, [initialized, uid, ready, preferencesUid, preferences, permission, resume]);

  useEffect(() => {
    if (!initialized || !ready || preferencesUid !== uid || permission === 'unknown' || !notificationsAvailable()) return;
    useNotificationState.setState({ pushReady: false });
    void syncPushRegistration(uid, preferences, permission === 'granted', online);
    const timer = setInterval(() => {
      if (AppState.currentState === 'active' && !useNotificationState.getState().pushReady) void syncPushRegistration(uid, preferences, permission === 'granted', online);
    }, 60_000);
    return () => clearInterval(timer);
  }, [initialized, uid, ready, preferencesUid, preferences, permission, online, resume]);
  return null;
}
