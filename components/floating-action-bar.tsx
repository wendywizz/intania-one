import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { ThemedView } from "@/components/themed-view";
import { useActionBarBottomPadding } from "@/hooks/use-action-bar-padding";

type FloatingActionBarProps = {
  children: ReactNode;
  /**
   * When true (e.g. a request is in flight), blocks touches on every button in
   * the bar at once and dims it — so tapping one action can't fire another.
   */
  disabled?: boolean;
  /**
   * Clear the device's bottom inset (Android's system navigation bar, the iOS
   * home indicator). Leave on for stack screens, which run edge to edge; turn
   * off inside a tab screen, where the tab bar below already clears it.
   */
  safeAreaBottom?: boolean;
};

/**
 * Sticky action footer. Keeps submit / action buttons pinned to the bottom of
 * the screen (floating above the scrollable content) so they stay reachable
 * without scrolling. Place it as the last sibling inside a screen's flex
 * container, after the scroll/content area.
 */
export function FloatingActionBar({
  children,
  disabled = false,
  safeAreaBottom = true,
}: FloatingActionBarProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const paddingBottom = useActionBarBottomPadding(safeAreaBottom);
  return (
    <ThemedView style={[styles.bar, { paddingBottom }]} lightColor="#FFFFFF" darkColor="#151718">
      <View
        style={[styles.inner, disabled ? styles.innerDisabled : undefined]}
        pointerEvents={disabled ? "none" : "auto"}
      >
        {children}
      </View>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    boxShadow: "0 -2px 10px rgba(0,0,0,0.07)",
    elevation: 12,
  },
  inner: {
    gap: 12,
  },
  innerDisabled: {
    opacity: 0.6,
  },
});
