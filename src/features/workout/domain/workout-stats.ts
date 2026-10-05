import { differenceInCalendarDays, format, startOfWeek, subDays } from 'date-fns';
import type { WorkoutSession } from './workout';

export function streakStats(completedDays: string[], now = new Date()) {
  const days = [...new Set(completedDays)].sort();
  const today = format(now, 'yyyy-MM-dd');
  const yesterday = format(subDays(now, 1), 'yyyy-MM-dd');
  let best = 0;
  let run = 0;
  for (let index = 0; index < days.length; index++) {
    run = index > 0 && differenceInCalendarDays(new Date(days[index] + 'T12:00:00'), new Date(days[index - 1] + 'T12:00:00')) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const current = days.at(-1) === today || days.at(-1) === yesterday ? run : 0;
  return { current, best, days };
}

export function workoutStats(sessions: WorkoutSession[], now = new Date()) {
  const completed = sessions.filter((session) => session.status === 'completed' && session.completedAt);
  const { current, best, days } = streakStats(completed.map((session) => session.completedDay ?? format(session.completedAt!, 'yyyy-MM-dd')), now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekly = completed.filter((session) => session.completedAt! >= weekStart && session.completedAt! <= now);
  const volume = weekly.reduce((sum, session) => sum + session.exercises.reduce((total, exercise) =>
    total + exercise.sets.filter((set) => set.completed).reduce((load, set) => load + set.weight * set.reps, 0), 0), 0);
  return { current, best, total: completed.length, weekly: weekly.length, volume, days };
}
