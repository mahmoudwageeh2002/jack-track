import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { FormField } from '@/components/ui/form-field';
import { GlassButton } from '@/components/ui/glass-button';
import { useAppTheme } from '@/hooks/use-app-theme';
import { radius, spacing } from '@/theme';
import type { Exercise } from '@/features/exercises/domain/exercise';
import type { PlanExercise } from '../domain/plan';

type Props = {
  exercise: Exercise | null;
  planExercise: PlanExercise | null;
  onClose: () => void;
  onSave: (value: PlanExercise) => void;
};

export function EditExerciseModal({ exercise, planExercise, onClose, onSave }: Props) {
  if (!exercise || !planExercise) return null;
  return <EditExerciseContent exercise={exercise} planExercise={planExercise} onClose={onClose} onSave={onSave} />;
}

type ContentProps = Omit<Props, 'exercise' | 'planExercise'> & {
  exercise: Exercise;
  planExercise: PlanExercise;
};

function EditExerciseContent({ exercise, planExercise, onClose, onSave }: ContentProps) {
  const { colors } = useAppTheme();
  const [sets, setSets] = useState(String(planExercise.sets));
  const [reps, setReps] = useState(String(planExercise.maxReps ?? planExercise.minReps ?? 10));
  const [rest, setRest] = useState(String(planExercise.restSeconds ?? 90));
  const save = () => {
    onSave({ ...planExercise, sets: Number(sets), minReps: Number(reps), maxReps: Number(reps), restSeconds: Number(rest) });
    Toast.show({ type: 'success', text1: 'Exercise updated' });
    onClose();
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <AppScreen>
        <View style={styles.header}>
          <View style={styles.copy}><AppText variant="title" weight="bold">Edit exercise</AppText><AppText color="muted">{exercise.name}</AppText></View>
          <Pressable accessibilityLabel="Close" onPress={onClose}><X color={colors.text} /></Pressable>
        </View>
        {exercise.imageUrl ? <Image source={exercise.imageUrl} contentFit="cover" transition={250} style={[styles.image, { backgroundColor: colors.surfaceMuted }]} /> : null}
        <View style={styles.fields}>
          <FormField label="Sets" keyboardType="number-pad" value={sets} onChangeText={setSets} />
          <FormField label="Reps" keyboardType="number-pad" value={reps} onChangeText={setReps} />
          <FormField label="Rest time (seconds)" keyboardType="number-pad" value={rest} onChangeText={setRest} />
        </View>
        <View style={styles.instructions}>
          <AppText variant="subtitle" weight="bold">Technique</AppText>
          {exercise.instructions.map((instruction, index) => <AppText key={instruction} color="muted">{index + 1}. {instruction}</AppText>)}
        </View>
        <GlassButton label="Save changes" onPress={save} />
      </AppScreen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 80, flexDirection: 'row', alignItems: 'center' },
  copy: { flex: 1, gap: 2 },
  image: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.xl },
  fields: { gap: spacing.sm },
  instructions: { gap: spacing.xs },
});
