import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { GlassButton } from '@/components/ui/glass-button';
import { LoadState } from '@/components/ui/load-state';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useAppSelector } from '@/core/store';
import { saveWorkoutLocally, syncPendingWorkouts } from '@/features/offline/data/workout-sync';
import { ExerciseCard } from '@/features/exercises/components/exercise-card';
import { todaysPlanDay } from '@/features/plans/domain/schedule';
import { useActivePlan, useExercises } from '@/features/plans/hooks/use-plans';
import { EditSetModal } from '../components/edit-set-modal';
import { EditWorkoutModal } from '../components/edit-workout-modal';
import { SetRow } from '../components/set-row';
import type { WorkoutSet } from '../domain/workout';
import { useWorkoutHistory } from '../hooks/use-workout-history';
import { useWorkoutStore } from '../store/workout-store';
import { offlineEligibility } from '@/features/offline/domain/offline-eligibility';
import { runOnlineAction, useOfflineState } from '@/features/offline/data/connectivity';

export function WorkoutSessionScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const active = useActivePlan();
  const history = useWorkoutHistory();
  const catalog = useExercises();
  const online = useOfflineState((state) => state.online);
  const canTrain = offlineEligibility(user?.uid, active.data, catalog.data) === 'ready';
  const client = useQueryClient();
  const { session, readyForUid, start, updateSet, toggleSet, editExercises, reset, hydrate } = useWorkoutStore();
  const [editing, setEditing] = useState<{ exerciseId: string; name: string; set: WorkoutSet } | null>(null);
  const [editingWorkout, setEditingWorkout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const plan = active.data;
  const total = (history.data ?? []).filter((item) => item.planId === plan?.id).length;
  const draftDay = session && session.userId === user?.uid && session.planId === plan?.id ? plan?.days.find((item) => item.id === session.planDayId) : null;
  const day = draftDay ?? (plan ? todaysPlanDay(plan, total) : null);
  useEffect(() => {
    if (!saving && canTrain && user && readyForUid === user.uid && plan && day && history.isSuccess && catalog.isSuccess) start(user.uid, plan, day);
  }, [user, plan, day, history.isSuccess, catalog.isSuccess, readyForUid, saving, canTrain, start]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const byId = Object.fromEntries((catalog.data ?? []).map((exercise) => [exercise.id, exercise]));
  const ownedSession = session?.userId === user?.uid && session?.planId === plan?.id && session?.planDayId === day?.id ? session : null;
  const elapsed = ownedSession ? Math.max(0, Math.floor((now - ownedSession.startedAt.getTime()) / 1000)) : 0;
  const completed = ownedSession?.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.completed).length, 0) ?? 0;
  const setCount = ownedSession?.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0) ?? 0;

  const save = async () => {
    if (!ownedSession || !user || !completed || saving) return;
    setSaving(true);
    try {
      const savedHistory = await saveWorkoutLocally(user.uid, ownedSession);
      reset();
      // Navigate before invalidating: a new next-day draft should not start here.
      router.replace('/(tabs)');
      client.setQueryData(['sessions', user.uid], savedHistory);
      void hydrate(user.uid);
      void syncPendingWorkouts(user.uid);
      Toast.show({ type: 'success', text1: 'Workout saved on this device', text2: 'Your progress is updated. It syncs when you’re connected.' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Save not confirmed', text2: error instanceof Error ? error.message : 'Please try again.' });
    } finally { setSaving(false); }
  };
  const finish = () => completed < setCount
    ? Alert.alert('Finish this workout?', 'Only completed sets will count toward your training totals.', [{ text: 'Keep training', style: 'cancel' }, { text: 'Finish', onPress: save }])
    : void save();

  return <AppScreen>
    <GlassButton label="Back" compact variant="ghost" disabled={saving} onPress={() => router.back()} />
    <LoadState loading={active.isLoading || history.isLoading || catalog.isLoading} error={active.error || history.error || catalog.error} retry={() => { void active.refetch(); void history.refetch(); void catalog.refetch(); }} />
    {!online && !canTrain && <AppText color="muted">Connect once to sign in and download your plan and exercise instructions before training offline.</AppText>}
    {active.isSuccess && !plan && <><AppText>No selected plan yet.</AppText><GlassButton label="Create my workout" onPress={() => runOnlineAction('Creating a plan', () => router.replace('/create-plan'))} /></>}
    {plan && history.isSuccess && !day && <AppText>Today is a rest day. Your next workout is on your plan.</AppText>}
    {ownedSession && day && <>
      <AppText variant="title" weight="bold">{day.name}</AppText>
      <AppText color="primary">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')} elapsed · {completed}/{setCount} sets</AppText>
      <GlassButton label="Edit workout" variant="secondary" disabled={saving} onPress={() => setEditingWorkout(true)} />
      <View style={{ gap: 16 }} pointerEvents={saving ? 'none' : 'auto'}>
        {ownedSession.exercises.map((exercise) => <SurfaceCard key={exercise.exerciseId} style={{ gap: 10 }}>
          {byId[exercise.exerciseId] ? <ExerciseCard exercise={byId[exercise.exerciseId]} /> : <AppText>Exercise unavailable</AppText>}
          {exercise.sets.map((set) => <SetRow key={set.id} item={set} active={!set.completed} onEdit={() => setEditing({ exerciseId: exercise.exerciseId, name: byId[exercise.exerciseId]?.name ?? 'Exercise', set })} onToggle={() => toggleSet(exercise.exerciseId, set.id)} />)}
        </SurfaceCard>)}
      </View>
      <GlassButton label="Finish workout" loading={saving} disabled={!completed} onPress={finish} />
    </>}
    <EditSetModal key={editing?.set.id ?? 'closed'} item={editing?.set ?? null} exerciseName={editing?.name} onClose={() => setEditing(null)} onSave={(weight, reps) => { if (editing) updateSet(editing.exerciseId, editing.set.id, weight, reps); }} />
    {editingWorkout && ownedSession && <EditWorkoutModal key={ownedSession.id} session={ownedSession} catalog={catalog.data ?? []} onClose={() => setEditingWorkout(false)} onSave={(edits) => {
      try {
        editExercises(ownedSession.id, edits, (catalog.data ?? []).map((exercise) => exercise.id));
        setEditingWorkout(false);
      } catch (error) {
        Alert.alert('Could not update workout', error instanceof Error ? error.message : 'Please try again.');
      }
    }} />}
  </AppScreen>;
}
