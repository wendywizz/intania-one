import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { boxShadow } from '@/constants/shadows';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

const BAR_HEIGHT = 50;
const BAR_GAP = 10;

/** How much room a list needs at its end so its last row can scroll clear of
 * the floating bar. Add the bottom safe-area inset on top. */
export const MAIL_BOTTOM_BAR_SPACE = BAR_HEIGHT + BAR_GAP * 2;

/**
 * iOS only. Android resizes the window for the keyboard (Expo's default
 * softwareKeyboardLayoutMode), which already carries an absolutely positioned
 * bar up with it — adding the keyboard height there would lift it twice.
 */
function useIosKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;
    const show = Keyboard.addListener('keyboardWillShow', (event) => setHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

/**
 * iOS Mail's floating bottom bar: filter on the left, search in the middle,
 * compose on the right — the controls a thumb reaches without stretching.
 * Floats over the list instead of taking its own row, so the list keeps the
 * full height and scrolls underneath.
 */
export function MailBottomBar({
  searchText,
  onChangeSearch,
  searchPlaceholder,
  isSearching,
  isFilterActive,
  onPressFilter,
  onPressCompose,
}: {
  searchText: string;
  onChangeSearch: (text: string) => void;
  searchPlaceholder: string;
  isSearching: boolean;
  isFilterActive: boolean;
  onPressFilter: () => void;
  /** Omitted while the compose switch is off — the button is not drawn at all. */
  onPressCompose?: () => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const keyboardHeight = useIosKeyboardHeight();
  const bottom = keyboardHeight > 0 ? keyboardHeight + BAR_GAP : insets.bottom + BAR_GAP;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={TEXT.MAIL_FILTER_BUTTON_LABEL}
        accessibilityState={{ selected: isFilterActive }}
        onPress={onPressFilter}
        style={({ pressed }) => [
          styles.circle,
          isFilterActive ? styles.circleActive : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <IconSymbol
          name="line.3.horizontal.decrease"
          size={20}
          color={isFilterActive ? c.textOnPrimary : c.text}
        />
      </Pressable>

      <View style={styles.search}>
        <IconSymbol name="magnifyingglass" size={17} color={c.textMuted} />
        <TextInput
          accessibilityLabel={searchPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onChangeSearch}
          placeholder={searchPlaceholder}
          placeholderTextColor={c.textFaint}
          returnKeyType="search"
          value={searchText}
          // react-native-web draws a black focus outline on inputs; remove it.
          style={[styles.input, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
        />
        {isSearching ? (
          <ActivityIndicator color={c.primary} size="small" />
        ) : searchText ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onChangeSearch('')}>
            <View style={styles.clear}>
              <IconSymbol name="xmark" size={12} color={c.textMuted} />
            </View>
          </Pressable>
        ) : null}
      </View>

      {onPressCompose ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={TEXT.MAIL_COMPOSE_BUTTON_LABEL}
          onPress={onPressCompose}
          style={({ pressed }) => [styles.circle, pressed ? styles.pressed : null]}
        >
          <IconSymbol name="square.and.pencil" size={20} color={c.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) => {
  const floating = {
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    boxShadow: boxShadow(c.shadow, { y: 4, blur: 16, opacity: 0.12 }),
  } as const;

  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    circle: {
      ...floating,
      width: BAR_HEIGHT,
      height: BAR_HEIGHT,
      borderRadius: BAR_HEIGHT / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circleActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    pressed: { opacity: 0.7 },
    search: {
      ...floating,
      flex: 1,
      height: BAR_HEIGHT,
      borderRadius: BAR_HEIGHT / 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
    },
    input: {
      flex: 1,
      height: '100%',
      color: c.text,
      fontFamily: AppFonts.psuRegular,
      fontSize: 15,
      paddingVertical: 0,
    },
    clear: {
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceMuted,
    },
  });
};
