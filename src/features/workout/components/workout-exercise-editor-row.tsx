import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Stepper } from '@/components/ui/stepper';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { WorkoutExerciseEdit } from '../domain/edit-workout';

export type EditorRowProps = {
  item: WorkoutExerciseEdit;
  name: string;
  index: number;
  count: number;
  minimumSets: number;
  disabled?: boolean;
  onDrag?: () => void;
  onMove: (from: number, to: number) => void;
  onSetsChange: (sets: number) => void;
  onRemove: () => void;
};

export function WorkoutExerciseEditorRow({ item, name, index, count, minimumSets, disabled, onDrag, onMove, onSetsChange, onRemove }: EditorRowProps) {
  const { colors } = useAppTheme();
  return <SurfaceCard style={styles.card}>
    <View style={styles.row}>
      <AppText color="primary" weight="bold">{index + 1}</AppText>
      <AppText weight="semibold" style={styles.name}>{name}</AppText>
      {onDrag && <Pressable onLongPress={onDrag} delayLongPress={250} disabled={disabled}
        accessibilityRole="button" accessibilityLabel={`Reorder ${name}`} accessibilityHint="Hold and drag up or down. You can also use the move buttons."
        style={styles.button}><GripVertical color={colors.textMuted} size={24} /></Pressable>}
    </View>
    <Stepper label="Sets" value={item.sets} min={minimumSets} max={Math.max(20, item.sets)} disabled={disabled} onChange={onSetsChange} />
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Move ${name} up`} disabled={disabled || index === 0}
        onPress={() => onMove(index, index - 1)} style={[styles.button, (disabled || index === 0) && styles.disabled]}><ArrowUp size={20} color={colors.primary} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Move ${name} down`} disabled={disabled || index === count - 1}
        onPress={() => onMove(index, index + 1)} style={[styles.button, (disabled || index === count - 1) && styles.disabled]}><ArrowDown size={20} color={colors.primary} /></Pressable>
      <View style={styles.name} />
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${name}`} disabled={disabled || count <= 1}
        onPress={onRemove} style={[styles.remove, (disabled || count <= 1) && styles.disabled]}>
        <Trash2 size={18} color={colors.danger} /><AppText variant="small" color="danger">Remove</AppText>
      </Pressable>
    </View>
  </SurfaceCard>;
}

const styles = StyleSheet.create({
  card: { gap: 8, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { flex: 1 },
  button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  remove: { minHeight: 44, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  disabled: { opacity: 0.35 },
});
