import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
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
  name: z.string().min(2, 'Enter your full name'),
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters'),
  confirmPassword: z.string(),
  accepted: z.boolean().refine(Boolean, 'Accept the terms to continue'),
}).refine((value) => value.password === value.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
});
type RegisterForm = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { colors } = useAppTheme();
  const dispatch = useAppDispatch();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', accepted: false },
  });

  const submit = handleSubmit(async (values) => {
    try {
      const user = await container.authRepository.register(values);
      dispatch(authStateChanged(toAuthUser(user)));
      Toast.show({ type: 'success', text1: 'Account created', text2: 'Welcome to Jack Track.' });
      router.replace('/(tabs)');
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not create account', text2: error instanceof Error ? error.message : 'Try again.' });
    }
  });

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppScreen contentStyle={styles.content}>
        <View style={styles.brand}><BrandMark size={64} /></View>
        <View style={styles.intro}>
          <AppText variant="title" weight="bold">Create your account</AppText>
          <AppText color="muted">Your training history starts here.</AppText>
        </View>
        <View style={styles.form}>
          <ControlledField control={control} name="name" label="Full name" placeholder="Mahmoud Wageeh" error={errors.name?.message} />
          <ControlledField control={control} name="email" label="Email" placeholder="you@example.com" error={errors.email?.message} autoCapitalize="none" keyboardType="email-address" />
          <ControlledField control={control} name="password" label="Password" placeholder="••••••••" error={errors.password?.message} secureTextEntry />
          <ControlledField control={control} name="confirmPassword" label="Confirm password" placeholder="••••••••" error={errors.confirmPassword?.message} secureTextEntry />
          <Controller control={control} name="accepted" render={({ field: { value, onChange } }) => (
            <View>
              <Pressable style={styles.terms} onPress={() => onChange(!value)}>
                <View style={[styles.checkbox, { borderColor: value ? colors.primary : colors.border, backgroundColor: value ? colors.softMint : colors.surface }]}>
                  {value ? <Check size={13} color={colors.primary} strokeWidth={3} /> : null}
                </View>
                <AppText variant="small" color="muted">I agree to the Terms & Privacy Policy</AppText>
              </Pressable>
              {errors.accepted ? <AppText variant="small" color="danger">{errors.accepted.message}</AppText> : null}
            </View>
          )} />
          <GlassButton label="Create account" loading={isSubmitting} onPress={submit} />
        </View>
        <View style={styles.cta}>
          <AppText variant="label" color="muted">Already have an account?</AppText>
          <Pressable onPress={() => router.back()}><AppText variant="label" color="primary" weight="semibold">Log in</AppText></Pressable>
        </View>
      </AppScreen>
    </KeyboardAvoidingView>
  );
}

type ControlledProps = { control: ReturnType<typeof useForm<RegisterForm>>['control']; name: 'name' | 'email' | 'password' | 'confirmPassword'; label: string; placeholder: string; error?: string; secureTextEntry?: boolean; autoCapitalize?: 'none'; keyboardType?: 'email-address' };

function ControlledField({ control, name, ...props }: ControlledProps) {
  return <Controller control={control} name={name} render={({ field: { onChange, onBlur, value } }) => (
    <FormField {...props} onBlur={onBlur} onChangeText={onChange} value={String(value)} />
  )} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: spacing.md },
  brand: { height: 100, alignItems: 'center', justifyContent: 'center' },
  intro: { gap: 6 },
  form: { gap: spacing.sm },
  terms: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  checkbox: { width: 18, height: 18, borderWidth: 1, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  cta: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
});
