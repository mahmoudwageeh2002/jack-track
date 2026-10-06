import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '@/core/config/firebase';
import { getPushRegistration } from './device';
import { minuteOfDay, type NotificationPreferences } from '../domain/notifications';
import { useNotificationState } from './preferences';

type Registration = { uid: string; token: string; secret: string; signature: string; synced: boolean };
const key = 'jack-track:push-registration:v1';
let queue = Promise.resolve();
let revision = 0;

export function syncPushRegistration(uid: string | null, prefs: NotificationPreferences, allowed: boolean, online: boolean) {
  const current = ++revision;
  const task = queue.catch(() => {}).then(async () => {
    if (!online || !auth || current !== revision) return;
    const functions = getFunctions(auth.app, 'us-central1');
    const revoke = httpsCallable(functions, 'revokeNotificationDevice', { timeout: 15_000 });
    const register = httpsCallable(functions, 'registerNotificationDevice', { timeout: 15_000 });
    const raw = await AsyncStorage.getItem(key);
    let previous = raw ? JSON.parse(raw) as Registration : null;
    if (previous && (previous.uid !== uid || !prefs.quotes || !allowed)) {
      // The installation secret allows a deferred offline sign-out to revoke later,
      // even after Firebase Auth has signed out or switched accounts.
      await revoke({ token: previous.token, secret: previous.secret });
      await AsyncStorage.removeItem(key);
      previous = null;
    }
    if (current !== revision) return;
    if (!uid || !prefs.quotes || !allowed) {
      useNotificationState.setState({ pushReady: true, pushError: null });
      return;
    }
    if (auth.currentUser?.uid !== uid) return;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const registration = await getPushRegistration();
    if (current !== revision || auth.currentUser?.uid !== uid) return;
    if (previous && previous.token !== registration.token) {
      await revoke({ token: previous.token, secret: previous.secret });
      previous = null;
    }
    const configuration = { ...registration, quoteMinute: minuteOfDay(prefs.quoteTime), quietStart: minuteOfDay(prefs.quietStart), quietEnd: minuteOfDay(prefs.quietEnd), timeZone };
    const signature = JSON.stringify(configuration);
    if (!previous?.synced || previous.signature !== signature) {
      const next: Registration = { ...registration, uid, signature, synced: false };
      // Persist before calling: a response lost after a server commit remains revocable.
      await AsyncStorage.setItem(key, JSON.stringify(next));
      await register(configuration);
      await AsyncStorage.setItem(key, JSON.stringify({ ...next, synced: true }));
    }
    if (current === revision) useNotificationState.setState({ pushReady: true, pushError: null });
  }).catch((error: unknown) => {
    if (current === revision) useNotificationState.setState({ pushReady: false, pushError: 'Daily quotes could not connect. Local reminders still work. Connect to the internet and retry.' });
    console.warn('Notification registration failed:', error instanceof Error ? error.name : 'Unknown error');
  });
  queue = task;
  return task;
}
