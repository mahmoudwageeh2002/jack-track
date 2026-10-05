import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { collection, doc } from 'firebase/firestore';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { container } from '@/app/container';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { FormField } from '@/components/ui/form-field';
import { GlassButton } from '@/components/ui/glass-button';
import { LoadState } from '@/components/ui/load-state';
import { Stepper } from '@/components/ui/stepper';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useAppSelector } from '@/core/store';
import { requireDatabase } from '@/core/utils/firestore-request';
import { ExerciseCard } from '@/features/exercises/components/exercise-card';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { PlanDay } from '../domain/plan';
import { weekdays } from '../domain/schedule';
import { useExercises } from '../hooks/use-plans';
import { useOfflineState } from '@/features/offline/data/connectivity';

const emptyDay = (index: number): PlanDay => ({ id: 'day-' + (index + 1), name: 'Day ' + (index + 1), order: index + 1, exercises: [] });

export function CreatePlanScreen() {
  const online = useOfflineState((state) => state.online);
  useFocusEffect(useCallback(() => {
    if (!online) {
      useOfflineState.setState({ blockedAction: 'Creating a plan' });
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    }
  }, [online]));
  const { colors } = useAppTheme();
  const user = useAppSelector((state) => state.auth.user);
  const client = useQueryClient();
  const catalog = useExercises();
  const [name, setName] = useState('');
  const [count, setCount] = useState(3);
  const [days, setDays] = useState<PlanDay[]>(() => Array.from({ length: 3 }, (_, index) => emptyDay(index)));
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState('');
  const [trainingDays, setTrainingDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const planId = useRef<string | null>(null);
  const day = days[step - 1];
  const review = step === count + 1;
  const exercises = useMemo(() => catalog.data ?? [], [catalog.data]);
  const byId = useMemo(() => Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise])), [exercises]);
  const filtered = exercises.filter((exercise) =>
    !day?.exercises.some((move) => move.exerciseId === exercise.id) &&
    (exercise.name + ' ' + exercise.primaryMuscle + ' ' + exercise.equipment).toLowerCase().includes(search.trim().toLowerCase()));
  const changeDay = (update: Partial<PlanDay>) => setDays((current) => current.map((item, index) => index === step - 1 ? { ...item, ...update } : item));
  const next = () => { setSearch(''); setStep((current) => current + 1); };

  const save = async () => {
    if (!user || saving || trainingDays.length !== count || !name.trim() || days.some((item) => !item.exercises.length || !item.name.trim())) return;
    setSaving(true);
    try {
      planId.current ??= doc(collection(requireDatabase(), 'plans')).id;
      const scheduled = [...trainingDays].sort((a, b) => a - b);
      await container.planRepository.createCustomPlan(user.uid, {
        id: planId.current, name: name.trim(), description: count + ' training days per week. Built by you.',
        level: 'beginner', goal: 'muscle_gain', isOfficial: false, isCustom: true, sourcePlanId: null, createdAt: new Date(),
        days: days.map((item, index) => ({ ...item, name: item.name.trim(), weekday: scheduled[index] })),
        restDays: weekdays.map((_, index) => index).filter((index) => !scheduled.includes(index)),
      });
      await Promise.all([
        client.invalidateQueries({ queryKey: ['owned-plans', user.uid] }),
        client.invalidateQueries({ queryKey: ['active-plan', user.uid] }),
      ]);
      Toast.show({ type: 'success', text1: 'Your plan is ready', text2: 'Saved to your profile and selected for training.' });
      router.replace('/(tabs)/plan');
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Plan save not confirmed', text2: error instanceof Error ? error.message : 'Please try again.' });
    } finally { setSaving(false); }
  };

  if (!online) return null;
  if (!user) return <AppScreen><AppText>Log in to build your workout plan.</AppText><GlassButton label="Log in" onPress={() => router.replace('/login')} /></AppScreen>;
  return <AppScreen>
    <View style={styles.header}><AppText variant="title" weight="bold" style={{ flex: 1 }}>Build your plan</AppText><GlassButton compact label="Close" variant="ghost" disabled={saving} onPress={() => Alert.alert('Leave this plan?', 'Your unsaved changes will be lost.', [{ text: 'Keep editing', style: 'cancel' }, { text: 'Leave', style: 'destructive', onPress: () => router.back() }])} /></View>
    <AppText color="muted">{step === 0 ? 'Start with your training week.' : review ? 'Choose your training days. The remaining days are rest days.' : 'Build day ' + step + ' of ' + count}</AppText>
    <View style={styles.progress}>{Array.from({ length: count + 2 }, (_, index) => <View key={index} style={[styles.dot, { backgroundColor: index <= step ? colors.primary : colors.border }]} />)}</View>
    <View style={styles.section} pointerEvents={saving ? 'none' : 'auto'}>
      {step === 0 && <>
        <FormField label="Plan name" placeholder="Give your plan a name" value={name} maxLength={80} onChangeText={setName} />
        <SurfaceCard><Stepper label="Training days per week" value={count} max={7} onChange={(value) => { setCount(value); setDays((current) => Array.from({ length: value }, (_, index) => current[index] ?? emptyDay(index))); setTrainingDays([]); }} /></SurfaceCard>
        <AppText color="muted">{7 - count} rest days · You’ll choose the weekdays at the end.</AppText>
      </>}
      {day && !review && <>
        <FormField label="Day name" value={day.name} maxLength={60} onChangeText={(value) => changeDay({ name: value })} />
        <AppText variant="subtitle" weight="bold">Your exercises · {day.exercises.length}</AppText>
        {!day.exercises.length && <SurfaceCard tone="muted"><AppText color="muted">Choose exercises below to build this day.</AppText></SurfaceCard>}
        {day.exercises.map((move) => byId[move.exerciseId] && <ExerciseCard key={move.exerciseId} exercise={byId[move.exerciseId]} sets={move.sets} onSetsChange={(sets) => changeDay({ exercises: day.exercises.map((item) => item.exerciseId === move.exerciseId ? { ...item, sets } : item) })} onRemove={() => changeDay({ exercises: day.exercises.filter((item) => item.exerciseId !== move.exerciseId) })} />)}
        <AppText variant="subtitle" weight="bold">Exercise library</AppText>
        <FormField label="Search exercises" placeholder="Name, muscle or equipment" value={search} onChangeText={setSearch} autoCapitalize="none" />
        <AppText variant="small" color="muted">Tap an exercise to add it. Hold for a closer look.</AppText>
        <LoadState loading={catalog.isLoading} error={catalog.error} retry={() => { void catalog.refetch(); }} />
        {catalog.isSuccess && !exercises.length && <AppText color="muted">The exercise library is empty. Please check back once exercises have been added.</AppText>}
        {catalog.isSuccess && !!exercises.length && !filtered.length && <AppText color="muted">No matching exercises left. Try another search.</AppText>}
        {filtered.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} onAdd={() => changeDay({ exercises: [...day.exercises, { exerciseId: exercise.id, order: day.exercises.length + 1, sets: 3 }] })} />)}
      </>}
      {review && <>
        <AppText weight="bold">{trainingDays.length} of {count} training days selected</AppText>
        {weekdays.map((label, index) => {
          const active = trainingDays.includes(index);
          const position = [...trainingDays].sort((a, b) => a - b).indexOf(index);
          return <Pressable key={label} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => setTrainingDays((current) => active ? current.filter((value) => value !== index) : current.length < count ? [...current, index] : current)}>
            <SurfaceCard tone={active ? 'mint' : 'default'} style={styles.header}><AppText weight="semibold" style={{ flex: 1 }}>{label}</AppText><AppText color={active ? 'primary' : 'muted'}>{active ? days[position].name : 'Rest'}</AppText></SurfaceCard>
          </Pressable>;
        })}
        <AppText variant="subtitle" weight="bold">{name}</AppText>
        {days.map((item) => <SurfaceCard key={item.id}><AppText weight="semibold">{item.name}</AppText><AppText color="muted">{item.exercises.length} exercises · {item.exercises.reduce((sum, move) => sum + move.sets, 0)} sets</AppText></SurfaceCard>)}
      </>}
    </View>
    <View style={styles.section}>
      {step > 0 && <GlassButton label="Previous step" variant="secondary" disabled={saving} onPress={() => { setSearch(''); setStep(step - 1); }} />}
      {review ? <GlassButton label="Create and select plan" loading={saving} disabled={trainingDays.length !== count} onPress={save} /> : <GlassButton label={step === 0 ? 'Choose exercises' : step === count ? 'Choose training & rest days' : 'Next day'} disabled={step === 0 ? !name.trim() : !day?.exercises.length || !day.name.trim()} onPress={next} />}
    </View>
  </AppScreen>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  section: { gap: 14 },
  progress: { flexDirection: 'row', gap: 6 },
  dot: { flex: 1, height: 4, borderRadius: 3 },
});
