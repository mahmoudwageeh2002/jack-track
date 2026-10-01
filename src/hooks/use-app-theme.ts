import { useColorScheme } from 'react-native';

import { themes } from '@/theme';

export function useAppTheme() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  return { colors: themes[scheme], isDark: scheme === 'dark', scheme };
}
