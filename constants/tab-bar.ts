import type { TextStyle, ViewStyle } from 'react-native';

import { AppFonts } from '@/constants/fonts';
import type { AppColors } from '@/constants/theme';
import { MIN_LINE_HEIGHT_RATIO, scaleFont } from '@/utils/font-scale';

const LABEL_FONT_SIZE = scaleFont(11);
const LABEL_LINE_HEIGHT = Math.round(LABEL_FONT_SIZE * MIN_LINE_HEIGHT_RATIO);

/**
 * The label under each tab icon.
 *
 * `lineHeight` is spelled out because a navigator option is one of the few
 * styles that never passes through StyleSheet.create, so the app-wide floor in
 * font-scale.ts cannot reach it — and Sarabun's own metrics are not tall
 * enough: they clip สระ ุ/ู and the tail of ฎ/ฐ/ฏ.
 */
export const moduleTabBarLabelStyle: TextStyle = {
  fontSize: LABEL_FONT_SIZE,
  lineHeight: LABEL_LINE_HEIGHT,
  fontFamily: AppFonts.psuRegular,
};

/**
 * What one tab actually occupies, taken from the navigator's own metrics
 * rather than guessed: the icon sits in a fixed 28pt box (`ICON_SIZE_TALL` in
 * TabBarIcon) and the item adds 5pt above and below it (`tabVerticalUiKit`).
 *
 * This has to be right, not merely generous. The item lays its column out
 * `flex-start`, so every point the bar is taller than its content becomes dead
 * space under the labels instead of breathing room around them. No rounding
 * tolerance is added on top - these four numbers are exact, not estimated.
 */
const TAB_CONTENT_HEIGHT = 5 + 28 + LABEL_LINE_HEIGHT + 5;

const PADDING_TOP = 4;
// However small this is, it never reaches zero: `paddingBottom` here is added
// ON TOP OF the safe-area inset (see below), not instead of it, so this is
// pure breathing room above the home indicator - not what makes the bar tall
// on notched phones. That's the inset, and it isn't ours to shrink.
const PADDING_BOTTOM = 2;

/**
 * The red module tab bar, written once because every module has the same one.
 *
 * `bottom` is `useSafeAreaInsets().bottom`, and leaving it out is the bug this
 * function exists to stop. React Navigation's tab bar already sizes itself
 * around the safe area, but whatever `tabBarStyle` carries is applied over the
 * top of that: a fixed `height` and `paddingBottom` throw the inset away. On a
 * phone that draws the app edge to edge — every Android 15 device, since the
 * system stopped honouring the opt-out — the bar then sits underneath the
 * back/home/recents buttons and the labels are unreadable. Adding the inset
 * back to both is what keeps them clear of it.
 *
 * It was a copy of this object in each module's `(tabs)/_layout.tsx` that let
 * the fix land in one module and miss the other five.
 */
export const moduleTabBarStyle = (c: AppColors, bottom: number = 0): ViewStyle => ({
  backgroundColor: c.primary,
  borderTopColor: c.primary,
  height: PADDING_TOP + TAB_CONTENT_HEIGHT + PADDING_BOTTOM + bottom,
  paddingBottom: PADDING_BOTTOM + bottom,
  paddingTop: PADDING_TOP,
});
