import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { AppText } from './app-text';

type Props = TextInputProps & { label: string; error?: string };

export function FormField({ label, error, style, secureTextEntry, ...props }: Props) {
  const { colors } = useAppTheme();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const VisibilityIcon = passwordVisible ? EyeOff : Eye;
  return (
    <View style={styles.wrapper}>
      <AppText variant="label" weight="semibold">{label}</AppText>
      <View style={styles.inputContainer}>
        <TextInput
          autoCapitalize={secureTextEntry ? 'none' : undefined}
          autoCorrect={secureTextEntry ? false : undefined}
          {...props}
          secureTextEntry={secureTextEntry && !passwordVisible}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          style={[
            styles.input,
            { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border, color: colors.text },
            style,
            secureTextEntry && styles.passwordInput,
          ]}
        />
        {secureTextEntry && <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${passwordVisible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          disabled={props.editable === false}
          onPress={() => setPasswordVisible((visible) => !visible)}
          style={({ pressed }) => [styles.visibilityButton, { opacity: pressed || props.editable === false ? 0.5 : 1 }]}>
          <VisibilityIcon size={21} color={colors.textMuted} />
        </Pressable>}
      </View>
      {error ? <AppText variant="small" color="danger">{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 7 },
  inputContainer: { position: 'relative' },
  passwordInput: { paddingRight: 56 },
  visibilityButton: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
  },
});
