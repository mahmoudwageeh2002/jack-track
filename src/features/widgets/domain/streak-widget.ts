import { addDays, format, startOfDay, startOfWeek } from 'date-fns';
import { streakStats } from '../../workout/domain/workout-stats';

export type StreakWidgetSummary = { days: string[]; best: number; total: number };

export type StreakWidgetProps = {
  current: number;
  best: number;
  total: number;
  completedToday: boolean;
  status: 'ready' | 'signedOut' | 'loading';
  week?: { date: string; label: string; completed: boolean; isToday: boolean; isFuture: boolean }[];
  weekLabel?: string;
};

export function emptyStreakWidget(status: 'signedOut' | 'loading'): StreakWidgetProps {
  return { current: 0, best: 0, total: 0, completedToday: false, status };
}

// Keep the calendar current for a week without opening the app. The final entry
// asks for a refresh rather than leaving an old week labeled as the current one.
export function streakWidgetTimeline(summary: StreakWidgetSummary, now = new Date()) {
  const dates = [now, ...Array.from({ length: 8 }, (_, index) => startOfDay(addDays(now, index + 1)))];
  return dates.map((date, index) => {
    const stats = streakStats(summary.days, date);
    const today = format(date, 'yyyy-MM-dd');
    const monday = startOfWeek(date, { weekStartsOn: 1 });
    const week = index === 8 ? [] : Array.from({ length: 7 }, (_, offset) => {
      const day = addDays(monday, offset);
      const key = format(day, 'yyyy-MM-dd');
      return {
        date: key, label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][offset],
        completed: stats.days.includes(key), isToday: key === today, isFuture: key > today,
      };
    });
    const props: StreakWidgetProps = {
      current: stats.current,
      best: Math.max(summary.best, stats.best),
      total: summary.total,
      completedToday: stats.days.includes(format(date, 'yyyy-MM-dd')),
      status: 'ready',
      week,
      weekLabel: week.length ? `${format(monday, 'MMM d')} – ${format(addDays(monday, 6), 'MMM d')}` : 'Open to refresh week',
    };
    return { date, props };
  });
}
