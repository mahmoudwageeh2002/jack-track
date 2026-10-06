import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppToast } from '@/components/feedback/app-toast';
import { store } from '@/core/store';
import { AuthStateSync } from '@/features/auth/components/auth-state-sync';
import { StreakWidgetSync } from '@/features/widgets/components/streak-widget-sync';
import { WorkoutLiveActivitySync } from '@/features/widgets/components/workout-live-activity-sync';
import { OfflineCoordinator } from '@/features/offline/components/offline-coordinator';
import { NotificationCoordinator } from '@/features/notifications/components/notification-coordinator';
import { queryClient } from './query-client';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReduxProvider store={store}>
        <AuthStateSync />
        <QueryClientProvider client={queryClient}>
          <StreakWidgetSync />
          <WorkoutLiveActivitySync />
          <NotificationCoordinator />
          <BottomSheetModalProvider>
            {children}
            <OfflineCoordinator />
            <AppToast />
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </ReduxProvider>
    </GestureHandlerRootView>
  );
}
