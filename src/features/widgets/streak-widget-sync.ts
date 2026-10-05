import type { StreakWidgetSummary } from './domain/streak-widget';

// Metro selects the native implementation on iOS only.
export function setStreakWidgetUser(_uid: string | null) {}
export function syncStreakWidget(_uid: string, _summary: StreakWidgetSummary) {}
