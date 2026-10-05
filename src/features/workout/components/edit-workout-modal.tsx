import { AppScreen } from "@/components/ui/app-screen";
import { AppText } from "@/components/ui/app-text";
import { FormField } from "@/components/ui/form-field";
import { GlassButton } from "@/components/ui/glass-button";
import type { Exercise } from "@/features/exercises/domain/exercise";
import { useAppTheme } from "@/hooks/use-app-theme";
import { Plus, X } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  minimumWorkoutSets,
  moveWorkoutExercise,
  type WorkoutExerciseEdit,
} from "../domain/edit-workout";
import type { WorkoutSession } from "../domain/workout";
import { WorkoutExerciseEditorList } from "./workout-exercise-editor-list";

function confirmEdit(
  title: string,
  message: string,
  action: string,
  onConfirm: () => void,
) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Keep editing", style: "cancel" },
    { text: action, style: "destructive", onPress: onConfirm },
  ]);
}

export function EditWorkoutModal({
  session,
  catalog,
  onClose,
  onSave,
}: {
  session: WorkoutSession;
  catalog: Exercise[];
  onClose: () => void;
  onSave: (edits: WorkoutExerciseEdit[]) => void;
}) {
  const { colors } = useAppTheme();
  const [items, setItems] = useState<WorkoutExerciseEdit[]>(() =>
    session.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      sets: exercise.sets.length,
    })),
  );
  const [library, setLibrary] = useState(false);
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState(false);
  const names = new Map(
    catalog.map((exercise) => [exercise.id, exercise.name]),
  );
  const original = new Map(
    session.exercises.map((exercise) => [exercise.exerciseId, exercise]),
  );
  const changed =
    JSON.stringify(items) !==
    JSON.stringify(
      session.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        sets: exercise.sets.length,
      })),
    );
  const close = () => {
    if (dragging) return;
    if (library) {
      setLibrary(false);
      return;
    }
    if (!changed) {
      onClose();
      return;
    }
    confirmEdit(
      "Discard workout edits?",
      "Your exercise order and set changes have not been saved.",
      "Discard",
      onClose,
    );
  };
  const move = (from: number, to: number) =>
    setItems((current) => moveWorkoutExercise(current, from, to));
  const remove = (exerciseId: string) => {
    const apply = () =>
      setItems((current) =>
        current.length > 1
          ? current.filter((item) => item.exerciseId !== exerciseId)
          : current,
      );
    if (
      original
        .get(exerciseId)
        ?.sets.some((set) => set.completed || set.reps > 0 || set.weight > 0)
    ) {
      confirmEdit(
        "Remove recorded sets?",
        `Removing ${names.get(exerciseId) ?? "this exercise"} will also remove its recorded sets when you save these edits.`,
        "Remove",
        apply,
      );
    } else apply();
  };
  const available = catalog.filter(
    (exercise) =>
      exercise.status === "active" &&
      !items.some((item) => item.exerciseId === exercise.id) &&
      `${exercise.name} ${exercise.primaryMuscle} ${exercise.equipment}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={close}
    >
      <GestureHandlerRootView style={styles.fill}>
        <AppScreen scroll={false} contentStyle={styles.fill}>
          <View style={styles.header}>
            <AppText variant="subtitle" weight="bold" style={styles.fill}>
              {library ? "Add an exercise" : "Edit workout"}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                library ? "Back to workout edits" : "Close workout editor"
              }
              disabled={dragging}
              onPress={close}
              style={styles.close}
            >
              <X color={colors.text} />
            </Pressable>
          </View>
          {library ? (
            <>
              <FormField
                label="Search exercises"
                placeholder="Name, muscle or equipment"
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
              />
              <FlatList
                style={styles.fill}
                data={available}
                keyExtractor={(exercise) => exercise.id}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <AppText color="muted">
                    No matching exercises in your downloaded library.
                  </AppText>
                }
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${item.name}`}
                    onPress={() => {
                      setItems((current) =>
                        current.some(
                          (exercise) => exercise.exerciseId === item.id,
                        )
                          ? current
                          : [
                              ...current,
                              {
                                exerciseId: item.id,
                                sets: original.get(item.id)?.sets.length ?? 3,
                              },
                            ],
                      );
                      setLibrary(false);
                    }}
                    style={[styles.libraryRow, { borderColor: colors.border }]}
                  >
                    <View style={styles.fill}>
                      <AppText weight="semibold">{item.name}</AppText>
                      <AppText variant="small" color="muted">
                        {item.primaryMuscle} · {item.equipment}
                      </AppText>
                    </View>
                    <Plus size={22} color={colors.primary} />
                  </Pressable>
                )}
              />
              <GlassButton
                label="Back to workout edits"
                variant="secondary"
                onPress={() => setLibrary(false)}
              />
            </>
          ) : (
            <>
              <AppText color="muted">
                {Platform.OS === "web"
                  ? "Use the arrows to reorder exercises."
                  : "Hold the grip and drag to reorder exercises."}{" "}
                Changes apply to this workout only.
              </AppText>
              <WorkoutExerciseEditorList
                items={items}
                onMove={move}
                onDraggingChange={setDragging}
                rowProps={(item, index) => ({
                  item,
                  index,
                  count: items.length,
                  name: names.get(item.exerciseId) ?? "Exercise unavailable",
                  minimumSets: minimumWorkoutSets(
                    original.get(item.exerciseId),
                  ),
                  disabled: dragging,
                  onMove: move,
                  onSetsChange: (sets) =>
                    setItems((current) =>
                      current.map((exercise) =>
                        exercise.exerciseId === item.exerciseId
                          ? { ...exercise, sets }
                          : exercise,
                      ),
                    ),
                  onRemove: () => remove(item.exerciseId),
                })}
              />
              <GlassButton
                label="Add exercise"
                variant="secondary"
                icon={<Plus size={20} color={colors.primary} />}
                disabled={dragging}
                onPress={() => {
                  setSearch("");
                  setLibrary(true);
                }}
              />
              <GlassButton
                label="Save workout changes"
                disabled={dragging || !changed || !items.length}
                onPress={() => onSave(items)}
              />
            </>
          )}
        </AppScreen>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 22,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  libraryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
});
