import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import { auth } from '@/core/config/firebase';
import { notificationPrefix, type Reminder } from '../domain/notifications';

type Notifications = typeof import('expo-notifications');
let api: Notifications | undefined;
export function notificationsAvailable() {
  return Constants.executionEnvironment !== 'storeClient' && !!requireOptionalNativeModule('ExpoNotificationScheduler');
}
function notifications() {
  if (!notificationsAvailable()) throw new Error('Notifications are unavailable in this app version. Install the updated app to enable them.');
  if (!api) {
    // Old development builds remain usable until the new native module is installed.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    api = require('expo-notifications') as Notifications;
    api.setNotificationHandler({ handleNotification: async (notification) => {
      const uid = auth?.currentUser?.uid;
      const show = !!uid && notification.request.content.data?.uid === uid;
      return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
    } });
  }
  return api;
}
export async function notificationPermission(request = false): Promise<'granted' | 'denied' | 'unavailable'> {
  if (!notificationsAvailable()) return 'unavailable';
  const n = notifications();
  if (Platform.OS === 'android') {
    for (const [id, name] of [['workouts', 'Workout reminders'], ['streaks', 'Streak reminders'], ['quotes', 'Daily motivation']]) {
      await n.setNotificationChannelAsync(id, { name, importance: n.AndroidImportance.DEFAULT, sound: 'default' });
    }
  }
  let result = await n.getPermissionsAsync();
  if (request && !result.granted && result.canAskAgain) result = await n.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return result.granted || result.ios?.status === n.IosAuthorizationStatus.PROVISIONAL ? 'granted' : 'denied';
}
let localQueue = Promise.resolve();
let revision = 0;
export function replaceReminders(reminders: Reminder[]): Promise<void> {
  const current = ++revision;
  const task = localQueue.catch(() => {}).then(async () => {
    if (!notificationsAvailable() || current !== revision) return;
    const n = notifications();
    const desired = new Map(reminders.map((reminder) => [reminder.id, reminder]));
    const scheduled = await n.getAllScheduledNotificationsAsync();
    const retained = new Set<string>();
    for (const item of scheduled) {
      if (!item.identifier.startsWith(notificationPrefix)) continue;
      const next = desired.get(item.identifier);
      if (next && item.content.data?.at === next.date.getTime() && item.content.body === next.body) retained.add(next.id);
      else await n.cancelScheduledNotificationAsync(item.identifier);
    }
    for (const reminder of reminders) {
      if (current !== revision) return;
      if (retained.has(reminder.id)) continue;
      await n.scheduleNotificationAsync({
        identifier: reminder.id,
        content: { title: reminder.title, body: reminder.body, sound: 'default', data: { kind: reminder.kind, uid: reminder.uid, at: reminder.date.getTime() } },
        trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: reminder.date, channelId: reminder.kind === 'workout' ? 'workouts' : 'streaks' },
      });
    }
    for (const shown of await n.getPresentedNotificationsAsync()) {
      if (shown.request.identifier.startsWith(notificationPrefix) && !desired.has(shown.request.identifier)) await n.dismissNotificationAsync(shown.request.identifier);
    }
  });
  localQueue = task;
  return task;
}
export async function getPushRegistration() {
  const n = notifications();
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error('Push notifications are not configured for this app.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const result = await Promise.race([
    n.getExpoPushTokenAsync({ projectId }),
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Push registration timed out. Please reconnect and try again.')), 15_000); }),
  ]).finally(() => clearTimeout(timer));
  const token = result.data;
  let secret = await AsyncStorage.getItem('jack-track:notification-secret');
  if (!secret) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('expo-crypto') as typeof import('expo-crypto');
    secret = crypto.randomUUID() + crypto.randomUUID();
    await AsyncStorage.setItem('jack-track:notification-secret', secret);
  }
  return { token, secret };
}
export function observeNotificationTaps(callback: (id: string, data: Record<string, unknown>) => void) {
  if (!notificationsAvailable()) return () => {};
  const n = notifications();
  let active = true;
  const receive = (response: import('expo-notifications').NotificationResponse) => {
    if (active) callback(response.notification.request.identifier, response.notification.request.content.data ?? {});
  };
  const subscription = n.addNotificationResponseReceivedListener(receive);
  void n.getLastNotificationResponseAsync().then((response) => { if (response) receive(response); }).catch(() => {});
  return () => { active = false; subscription.remove(); };
}
export function observePushTokenChanges(callback: () => void) {
  if (!notificationsAvailable()) return () => {};
  const subscription = notifications().addPushTokenListener(callback);
  return () => subscription.remove();
}
export async function testLocalNotification(uid: string) {
  const n = notifications();
  await n.scheduleNotificationAsync({ content: { title: 'Jack Track notifications are ready', body: 'Your reminders will appear here.', data: { kind: 'quote', uid } }, trigger: null });
}
