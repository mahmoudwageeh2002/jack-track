import { darkColors, lightColors } from './colors';

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 16,
  xl: 22,
  round: 999,
} as const;

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const fontSize = {
  caption: 10,
  small: 12,
  label: 13,
  body: 15,
  button: 16,
  subtitle: 20,
  title: 26,
  hero: 30,
} as const;

export const themes = { light: lightColors, dark: darkColors } as const;
export { darkColors, lightColors } from './colors';
