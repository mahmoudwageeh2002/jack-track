import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { useAppSelector } from '@/core/store';
import { useAppTheme } from '@/hooks/use-app-theme';
import { spacing } from '@/theme';

export default function SplashRoute() {
  const { colors } = useAppTheme();
  const { initialized, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!initialized) return;
    const timer = setTimeout(() => router.replace(user ? '/(tabs)' : '/login'), 2300);
    return () => clearTimeout(timer);
  }, [initialized, user]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.orbTop, { backgroundColor: colors.softMint }]} />
      <View style={[styles.orbBottom, { backgroundColor: colors.surfaceMuted }]} />
      <View style={styles.center}>
        <LottieView autoPlay loop source={require('@/assets/animations/jack-track-animated.json')} style={styles.animation} />
        <AppText variant="hero" weight="bold" style={styles.wordmark}>JACK TRACK</AppText>
        <AppText color="muted" style={styles.tagline}>Track every rep. Build every streak.</AppText>
        <View style={[styles.accent, { backgroundColor: colors.primary }]} />
      </View>
      <View style={styles.footer}>
        <AppText variant="caption" color="muted" weight="semibold">GET STRONGER. STAY CONSISTENT.</AppText>
        <View style={styles.dots}>
          {[0, 1, 2].map((dot) => (
            <View key={dot} style={[styles.dot, { backgroundColor: dot === 0 ? colors.primary : colors.border }, dot === 0 && styles.activeDot]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orbTop: { position: 'absolute', width: 310, height: 310, borderRadius: 155, right: -125, top: -120 },
  orbBottom: { position: 'absolute', width: 360, height: 360, borderRadius: 180, left: -190, bottom: -166 },
  center: { alignItems: 'center', gap: spacing.sm, marginTop: -18 },
  animation: { width: 156, height: 156, marginBottom: -14 },
  wordmark: { letterSpacing: 0.3 },
  tagline: { fontSize: 14 },
  accent: { width: 42, height: 5, borderRadius: 3, marginTop: 2 },
  footer: { position: 'absolute', bottom: 62, alignItems: 'center', gap: spacing.sm },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  activeDot: { width: 9, height: 9, borderRadius: 5 },
});
