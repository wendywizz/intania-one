/**
 * Sheet — the standard bottom-sheet modal wrapper.
 *
 * Replaces per-screen raw <Modal> select/detail popups. Slides up from the
 * bottom over a scrim, respects the bottom safe area, shows a grabber handle and
 * an optional title header with a close button. Tap the scrim to dismiss.
 * Themed via useColors().
 */
import { Modal, Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { useColors } from '@/constants/theme';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Wrap children in a ScrollView (default true). Set false for fixed content. */
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Sheet({ visible, onClose, title, children, scroll = true, contentStyle }: SheetProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();

  const body = scroll ? (
    <ScrollView contentContainerStyle={[styles.body, contentStyle]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.body, contentStyle]}>{children}</View>
  );

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={onClose}>
        {/* Inner Pressable swallows taps so interacting with the sheet doesn't dismiss it. */}
        <Pressable
          style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 12 }]}
        >
          <View style={[styles.handle, { backgroundColor: c.borderStrong }]} />
          {title ? (
            <View style={styles.header}>
              <Text style={[styles.title, { color: c.text }]}>{title}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} onPress={onClose}>
                <IconSymbol name="xmark.circle" size={24} color={c.textFaint} />
              </Pressable>
            </View>
          ) : null}
          {body}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    maxHeight: '85%',
  },
  handle: { alignSelf: 'center', height: 4, width: 40, borderRadius: 2, marginBottom: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 17, lineHeight: 24, fontFamily: AppFonts.psuBold },
  body: { paddingHorizontal: 20, paddingTop: 4 },
});
