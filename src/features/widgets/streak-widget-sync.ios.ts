import { requireOptionalNativeModule } from 'expo';
import { emptyStreakWidget, streakWidgetTimeline, type StreakWidgetSummary } from './domain/streak-widget';

let activeUid: string | null | undefined;

function updateWidget(update: (widget: typeof import('./streak-widget').default) => void) {
  // Older development clients and Expo Go must still be able to open the app.
  if (!requireOptionalNativeModule('ExpoWidgets')) return;
  try {
    // Load synchronously after the native guard so account changes cannot race an import.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const widget = require('./streak-widget').default as typeof import('./streak-widget').default;
    update(widget);
  } catch (error) {
    // A widget failure must never make a successfully saved workout look failed.
    console.warn('Unable to update the streak widget', error);
  }
}

export function setStreakWidgetUser(uid: string | null) {
  if (activeUid === uid) return;
  activeUid = uid;
  updateWidget((widget) => widget.updateSnapshot(emptyStreakWidget(uid ? 'loading' : 'signedOut')));
}

export function syncStreakWidget(uid: string, summary: StreakWidgetSummary) {
  // Ignore in-flight requests from an account that has since signed out.
  if (uid !== activeUid) return;
  updateWidget((widget) => widget.updateTimeline(streakWidgetTimeline(summary)));
}
