import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import { radius, spacing } from '@/theme';
import { AppText } from './app-text';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: ReactNode;
  compact?: boolean;
};

export function GlassButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  icon,
  compact,
}: Props) {
  const { colors, scheme } = useAppTheme();
  const useGlass = Platform.OS === 'ios' && isGlassEffectAPIAvailable();
  const isPrimary = variant === 'primary';
  const content = (
    <View style={[styles.content, compact && styles.compact]}>
      {loading ? <ActivityIndicator color={isPrimary ? colors.white : colors.primary} /> : icon}
      {!loading && (
        <AppText
          variant={compact ? 'label' : 'button'}
          weight="semibold"
          color={isPrimary ? 'inverse' : variant === 'danger' ? 'danger' : 'default'}>
          {label}
        </AppText>
      )}
    </View>
  );
  const backgroundColor = variant === 'primary'
    ? colors.primary
    : variant === 'danger'
      ? colors.surface
      : variant === 'secondary'
        ? colors.softMint
        : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, compact && styles.compactButton, (disabled || loading) && { opacity: 0.55 }, pressed && styles.pressed]}>
      {useGlass ? (
        <GlassView
          colorScheme={scheme as 'light' | 'dark'}
          glassEffectStyle="regular"
          isInteractive
          tintColor={variant === 'primary' ? colors.primary : colors.softMint}
          style={styles.glass}>
          {content}
        </GlassView>
      ) : (
        <View style={[styles.fallback, { backgroundColor, borderColor: colors.border }]}>{content}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { minHeight: 54, borderRadius: radius.lg, overflow: 'hidden' },
  compactButton: { minHeight: 34, alignSelf: 'flex-start' },
  pressed: { transform: [{ scale: 0.985 }] },
  glass: { flex: 1, borderRadius: radius.lg, overflow: 'hidden' },
  fallback: { flex: 1, borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  content: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { minHeight: 32, paddingHorizontal: spacing.sm },
});
