import { format } from 'date-fns';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { confirmed, requireDatabase } from '@/core/utils/firestore-request';
import type { WorkoutSession } from '../domain/workout';
import { streakStats, workoutStats } from '../domain/workout-stats';

// Backfill existing accounts and commit a new workout with its summary atomically.
// Reading the session first makes retries safe, including a timed-out prior save.
export async function syncWorkoutSummary(uid: string, history: WorkoutSession[], completion?: WorkoutSession) {
  const db = requireDatabase();
  const userRef = doc(db, 'users', uid);
  const stats = workoutStats(history);
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  const completedAt = completion?.completedAt ?? now;
  const completedDay = completion?.completedDay ?? format(completedAt, 'yyyy-MM-dd');
  const summary = await confirmed(runTransaction(db, async (transaction) => {
    const user = await transaction.get(userRef);
    const sessionRef = completion ? doc(db, 'users', uid, 'workoutSessions', completion.id) : null;
    const saved = sessionRef ? await transaction.get(sessionRef) : null;
    const alreadyCompleted = saved?.data()?.status === 'completed';
    const previous = user.data()?.streak;
    const previousDays: string[] = Array.isArray(previous?.days) ? previous.days : [];
    const days = [...previousDays, ...stats.days];
    if (completion) days.push(alreadyCompleted ? saved!.data()!.completedDay ?? completedDay : completedDay);
    const { current, best, days: uniqueDays } = streakStats(days, now);
    const baseline = Math.max(Number(previous?.total) || 0, stats.total);
    const total = baseline + (completion && !alreadyCompleted && !history.some((item) => item.id === completion.id) ? 1 : 0);
    const streak = { current, best, total, days: uniqueDays, asOfDay: today, lastCompletedDay: uniqueDays.at(-1) ?? null };
    if (!previous || previous.current !== current || previous.best !== best || previous.total !== total || previous.asOfDay !== today || previousDays.join() !== uniqueDays.join()) {
      transaction.set(userRef, { streak, updatedAt: serverTimestamp() }, { merge: true });
    }
    if (completion && sessionRef && !alreadyCompleted) {
      transaction.set(sessionRef, { ...completion, status: 'completed', completedAt, completedDay });
    }
    return streak;
  }));
  return summary;
}
