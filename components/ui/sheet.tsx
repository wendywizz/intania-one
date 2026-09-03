/**
 * Sheet — the standard bottom-sheet modal wrapper.
 *
 * Replaces per-screen raw <Modal> select/detail popups. Sits at the bottom over
 * a scrim, respects the bottom safe area, shows a grabber handle and an optional
 * title header with a close button. Tap the scrim to dismiss. Themed via
 * useColors().
 *
 * Two entrance animations:
 *   'slide' (default) — the whole panel travels up from off-screen. Right for
 *                       tall content: pickers, long option lists, detail panels.
 *   'pop'             — the scrim fades and the panel scales up in place. Right
 *                       for short action menus, where a full slide reads as
 *                       heavier than the choice being made.
 */
import { Animated, Modal, Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { AppText as Text } from '@/components/app-text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { useColors } from '@/constants/theme';
import { usePopAnimation } from '@/hooks/use-pop-animation';

// Animating the panel itself rather than a wrapper View keeps the layout tree
// identical between the two animations — a wrapper would break the panel's
// `maxHeight: '85%'`, which needs the backdrop as its percentage base.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Wrap children in a ScrollView (default true). Set false for fixed content. */
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Entrance animation (default 'slide'). See the file header. */
  animation?: 'slide' | 'pop';
};

export function Sheet({ visible, onClose, title, children, scroll = true, contentStyle, animation = 'slide' }: SheetProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const isPop = animation === 'pop';

  // 'pop' drives its own animation, so it holds the Modal mounted through the
  // exit; 'slide' hands that job to the Modal and follows `visible` directly.
  const pop = usePopAnimation(isPop && visible);
  const isModalVisible = isPop ? pop.isMounted : visible;

  const body = scroll ? (
    <ScrollView contentContainerStyle={[styles.body, contentStyle]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.body, contentStyle]}>{children}</View>
  );

  return (
    <Modal
      transparent
      visible={isModalVisible}
      animationType={isPop ? 'none' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.fill, isPop && pop.backdropStyle]}>
        <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={onClose}>
          {/* Inner Pressable swallows taps so interacting with the sheet doesn't dismiss it. */}
          <AnimatedPressable
            style={[
              styles.sheet,
              { backgroundColor: c.surface, paddingBottom: insets.bottom + 12 },
              isPop && pop.panelStyle,
            ]}
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
          </AnimatedPressable>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
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
