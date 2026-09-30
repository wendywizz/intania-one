import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Bottom padding for a screen-level action bar pinned to the bottom edge.
 *
 * Stack screens run edge to edge: on Android the system navigation bar (3-button
 * or gesture) is drawn over the bottom of the window, and on iOS the home
 * indicator is. Without the inset, the bar's buttons sit underneath it.
 */
export function actionBarBottomPadding(insetBottom: number) {
  return Platform.OS === "ios"
    ? Math.max(28, insetBottom)
    : Math.max(16, insetBottom + 8);
}

/**
 * `actionBarBottomPadding` for this device. Pass `false` inside a tab screen,
 * where the tab bar below already clears the inset.
 */
export function useActionBarBottomPadding(safeAreaBottom = true) {
  const insets = useSafeAreaInsets();
  return actionBarBottomPadding(safeAreaBottom ? insets.bottom : 0);
}

/**
 * Bottom padding for scrollable content on a stack screen with no action bar,
 * so its last lines can scroll clear of the system navigation bar.
 */
export function useContentBottomPadding(base = 16) {
  const insets = useSafeAreaInsets();
  return base + insets.bottom;
}
