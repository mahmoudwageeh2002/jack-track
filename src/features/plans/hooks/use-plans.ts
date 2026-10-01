import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { container } from '@/app/container';
import { useAppSelector } from '@/core/store';

export function usePlans() {
  const uid = useAppSelector((state) => state.auth.user?.uid);
  return useQuery({ queryKey: ['plans', uid], enabled: !!uid, queryFn: () => container.planRepository.getPublicPlans() });
}

export function useOwnedPlans() {
  const uid = useAppSelector((state) => state.auth.user?.uid);
  return useQuery({ queryKey: ['owned-plans', uid], enabled: !!uid, queryFn: () => container.planRepository.getOwnedPlans(uid!) });
}

export function useActivePlan() {
  const uid = useAppSelector((state) => state.auth.user?.uid);
  return useQuery({ queryKey: ['active-plan', uid], enabled: !!uid, queryFn: () => container.planRepository.getActivePlan(uid!) });
}

export function useExercises() {
  const uid = useAppSelector((state) => state.auth.user?.uid);
  return useQuery({ queryKey: ['exercises', uid], enabled: !!uid, queryFn: () => container.exerciseRepository.getAll() });
}

export function useRefreshAccountOnFocus() {
  const client = useQueryClient();
  useFocusEffect(useCallback(() => {
    void client.invalidateQueries({ predicate: ({ queryKey }) => ['active-plan', 'owned-plans', 'plans', 'sessions', 'profile'].includes(String(queryKey[0])) });
  }, [client]));
}
