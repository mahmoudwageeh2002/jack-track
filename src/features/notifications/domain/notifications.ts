import { format, addDays } from 'date-fns';
import type { UserPlan } from '@/features/plans/domain/plan';
import { todaysPlanDay } from '@/features/plans/domain/schedule';
import type { WorkoutSession } from '@/features/workout/domain/workout';
import { streakStats } from '@/features/workout/domain/workout-stats';

export type NotificationPreferences = {
  workouts: boolean; streaks: boolean; quotes: boolean;
  workoutTime: string; streakTime: string; quoteTime: string;
  quietStart: string; quietEnd: string;
};
export const defaultNotificationPreferences: NotificationPreferences = {
  workouts: false, streaks: false, quotes: false,
  workoutTime: '20:00', streakTime: '22:00', quoteTime: '10:00', quietStart: '23:00', quietEnd: '08:00',
};
export const notificationPrefix = 'jack-track:reminder:';
export type Reminder = { id: string; kind: 'workout' | 'streak'; uid: string; date: Date; title: string; body: string };
export function minuteOfDay(value: string) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Enter times as HH:MM, for example 20:00.');
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}
export function inQuietHours(minute: number, start: number, end: number) {
  return start === end ? false : start < end ? minute >= start && minute < end : minute >= start || minute < end;
}
export function validateNotificationPreferences(prefs: NotificationPreferences) {
  if (![prefs.workouts, prefs.streaks, prefs.quotes].every((value) => typeof value === 'boolean')) throw new Error('Please choose which notifications to enable.');
  const start = minuteOfDay(prefs.quietStart), end = minuteOfDay(prefs.quietEnd);
  for (const [enabled, time] of [[prefs.workouts, prefs.workoutTime], [prefs.streaks, prefs.streakTime], [prefs.quotes, prefs.quoteTime]] as const) {
    const minute = minuteOfDay(time);
    if (enabled && inQuietHours(minute, start, end)) throw new Error('Choose reminder times outside your quiet hours.');
  }
}
export function localReminders(uid: string, plan: UserPlan | null, history: WorkoutSession[], prefs: NotificationPreferences, now = new Date()): Reminder[] {
  validateNotificationPreferences(prefs);
  const completed = history.filter((session) => session.userId === uid && session.status === 'completed' && session.completedAt);
  const days = [...new Set(completed.map((session) => session.completedDay ?? format(session.completedAt!, 'yyyy-MM-dd')))];
  const reminders: Reminder[] = [];
  function add(kind: Reminder['kind'], day: Date, time: string, title: string, body: string) {
    const minute = minuteOfDay(time);
    const date = new Date(day);
    date.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
    // A missing DST clock time must not silently move into quiet hours.
    if (date.getHours() * 60 + date.getMinutes() !== minute) return;
    const dayKey = format(date, 'yyyy-MM-dd');
    if (date <= now || days.includes(dayKey)) return;
    reminders.push({ id: `${notificationPrefix}${uid}:${kind}:${dayKey}`, kind, uid, date, title, body });
  }
  if (prefs.workouts && plan?.ownerId === uid) {
    const count = completed.filter((session) => session.planId === plan.id).length;
    for (let offset = 0; offset < 7; offset++) {
      const day = addDays(now, offset);
      if (todaysPlanDay(plan, count, day)) add('workout', day, prefs.workoutTime, 'Time for your workout', 'Your workout is waiting. Open Jack Track when you’re ready to train.');
    }
  }
  if (prefs.streaks) {
    const stats = streakStats(days, now);
    const latest = stats.days.at(-1);
    if (stats.current > 0 && latest) {
      const deadline = addDays(new Date(`${latest}T12:00:00`), 1);
      add('streak', deadline, prefs.streakTime, 'Check your streak', `Your ${stats.current}-day streak reaches its next deadline tonight. Open Jack Track to check your progress.`);
    }
  }
  // One combined reminder when both types would arrive at the same time.
  return reminders.filter((reminder) => reminder.kind !== 'workout' || !reminders.some((other) => other.kind === 'streak' && other.date.getTime() === reminder.date.getTime()));
}
export function notificationDestination(data: Record<string, unknown>, uid: string | null) {
  if (!uid || data.uid !== uid) return null;
  if (data.kind === 'workout') return '/workout' as const;
  if (data.kind === 'streak') return '/(tabs)/profile' as const;
  if (data.kind === 'quote') return '/(tabs)' as const;
  return null;
}
