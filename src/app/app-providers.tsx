import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppToast } from '@/components/feedback/app-toast';
import { store } from '@/core/store';
import { AuthStateSync } from '@/features/auth/components/auth-state-sync';
import { queryClient } from './query-client';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReduxProvider store={store}>
        <AuthStateSync />
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            {children}
            <AppToast />
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </ReduxProvider>
    </GestureHandlerRootView>
  );
}
