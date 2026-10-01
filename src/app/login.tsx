import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { z } from 'zod';

import { container } from '@/app/container';
import { BrandMark } from '@/components/brand/brand-mark';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { FormField } from '@/components/ui/form-field';
import { GlassButton } from '@/components/ui/glass-button';
import { useAppDispatch } from '@/core/store';
import { authStateChanged, toAuthUser } from '@/features/auth/store/auth-slice';
import { useAppTheme } from '@/hooks/use-app-theme';
import { spacing } from '@/theme';

const schema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type LoginForm = z.infer<typeof schema>;

export default function LoginScreen() {
  const { colors } = useAppTheme();
  const dispatch = useAppDispatch();
  const { control, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async (values) => {
    try {
      const user = await container.authRepository.logIn(values.email, values.password);
      dispatch(authStateChanged(toAuthUser(user)));
      Toast.show({ type: 'success', text1: 'Welcome back' });
      router.replace('/(tabs)');
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not log in', text2: error instanceof Error ? error.message : 'Try again.' });
    }
  });

  const resetPassword = async () => {
    const email = getValues('email');
    if (!email) {
      Toast.show({ type: 'error', text1: 'Enter your email first' });
      return;
    }
    try {
      await container.authRepository.resetPassword(email);
      Toast.show({ type: 'success', text1: 'Reset email sent' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Reset failed', text2: error instanceof Error ? error.message : undefined });
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppScreen contentStyle={styles.content} scrollProps={{ contentContainerStyle: styles.scroll }}>
        <View style={styles.brand}><BrandMark /></View>
        <View style={styles.intro}>
          <AppText variant="hero" weight="bold">Welcome back</AppText>
          <AppText color="muted">Track your training, stay consistent, get stronger.</AppText>
        </View>
        <View style={styles.form}>
          <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (
            <FormField label="Email" placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.email?.message} />
          )} />
          <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => (
            <FormField label="Password" placeholder="••••••••" secureTextEntry onBlur={onBlur} onChangeText={onChange} value={value} error={errors.password?.message} />
          )} />
          <Pressable onPress={resetPassword}><AppText color="primary" variant="label" weight="semibold" style={styles.right}>Forgot password?</AppText></Pressable>
          <GlassButton label="Log in" loading={isSubmitting} onPress={submit} />
        </View>
        <View style={styles.cta}>
          <AppText variant="label" color="muted">New to Jack Track?</AppText>
          <Pressable onPress={() => router.push('/register')}><AppText variant="label" color="primary" weight="semibold">Create account</AppText></Pressable>
        </View>
      </AppScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { gap: spacing.md },
  brand: { height: 140, alignItems: 'center', justifyContent: 'center' },
  intro: { gap: 6 },
  form: { gap: 14 },
  right: { textAlign: 'right' },
  divider: { height: 84, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  line: { width: 120, height: 1 },
  cta: { marginTop: 'auto', minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
});
