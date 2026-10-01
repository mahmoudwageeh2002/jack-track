import type { Plan } from './plan';

export const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function todaysPlanDay(plan: Plan, completedSessions: number, date = new Date()) {
  const weekday = (date.getDay() + 6) % 7;
  if (plan.days.some((day) => day.weekday !== undefined)) {
    return plan.days.find((day) => day.weekday === weekday) ?? null;
  }
  if (plan.restDays?.includes(weekday)) return null;
  return plan.days[completedSessions % plan.days.length] ?? null;
}
