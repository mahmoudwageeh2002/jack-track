import { router } from 'expo-router';
import { View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { GlassButton } from '@/components/ui/glass-button';
import { LoadState } from '@/components/ui/load-state';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useAppSelector } from '@/core/store';
import { PlanCard } from '../components/plan-card';
import { useActivePlan, useOwnedPlans, usePlans, useRefreshAccountOnFocus } from '../hooks/use-plans';

export function PlansScreen() {
  useRefreshAccountOnFocus();
  const user = useAppSelector((state) => state.auth.user);
  const active = useActivePlan();
  const official = usePlans();
  const owned = useOwnedPlans();
  const selectedId = active.data?.sourcePlanId ?? active.data?.id;
  const available = [...(owned.data ?? []), ...(official.data ?? [])].filter((plan) => plan.id !== selectedId);
  if (!user) return <AppScreen tabScreen><AppText>Log in to see your plans.</AppText><GlassButton label="Log in" onPress={() => router.replace('/login')} /></AppScreen>;
  return <AppScreen tabScreen>
    <AppText variant="title" weight="bold">Training plans</AppText>
    <AppText color="muted">Your week. Your pace. Your progress.</AppText>
    <AppText variant="subtitle" weight="bold">Selected plan</AppText>
    <LoadState loading={active.isLoading} error={active.error} retry={() => { void active.refetch(); }} />
    {active.data && <PlanCard plan={active.data} active />}
    {active.isSuccess && !active.data && <SurfaceCard tone="muted"><AppText color="muted">No plan selected yet. Create your own or choose one below.</AppText></SurfaceCard>}
    <GlassButton label="Create my workout" onPress={() => router.push('/create-plan')} />
    <AppText variant="subtitle" weight="bold">Other plans</AppText>
    <LoadState loading={official.isLoading || owned.isLoading} error={official.error || owned.error} retry={() => { void official.refetch(); void owned.refetch(); }} />
    <View style={{ gap: 14 }}>{available.map((plan) => <PlanCard key={plan.id} plan={plan} />)}</View>
    {official.isSuccess && owned.isSuccess && !available.length && <AppText color="muted">No other plans available yet. Your custom plans will appear here.</AppText>}
  </AppScreen>;
}
