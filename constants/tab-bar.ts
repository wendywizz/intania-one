import type { ViewStyle } from 'react-native';

import type { AppColors } from '@/constants/theme';

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
 * back is what keeps them clear of it.
 *
 * It was a copy of this object in each module's `(tabs)/_layout.tsx` that let
 * the fix land in one module and miss the other five.
 *
 * `height` leaves `78 - paddingTop - paddingBottom = 62` for the icon + label
 * column, not 68's 52. That grew alongside `MIN_LINE_HEIGHT_RATIO`: once every
 * module's `tabBarLabelStyle` got an explicit lineHeight (to stop สระ ุ/ู and
 * ฎ/ฐ/ฏ clipping — see font-scale.ts), the label needed more room than the
 * font's own metrics used to claim, and 68 clipped the taller label instead.
 */
export const moduleTabBarStyle = (c: AppColors, bottom: number = 0): ViewStyle => ({
  backgroundColor: c.primary,
  borderTopColor: c.primary,
  height: 78 + bottom,
  paddingBottom: 10 + bottom,
  paddingTop: 6,
});
