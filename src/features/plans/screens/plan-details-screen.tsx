import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { View } from 'react-native';
import Toast from 'react-native-toast-message';

import { container } from '@/app/container';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { GlassButton } from '@/components/ui/glass-button';
import { LoadState } from '@/components/ui/load-state';
import { useAppSelector } from '@/core/store';
import { confirmed, requireDatabase } from '@/core/utils/firestore-request';
import { ExerciseCard } from '@/features/exercises/components/exercise-card';
import type { PlanDay } from '../domain/plan';
import { weekdays } from '../domain/schedule';
import { validateDays } from '../domain/validate-plan';
import { useActivePlan, useExercises } from '../hooks/use-plans';
import { requireOnline } from '@/features/offline/data/connectivity';
import { offlineStorage } from '@/features/offline/data/offline-storage';
import { cachedResource } from '@/features/offline/data/cached-resource';

export function PlanDetailsScreen() {
  const { id, active: activeParam } = useLocalSearchParams<{ id: string; active?: string }>();
  const user = useAppSelector((state) => state.auth.user);
  const client = useQueryClient();
  const active = useActivePlan();
  const selectedView = activeParam === 'true';
  const query = useQuery({ queryKey: ['plan', user?.uid, id], enabled: !!user && !!id && !selectedView, networkMode: 'always', queryFn: () => cachedResource(user!.uid, 'plan:' + id, () => container.planRepository.getPlan(id), null) });
  const catalog = useExercises();
  const plan = selectedView ? active.data : query.data;
  const [changes, setChanges] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const source = selectedView ? active : query;
  const byId = Object.fromEntries((catalog.data ?? []).map((exercise) => [exercise.id, exercise]));
  const days: PlanDay[] = plan?.days.map((day) => ({ ...day, exercises: day.exercises.map((move) => ({ ...move, sets: changes[day.id + ':' + move.exerciseId] ?? move.sets })) })) ?? [];

  const save = async () => {
    if (!plan || !user || saving) return;
    setSaving(true);
    try {
      requireOnline();
      validateDays(days);
      const sourceId = selectedView ? active.data?.sourcePlanId ?? plan.id : plan.id;
      // Legacy selected copies are still editable even if the template is gone.
      if (selectedView) {
        await confirmed(setDoc(doc(requireDatabase(), 'users', user.uid, 'plans', plan.id), { days }, { merge: true }));
        await offlineStorage.cache(user.uid, 'active-plan', { ...active.data, days });
      } else {
        await container.planRepository.selectPlan(user.uid, sourceId, days);
      }
      await client.invalidateQueries({ queryKey: ['active-plan', user.uid] });
      Toast.show({ type: 'success', text1: selectedView ? 'Sets updated' : 'Plan selected' });
      router.back();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Save not confirmed', text2: error instanceof Error ? error.message : 'Please try again.' });
    } finally { setSaving(false); }
  };

  return <AppScreen>
    <GlassButton compact label="Back" variant="ghost" onPress={() => router.back()} disabled={saving} />
    <LoadState loading={source.isLoading || catalog.isLoading} error={source.error || catalog.error} retry={() => { void source.refetch(); void catalog.refetch(); }} />
    {source.isSuccess && !plan && <AppText>This plan is no longer available.</AppText>}
    {plan && <>
      <AppText variant="title" weight="bold">{plan.name}</AppText>
      <AppText color="muted">{plan.description}</AppText>
      <AppText variant="small" color="muted">{days.length} training days · Tap to expand, hold to preview.</AppText>
      {days.map((day) => <View key={day.id} style={{ gap: 12 }}>
        <AppText variant="subtitle" weight="bold">{day.name}{day.weekday !== undefined ? ' · ' + weekdays[day.weekday] : ''}</AppText>
        {day.exercises.map((move) => byId[move.exerciseId] ? <ExerciseCard key={move.exerciseId} exercise={byId[move.exerciseId]} sets={move.sets} disabled={saving} onSetsChange={(sets) => setChanges((current) => ({ ...current, [day.id + ':' + move.exerciseId]: sets }))} /> : <AppText key={move.exerciseId} color="muted">Exercise unavailable · {move.sets} sets</AppText>)}
      </View>)}
      {!!plan.restDays?.length && <AppText color="muted">Rest: {plan.restDays.map((day) => weekdays[day]).join(', ')}</AppText>}
      <GlassButton label={selectedView ? 'Save set changes' : 'Select this plan'} loading={saving} disabled={!user || !days.length || (selectedView && !Object.keys(changes).length)} onPress={save} />
    </>}
  </AppScreen>;
}
