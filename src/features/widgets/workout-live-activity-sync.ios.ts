import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo';
import { createWorkoutActivitySync, type ActivityRecord, type WorkoutActivityInput } from './domain/workout-activity-sync';

const storageKey = 'jack-track:workout-live-activity:v1';
let sync: ReturnType<typeof createWorkoutActivitySync> | undefined;
let lastError = '';

export function syncWorkoutLiveActivity(input: WorkoutActivityInput) {
  if (!requireOptionalNativeModule('ExpoWidgets')) return;
  try {
    if (!sync) {
      // Keep unsupported platforms and old development builds able to open the app.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const factory = require('./workout-live-activity').default as typeof import('./workout-live-activity').default;
      sync = createWorkoutActivitySync({
        factory,
        async read() {
          const stored = await AsyncStorage.getItem(storageKey);
          if (!stored) return null;
          try {
            const record = JSON.parse(stored) as ActivityRecord;
            return typeof record?.ownerId === 'string' && typeof record?.sessionId === 'string' && typeof record?.activityId === 'string' ? record : null;
          } catch { return null; }
        },
        write: (record) => record ? AsyncStorage.setItem(storageKey, JSON.stringify(record)) : AsyncStorage.removeItem(storageKey),
        onError: reportError,
      });
    }
    void sync(input);
  } catch (error) { reportError(error); }
}

function reportError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message !== lastError) console.warn('Workout Live Activity unavailable. Check Live Activities in iOS Settings.', message);
  lastError = message;
}
