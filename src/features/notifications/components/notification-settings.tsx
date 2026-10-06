import { useState } from 'react';
import { Linking, Platform, Switch, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { GlassButton } from '@/components/ui/glass-button';
import { ProfileSheet, SheetField } from '@/features/profile/components/profile-sheet';
import { useOfflineState } from '@/features/offline/data/connectivity';
import { getPushRegistration, notificationPermission, testLocalNotification } from '../data/device';
import { saveNotificationPreferences, useNotificationState } from '../data/preferences';
import type { NotificationPreferences } from '../domain/notifications';

export function NotificationSettings({ uid, onClose }: { uid: string; onClose: () => void }) {
  const state = useNotificationState();
  const [prefs, setPrefs] = useState(state.preferences);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testToken, setTestToken] = useState<string | null>(null);
  const online = useOfflineState((value) => value.online);
  const update = (value: Partial<NotificationPreferences>) => setPrefs((current) => ({ ...current, ...value }));
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  return <ProfileSheet title="Notifications" busy={busy} onClose={onClose}>
    <AppText color="muted">Choose reminders for this account on this device. Times use your phone’s current time zone.</AppText>
    {state.permission === 'unavailable' ? <AppText color="muted">{Platform.OS === 'web' ? 'Open Jack Track on iOS or Android to enable notifications.' : 'Notifications are unavailable in this app version. Install the updated app to enable them.'}</AppText> : <>
      {state.permission !== 'granted' && <GlassButton label="Allow notifications" loading={busy} onPress={() => { void run(async () => {
        const permission = await notificationPermission(true);
        useNotificationState.setState({ permission });
        if (permission !== 'granted') setError('Notifications are disabled. Enable them in your phone’s Settings.');
      }); }} />}
      {(['quotes', 'workouts', 'streaks'] as const).map((kind) => <View key={kind} style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <AppText weight="semibold" style={{ flex: 1 }}>{kind === 'quotes' ? 'Daily motivation' : kind === 'workouts' ? 'Workout reminders' : 'Streak reminders'}</AppText>
          <Switch accessibilityLabel={kind === 'quotes' ? 'Daily motivation' : `${kind} reminders`} disabled={busy || state.permission !== 'granted'} value={prefs[kind]} onValueChange={(enabled) => update({ [kind]: enabled })} />
        </View>
        <SheetField label={`${kind === 'quotes' ? 'Quote' : kind === 'workouts' ? 'Workout' : 'Streak'} time (24-hour HH:MM)`} value={prefs[kind === 'quotes' ? 'quoteTime' : kind === 'workouts' ? 'workoutTime' : 'streakTime']} editable={!busy} maxLength={5} autoCapitalize="none" onChangeText={(time) => update({ [kind === 'quotes' ? 'quoteTime' : kind === 'workouts' ? 'workoutTime' : 'streakTime']: time })} />
      </View>)}
      <SheetField label="Quiet hours start (HH:MM)" value={prefs.quietStart} editable={!busy} maxLength={5} onChangeText={(quietStart) => update({ quietStart })} />
      <SheetField label="Quiet hours end (HH:MM)" value={prefs.quietEnd} editable={!busy} maxLength={5} onChangeText={(quietEnd) => update({ quietEnd })} />
      <AppText variant="small" color="muted">Matching quiet-hour times disable quiet hours. Workout reminders are prepared for the next 7 days and refreshed when you open the app. Streaks currently count consecutive calendar days, including rest days.</AppText>
      {!online && <AppText color="muted">Local reminders work offline. Quote changes and sign-out sync when you reconnect; previously enabled quotes may arrive until then.</AppText>}
      {state.preferences.quotes && <AppText variant="small" color="muted">{state.pushReady ? 'Daily quotes are connected.' : state.pushError ?? 'Daily quotes will connect when internet access is available.'}</AppText>}
      {!!(error || state.localError) && <AppText color="danger">{error || state.localError}</AppText>}
      <GlassButton label="Save notification settings" loading={busy} disabled={!state.ready || state.uid !== uid} onPress={() => { void run(async () => { await saveNotificationPreferences(uid, prefs); onClose(); }); }} />
      <GlassButton label="Send a test on this device" variant="secondary" disabled={busy || state.permission !== 'granted'} onPress={() => { void run(() => testLocalNotification(uid)); }} />
      {__DEV__ && <>
        <GlassButton label="Show push test details" variant="secondary" disabled={busy || !online || state.permission !== 'granted'} onPress={() => { void run(async () => {
          const registration = await getPushRegistration();
          setTestToken(registration.token);
        }); }} />
        {testToken && <View style={{ gap: 8 }}>
          <AppText variant="small" color="muted">Development test only. Use these values with npm run notifications:send. Firebase scheduling is not required.</AppText>
          <AppText selectable variant="small">Expo push token: {testToken}</AppText>
          <AppText selectable variant="small">User ID: {uid}</AppText>
        </View>}
      </>}
    </>}
    {Platform.OS !== 'web' && <GlassButton label="Open phone settings" variant="ghost" disabled={busy} onPress={() => { void run(() => Linking.openSettings()); }} />}
  </ProfileSheet>;
}
