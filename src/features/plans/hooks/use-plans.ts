import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { container } from '@/app/container';
import { useAppSelector } from '@/core/store';
import { cachedResource } from '@/features/offline/data/cached-resource';
import { useOfflineState } from '@/features/offline/data/connectivity';

export function usePlans() {
  const uid = useAppSelector((state) => state.auth.user?.uid);
  const ready = useOfflineState((state) => state.ready);
  return useQuery({ queryKey: ['plans', uid], enabled: !!uid && ready, networkMode: 'always', queryFn: () => cachedResource(uid!, 'plans', () => container.planRepository.getPublicPlans(), []) });
}

export function useOwnedPlans() {
  const uid = useAppSelector((state) => state.auth.user?.uid);
  const ready = useOfflineState((state) => state.ready);
  return useQuery({ queryKey: ['owned-plans', uid], enabled: !!uid && ready, networkMode: 'always', queryFn: () => cachedResource(uid!, 'owned-plans', () => container.planRepository.getOwnedPlans(uid!), []) });
}

export function useActivePlan() {
  const uid = useAppSelector((state) => state.auth.user?.uid);
  const ready = useOfflineState((state) => state.ready);
  return useQuery({ queryKey: ['active-plan', uid], enabled: !!uid && ready, networkMode: 'always', queryFn: () => cachedResource(uid!, 'active-plan', () => container.planRepository.getActivePlan(uid!), null) });
}

export function useExercises() {
  const uid = useAppSelector((state) => state.auth.user?.uid);
  const ready = useOfflineState((state) => state.ready);
  return useQuery({ queryKey: ['exercises', uid], enabled: !!uid && ready, networkMode: 'always', queryFn: () => cachedResource(uid!, 'exercises', () => container.exerciseRepository.getAll(), []) });
}

export function useRefreshAccountOnFocus() {
  const client = useQueryClient();
  useFocusEffect(useCallback(() => {
    void client.invalidateQueries({ predicate: ({ queryKey }) => ['active-plan', 'owned-plans', 'plans', 'sessions', 'profile', 'measurements'].includes(String(queryKey[0])) });
  }, [client]));
}
