import { Check, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { useAppTheme } from '@/hooks/use-app-theme';
import { radius, spacing } from '@/theme';
import type { WorkoutSet } from '../domain/workout';

type Props = { item: WorkoutSet; active?: boolean; onEdit: () => void; onToggle: () => void };

export function SetRow({ item, active, onEdit, onToggle }: Props) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.row, { backgroundColor: active ? colors.softMint : colors.surfaceMuted }]}>
      <AppText variant="label" color="muted" weight="semibold">{item.setNumber}</AppText>
      <Metric value={item.weight || item.reps ? `${item.weight} kg` : '— kg'} label="Weight" />
      <Metric value={item.reps ? `${item.reps} reps` : '— reps'} label="Reps" />
      <Pressable
        accessibilityLabel={item.completed ? 'Mark set incomplete' : 'Edit set'}
        onPress={item.completed ? onToggle : onEdit}
        style={[styles.action, { backgroundColor: item.completed ? colors.primary : colors.surface }]}>
        {item.completed ? <Check size={15} color={colors.white} strokeWidth={3} /> : active ? <AppText variant="small" color="primary" weight="semibold">Edit</AppText> : <Plus size={14} color={colors.primary} />}
      </Pressable>
    </View>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <AppText weight="semibold">{value}</AppText>
      <AppText variant="caption" color="muted">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 74, borderRadius: radius.lg, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metric: { flex: 1, gap: 1 },
  action: { width: 48, minHeight: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
