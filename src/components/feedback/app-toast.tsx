import type { BaseToastProps } from 'react-native-toast-message';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';

import { darkColors, lightColors } from '@/theme';

const shared = {
  borderLeftWidth: 0,
  borderRadius: 16,
  minHeight: 60,
  backgroundColor: lightColors.evergreen,
};

const config = {
  success: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={shared}
      text1Style={{ color: lightColors.white, fontSize: 14, fontWeight: '700' }}
      text2Style={{ color: darkColors.textMuted, fontSize: 12 }}
    />
  ),
  error: (props: BaseToastProps) => (
    <ErrorToast
      {...props}
      style={{ ...shared, backgroundColor: '#4A1720' }}
      text1Style={{ color: lightColors.white, fontSize: 14, fontWeight: '700' }}
      text2Style={{ color: '#FFD9DE', fontSize: 12 }}
    />
  ),
};

export function AppToast() {
  return <Toast config={config} topOffset={60} />;
}
