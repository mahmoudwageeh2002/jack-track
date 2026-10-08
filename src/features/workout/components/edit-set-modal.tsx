import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { FormField } from '@/components/ui/form-field';
import { GlassButton } from '@/components/ui/glass-button';
import { useAppTheme } from '@/hooks/use-app-theme';
import { spacing } from '@/theme';
import type { WorkoutSet } from '../domain/workout';

type Props = { item: WorkoutSet | null; exerciseName?: string; onClose: () => void; onSave: (weight: number, reps: number) => void };

export function EditSetModal({ item, exerciseName, onClose, onSave }: Props) {
  if (!item) return null;
  return <EditSetContent item={item} exerciseName={exerciseName} onClose={onClose} onSave={onSave} />;
}

type ContentProps = Omit<Props, 'item'> & { item: WorkoutSet };

function EditSetContent({ item, exerciseName, onClose, onSave }: ContentProps) {
  const { colors } = useAppTheme();
  const [weight, setWeight] = useState(item.weight || item.reps ? String(item.weight) : '');
  const [reps, setReps] = useState(item.reps ? String(item.reps) : '');
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <AppScreen scroll={false}>
        <View style={styles.header}>
          <View style={styles.copy}><AppText variant="title" weight="bold">Set {item.setNumber}</AppText><AppText color="muted">{exerciseName}</AppText></View>
          <Pressable onPress={onClose}><X color={colors.text} /></Pressable>
        </View>
        <FormField label="Weight (kg)" keyboardType="decimal-pad" autoFocus value={weight} onChangeText={setWeight} />
        <FormField label="Reps" keyboardType="number-pad" value={reps} onChangeText={setReps} />
        <View style={styles.spacer} />
        <GlassButton label="Save completed set" disabled={!Number.isFinite(Number(weight)) || Number(weight) < 0 || !Number.isInteger(Number(reps)) || Number(reps) <= 0} onPress={() => { onSave(Number(weight), Number(reps)); onClose(); }} />
      </AppScreen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 90, flexDirection: 'row', alignItems: 'center' },
  copy: { flex: 1, gap: 3 },
  spacer: { flex: 1, minHeight: spacing.xl },
});
