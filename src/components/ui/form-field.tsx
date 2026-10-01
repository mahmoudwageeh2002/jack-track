import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { AppText } from './app-text';

type Props = TextInputProps & { label: string; error?: string };

export function FormField({ label, error, style, ...props }: Props) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.wrapper}>
      <AppText variant="label" weight="semibold">{label}</AppText>
      <TextInput
        {...props}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        style={[
          styles.input,
          { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border, color: colors.text },
          style,
        ]}
      />
      {error ? <AppText variant="small" color="danger">{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 7 },
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
  },
});
