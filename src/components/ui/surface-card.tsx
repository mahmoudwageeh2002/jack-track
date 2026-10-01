import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import { radius, spacing } from '@/theme';

type Props = ViewProps & PropsWithChildren<{ tone?: 'default' | 'muted' | 'dark' | 'mint' }>;

export function SurfaceCard({ children, tone = 'default', style, ...props }: Props) {
  const { colors, isDark } = useAppTheme();
  const backgrounds = {
    default: colors.surface,
    muted: colors.surfaceMuted,
    dark: isDark ? colors.surface : colors.evergreen,
    mint: colors.softMint,
  };
  return (
    <View
      {...props}
      style={[styles.card, { backgroundColor: backgrounds[tone], borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
});
