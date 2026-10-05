import { BlurTargetView } from "expo-blur";
import { useRef, type PropsWithChildren } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/use-app-theme";
import { spacing } from "@/theme";
import { BlurTargetContext } from "./blur-target-context";
import { OfflineStatus } from '@/features/offline/components/offline-status';

type Props = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: ViewStyle;
  scrollProps?: ScrollViewProps;
  tabScreen?: boolean;
}>;

export function AppScreen({
  children,
  scroll = true,
  contentStyle,
  scrollProps,
  tabScreen,
}: Props) {
  const { colors } = useAppTheme();
  const blurTarget = useRef<View | null>(null);
  const content = [
    styles.content,
    tabScreen && styles.tabContent,
    contentStyle,
  ];
  return (
    <BlurTargetContext.Provider value={blurTarget}>
      <BlurTargetView ref={blurTarget} style={styles.safe}>
        <SafeAreaView
          edges={tabScreen ? ["top"] : ["top", "bottom"]}
          style={[styles.safe, { backgroundColor: colors.background }]}
        >
          {scroll ? (
            <ScrollView
              {...scrollProps}
              contentInsetAdjustmentBehavior="automatic"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.scroll}
              contentContainerStyle={content}
            >
              <OfflineStatus />
              {children}
            </ScrollView>
          ) : (
            <View style={content}><OfflineStatus />{children}</View>
          )}
        </SafeAreaView>
      </BlurTargetView>
    </BlurTargetContext.Provider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  tabContent: { paddingBottom: 120 },
});
//
//
