import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { createConnectivityMonitor } from '../domain/connectivity-monitor';

export const useOfflineState = create<{
  ready: boolean; online: boolean; offlineEpoch: number; pending: number; syncing: boolean;
  syncError: string | null; storageError: string | null;
  blockedAction: string | null;
}>(() => ({ ready: false, online: true, offlineEpoch: 0, pending: 0, syncing: false, syncError: null, storageError: null, blockedAction: null }));

let monitor: ReturnType<typeof createConnectivityMonitor> | undefined;

export function watchConnectivity() {
  const current = createConnectivityMonitor({
    initialOnline: useOfflineState.getState().online,
    async probe(signal) {
      // Same lightweight endpoint used by NetInfo; bypass caches on reconnect.
      const response = await fetch(`https://clients3.google.com/generate_204?t=${Date.now()}`, { signal, cache: 'no-store' });
      return response.status === 204;
    },
    onChange(online) {
      useOfflineState.setState((previous) => ({ ready: true, online, offlineEpoch: previous.offlineEpoch + (previous.online && !online ? 1 : 0), blockedAction: online ? null : previous.blockedAction }));
      onlineManager.setOnline(online);
    },
  });
  monitor = current;
  current.setActive(AppState.currentState === null || AppState.currentState === 'active');
  const unsubscribe = NetInfo.addEventListener((state) => {
    current.networkChanged(state.isConnected);
  });
  const subscription = AppState.addEventListener('change', (state) => current.setActive(state === 'active'));
  return () => {
    unsubscribe();
    subscription.remove();
    current.dispose();
    if (monitor === current) monitor = undefined;
  };
}

export async function checkConnectivity() { return monitor ? monitor.check() : false; }

export function runOnlineAction(action: string, run: () => void) {
  if (!useOfflineState.getState().online) {
    useOfflineState.setState({ blockedAction: action });
    return;
  }
  run();
}

export function requireOnline() {
  if (!useOfflineState.getState().online) throw new Error('Connect to the internet to create or update your account and plan. Your saved workouts are still available offline.');
}
