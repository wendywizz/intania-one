import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

export type PillButtonVariant = 'soft' | 'solid' | 'onAccent';

export type PillButtonProps = {
  label: string;
  onPress: () => void;
  /**
   * `soft` — brand-tinted pill for white surfaces (e.g. "Read more").
   * `solid` — filled brand pill.
   * `onAccent` — translucent-white pill for colored bands (e.g. the home news
   * header "see all"). Defaults to `soft`.
   */
  variant?: PillButtonVariant;
  /** Optional trailing element, e.g. a chevron/arrow icon. */
  trailing?: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Small rounded "pill" button shared across the app (home news "see all",
 * news-list "read more", …) so those compact call-to-action chips stay visually
 * consistent. The label colour follows the variant; pass `trailing` for an icon.
 */
export function PillButton({
  label,
  onPress,
  variant = 'soft',
  trailing,
  accessibilityLabel,
  style,
}: PillButtonProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const containerVariant =
    variant === 'solid' ? styles.solid : variant === 'onAccent' ? styles.onAccent : styles.soft;
  const labelColor =
    variant === 'solid' ? c.textOnPrimary : variant === 'onAccent' ? '#FFFFFF' : c.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.base, containerVariant, pressed ? styles.pressed : null, style]}>
      <ThemedText style={[styles.label, { color: labelColor }]}>{label}</ThemedText>
      {trailing}
    </Pressable>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  soft: {
    backgroundColor: c.primarySoft,
  },
  solid: {
    backgroundColor: c.primary,
  },
  onAccent: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  label: {
    fontFamily: AppFonts.psuBold,
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.7,
  },
});
