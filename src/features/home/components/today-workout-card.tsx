import { router } from 'expo-router';
import { AppText } from '@/components/ui/app-text';
import { GlassButton } from '@/components/ui/glass-button';
import { SurfaceCard } from '@/components/ui/surface-card';
import type { UserPlan } from '@/features/plans/domain/plan';
import { todaysPlanDay } from '@/features/plans/domain/schedule';

export function TodayWorkoutCard({ plan, completedSessions }: { plan: UserPlan | null; completedSessions: number }) {
  if (!plan) return <GlassButton label="Create my workout" onPress={() => router.push('/create-plan')} />;
  const day = todaysPlanDay(plan, completedSessions);
  return <SurfaceCard style={{ gap: 14 }}>
    <AppText variant="caption" color="primary" weight="bold">YOUR PLAN · {plan.name}</AppText>
    <AppText variant="subtitle" weight="bold">{day?.name ?? 'Rest day'}</AppText>
    <AppText color="muted">{day ? day.exercises.length + ' exercises · ' + day.exercises.reduce((sum, move) => sum + move.sets, 0) + ' sets' : 'Take time to recover. Your next training day is on your plan.'}</AppText>
    {day && <GlassButton label="Start workout" onPress={() => router.push('/workout')} />}
    <GlassButton label="View my plan" variant="secondary" onPress={() => router.push({ pathname: '/plan/[id]', params: { id: plan.id, active: 'true' } })} />
  </SurfaceCard>;
}
