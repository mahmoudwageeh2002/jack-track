import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { defaultNotificationPreferences, validateNotificationPreferences, type NotificationPreferences } from '../domain/notifications';

export const useNotificationState = create<{
  uid: string | null; ready: boolean; preferences: NotificationPreferences;
  permission: 'unknown' | 'granted' | 'denied' | 'unavailable';
  localError: string | null; pushError: string | null; pushReady: boolean;
}>(() => ({ uid: null, ready: false, preferences: defaultNotificationPreferences, permission: 'unknown', localError: null, pushError: null, pushReady: false }));
let generation = 0;
const key = (uid: string) => `jack-track:notifications:v1:${uid}`;
export async function loadNotificationPreferences(uid: string | null) {
  const current = ++generation;
  useNotificationState.setState({ uid, ready: false, preferences: defaultNotificationPreferences, pushReady: false, pushError: null });
  try {
    const raw = uid ? await AsyncStorage.getItem(key(uid)) : null;
    const preferences = raw ? { ...defaultNotificationPreferences, ...JSON.parse(raw) } as NotificationPreferences : { ...defaultNotificationPreferences };
    validateNotificationPreferences(preferences);
    if (current === generation) useNotificationState.setState({ preferences, ready: true, localError: null });
  } catch {
    if (current === generation) useNotificationState.setState({ ready: true, localError: 'Could not load notification preferences. Please save them again.' });
  }
}
export async function saveNotificationPreferences(uid: string, preferences: NotificationPreferences) {
  validateNotificationPreferences(preferences);
  await AsyncStorage.setItem(key(uid), JSON.stringify(preferences));
  if (useNotificationState.getState().uid === uid) useNotificationState.setState({ preferences, localError: null });
}
