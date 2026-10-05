import { Linking, Platform } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { GlassButton } from '@/components/ui/glass-button';
import { ProfileSheet } from '@/features/profile/components/profile-sheet';
import { checkConnectivity } from '../data/connectivity';

export function OfflineUnavailableSheet({ action, onClose }: { action: string; onClose: () => void }) {
  return <ProfileSheet title="Not available offline" onClose={onClose}>
    <AppText color="muted">{action} needs an internet connection. Turn on Wi-Fi or mobile data, then try again.</AppText>
    <AppText color="muted">You can still view your saved plan and record workouts offline.</AppText>
    {Platform.OS !== 'web' && <GlassButton label="Open settings" onPress={() => { void Linking.openSettings().catch(() => {}); }} />}
    <GlassButton label="Check connection" variant="secondary" onPress={() => { void checkConnectivity().catch(() => {}); }} />
    <GlassButton label="Got it" variant="ghost" onPress={onClose} />
  </ProfileSheet>;
}
