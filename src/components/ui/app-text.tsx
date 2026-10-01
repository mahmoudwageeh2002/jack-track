import type { PropsWithChildren } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { fontFamily, fontSize } from '@/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type Variant = 'caption' | 'small' | 'label' | 'body' | 'button' | 'subtitle' | 'title' | 'hero';

type Props = TextProps & PropsWithChildren<{
  variant?: Variant;
  color?: 'default' | 'muted' | 'primary' | 'inverse' | 'danger';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}>;

const lineHeights: Record<Variant, number> = {
  caption: 13,
  small: 16,
  label: 17,
  body: 20,
  button: 20,
  subtitle: 25,
  title: 33,
  hero: 38,
};

export function AppText({
  children,
  variant = 'body',
  color = 'default',
  weight = 'regular',
  style,
  ...props
}: Props) {
  const { colors } = useAppTheme();
  const colorMap = {
    default: colors.text,
    muted: colors.textMuted,
    primary: colors.primary,
    inverse: colors.white,
    danger: colors.danger,
  };
  const textStyle: TextStyle = {
    color: colorMap[color],
    fontFamily: fontFamily[weight],
    fontSize: fontSize[variant],
    lineHeight: lineHeights[variant],
  };

  return <Text {...props} style={[textStyle, style]}>{children}</Text>;
}
