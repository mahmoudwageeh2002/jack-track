import { BlurView } from 'expo-blur';
import { ChevronDown, X } from 'lucide-react-native';
import { useContext, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { BlurTargetContext } from '@/components/ui/blur-target-context';
import { GlassButton } from '@/components/ui/glass-button';
import { Stepper } from '@/components/ui/stepper';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { Exercise } from '../domain/exercise';
import { MuscleImage } from './muscle-image';

type Props = { exercise: Exercise; sets?: number; onSetsChange?: (sets: number) => void; onAdd?: () => void; onRemove?: () => void; disabled?: boolean };
export function ExerciseCard({ exercise, sets, onSetsChange, onAdd, onRemove, disabled }: Props) {
  const { colors, isDark } = useAppTheme();
  const blurTarget = useContext(BlurTargetContext);
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState(false);
  const detail = (full = false) => <View style={styles.details}>
    <AppText color="muted">{exercise.description || exercise.instructions[0] || 'Instructions are not available yet.'}</AppText>
    {full && exercise.instructions.map((step, index) => <AppText key={index} variant="label">{index + 1}. {step}</AppText>)}
    {sets !== undefined && onSetsChange && <Stepper label="Sets" value={sets} onChange={onSetsChange} disabled={disabled} />}
    {onAdd && <GlassButton label="Add to this day" onPress={onAdd} disabled={disabled} />}
    {onRemove && <GlassButton label="Remove from day" variant="ghost" onPress={() => { setPreview(false); onRemove(); }} disabled={disabled} />}
  </View>;
  return <>
    <Animated.View layout={LinearTransition.duration(220)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={exercise.name} accessibilityHint="Tap to expand. Hold to open exercise preview." delayLongPress={350} onPress={() => setExpanded(!expanded)} onLongPress={() => setPreview(true)} style={styles.header}>
        <MuscleImage muscle={exercise.primaryMuscle} />
        <View style={styles.copy}><AppText weight="semibold">{exercise.name}</AppText><AppText variant="small" color="muted">{exercise.primaryMuscle} · {exercise.equipment}{sets !== undefined ? ' · ' + sets + ' sets' : ''}</AppText></View>
        <ChevronDown color={colors.primary} size={20} style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }} />
      </Pressable>
      {expanded && <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>{detail()}</Animated.View>}
    </Animated.View>
    <Modal visible={preview} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPreview(false)}>
      <BlurView blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" intensity={75} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} accessibilityLabel="Close preview" onPress={() => setPreview(false)} />
      <SafeAreaView style={styles.modal} pointerEvents="box-none">
        <Animated.View entering={ZoomIn.duration(200)} style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.previewContent}>
            <View style={styles.header}><MuscleImage muscle={exercise.primaryMuscle} size={90} /><View style={styles.copy}><AppText variant="subtitle" weight="bold">{exercise.name}</AppText><AppText color="muted">{exercise.primaryMuscle}</AppText></View><Pressable accessibilityRole="button" accessibilityLabel="Close exercise" onPress={() => setPreview(false)} style={styles.close}><X color={colors.text} /></Pressable></View>
            {detail(true)}
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  copy: { flex: 1, gap: 6 },
  details: { padding: 16, paddingTop: 4, gap: 16 },
  scrim: { backgroundColor: 'rgba(0,0,0,0.2)' },
  modal: { flex: 1, justifyContent: 'center', padding: 20 },
  preview: { maxHeight: '85%', borderRadius: 26, borderWidth: 1, overflow: 'hidden', width: '100%', maxWidth: 600, alignSelf: 'center' },
  previewContent: { padding: 6 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
