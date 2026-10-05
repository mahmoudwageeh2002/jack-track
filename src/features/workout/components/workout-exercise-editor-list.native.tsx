import { useCallback, useEffect, useRef } from 'react';
import { runOnJS } from 'react-native-reanimated';
import ReorderableList, { useReorderableDrag } from 'react-native-reorderable-list';
import type { EditorListProps } from './workout-exercise-editor-list';
import { WorkoutExerciseEditorRow, type EditorRowProps } from './workout-exercise-editor-row';

function DraggableRow(props: EditorRowProps) {
  const drag = useReorderableDrag();
  return <WorkoutExerciseEditorRow {...props} onDrag={drag} />;
}

export function WorkoutExerciseEditorList({ items, rowProps, onMove, onDraggingChange }: EditorListProps) {
  const endTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(endTimer.current), []);
  const release = useCallback(() => {
    // Keep Save disabled until the drop animation has committed the final order.
    clearTimeout(endTimer.current);
    endTimer.current = setTimeout(() => onDraggingChange(false), 250);
  }, [onDraggingChange]);
  return <ReorderableList style={{ flex: 1 }} data={items} keyExtractor={(item) => item.exerciseId}
    animationDuration={150} autoscrollThreshold={0.15}
    onDragStart={() => { 'worklet'; runOnJS(onDraggingChange)(true); }}
    onDragEnd={() => { 'worklet'; runOnJS(release)(); }}
    onReorder={({ from, to }) => { onMove(from, to); clearTimeout(endTimer.current); onDraggingChange(false); }}
    renderItem={({ item, index }) => <DraggableRow {...rowProps(item, index)} />} />;
}
