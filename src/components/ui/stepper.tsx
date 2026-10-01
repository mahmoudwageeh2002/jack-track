import { Minus, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/hooks/use-app-theme';
import { AppText } from './app-text';

export function Stepper({ label, value, onChange, min = 1, max = 20, disabled = false }: {
  label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  return <View style={styles.row}>
    <AppText weight="semibold" style={{ flex: 1 }}>{label}</AppText>
    <Pressable accessibilityRole="button" accessibilityLabel={'Decrease ' + label} disabled={disabled || value <= min} onPress={() => onChange(value - 1)} style={[styles.button, { backgroundColor: colors.surfaceMuted, opacity: disabled || value <= min ? 0.4 : 1 }]}><Minus size={18} color={colors.primary} /></Pressable>
    <AppText accessibilityLiveRegion="polite" weight="bold" style={styles.number}>{value}</AppText>
    <Pressable accessibilityRole="button" accessibilityLabel={'Increase ' + label} disabled={disabled || value >= max} onPress={() => onChange(value + 1)} style={[styles.button, { backgroundColor: colors.surfaceMuted, opacity: disabled || value >= max ? 0.4 : 1 }]}><Plus size={18} color={colors.primary} /></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  button: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  number: { minWidth: 28, textAlign: 'center' },
});
