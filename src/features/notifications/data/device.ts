import type { Reminder } from '../domain/notifications';
export function notificationsAvailable() { return false; }
export async function notificationPermission(_request = false): Promise<'granted' | 'denied' | 'unavailable'> { return 'unavailable'; }
export async function replaceReminders(_reminders: Reminder[]) {}
export async function getPushRegistration(): Promise<{ token: string; secret: string }> { throw new Error('Notifications are available in the iOS and Android app.'); }
export function observeNotificationTaps(_callback: (id: string, data: Record<string, unknown>) => void) { return () => {}; }
export function observePushTokenChanges(_callback: () => void) { return () => {}; }
export async function testLocalNotification(_uid: string) {}
