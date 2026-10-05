import { Pressable } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { useAppSelector } from '@/core/store';
import { useAppTheme } from '@/hooks/use-app-theme';
import { checkConnectivity, useOfflineState } from '../data/connectivity';
import { syncPendingWorkouts } from '../data/workout-sync';

export function OfflineStatus() {
  const uid = useAppSelector((state) => state.auth.user?.uid);
  const { colors } = useAppTheme();
  const { ready, online, pending, syncing, storageError, syncError } = useOfflineState();
  if (!ready || (online && !pending && !storageError)) return null;
  const message = storageError ?? (syncing ? `Syncing ${pending} saved workout${pending === 1 ? '' : 's'}…`
    : !online ? `Offline · ${pending ? `${pending} workout${pending === 1 ? '' : 's'} saved on this device` : 'Using workouts saved on this device'}`
    : syncError ? `${pending} workout${pending === 1 ? '' : 's'} saved on this device · Tap to retry sync`
    : `${pending} workout${pending === 1 ? '' : 's'} waiting to sync`);
  return <Pressable accessibilityRole="button" accessibilityLabel={message} onPress={() => {
    void checkConnectivity().then((connected) => { if (connected && uid) return syncPendingWorkouts(uid); }).catch(() => {});
  }}
    style={{ padding: 12, borderRadius: 14, backgroundColor: colors.surfaceMuted }}>
    <AppText variant="small" color={storageError ? 'danger' : 'muted'}>{message}</AppText>
  </Pressable>;
}
