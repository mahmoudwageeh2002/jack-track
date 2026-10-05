import { FlatList } from 'react-native';
import type { WorkoutExerciseEdit } from '../domain/edit-workout';
import { WorkoutExerciseEditorRow, type EditorRowProps } from './workout-exercise-editor-row';

export type EditorListProps = {
  items: WorkoutExerciseEdit[];
  rowProps: (item: WorkoutExerciseEdit, index: number) => EditorRowProps;
  onMove: (from: number, to: number) => void;
  onDraggingChange: (dragging: boolean) => void;
};

// Web keeps accessible move controls; native platforms use the gesture-driven list.
export function WorkoutExerciseEditorList({ items, rowProps }: EditorListProps) {
  return <FlatList style={{ flex: 1 }} data={items} keyExtractor={(item) => item.exerciseId}
    renderItem={({ item, index }) => <WorkoutExerciseEditorRow {...rowProps(item, index)} />} />;
}
