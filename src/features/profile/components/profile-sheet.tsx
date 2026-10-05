import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, type PropsWithChildren } from 'react';
import { BackHandler, Pressable, StyleSheet, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/app-text';
import { useAppTheme } from '@/hooks/use-app-theme';
import { fontFamily } from '@/theme';

export function ProfileSheet({ title, busy = false, onClose, children }: PropsWithChildren<{ title: string; busy?: boolean; onClose: () => void }>) {
  const ref = useRef<BottomSheetModal>(null);
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const close = useCallback(() => { if (!busy) ref.current?.dismiss(); }, [busy]);
  useEffect(() => { ref.current?.present(); }, []);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    return () => listener.remove();
  }, [close]);
  return <BottomSheetModal ref={ref} onDismiss={onClose} enablePanDownToClose={!busy}
    topInset={insets.top + 16} keyboardBehavior="interactive" keyboardBlurBehavior="restore" android_keyboardInputMode="adjustResize"
    backgroundStyle={{ backgroundColor: colors.background }} handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
    backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior={busy ? 'none' : 'close'} />}>
    <BottomSheetScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>
      <View style={styles.header}><AppText style={{ flex: 1 }} variant="subtitle" weight="bold">{title}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" disabled={busy} onPress={close} style={styles.close}><X color={colors.text} size={22} /></Pressable>
      </View>
      {children}
    </BottomSheetScrollView>
  </BottomSheetModal>;
}

export function SheetField({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useAppTheme();
  return <View style={{ gap: 8 }}><AppText variant="label" weight="semibold">{label}</AppText>
    <BottomSheetTextInput {...props} accessibilityLabel={label} placeholderTextColor={colors.textMuted} selectionColor={colors.primary}
      style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
  </View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: { height: 54, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, fontSize: 16, fontFamily: fontFamily.regular },
});
