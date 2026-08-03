/**
 * Button — the single tappable action primitive for the whole app.
 *
 * Replaces the per-screen `Pressable` + StyleSheet buttons (submit bars,
 * secondary/back buttons, dialog actions) and the indigo `ModernButton`.
 * Pomegranate-red primary, theme-aware via useColors(), ≥44pt touch target,
 * built-in loading + disabled states.
 */
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useColors } from '@/constants/theme';
import { scaleFont } from '@/utils/font-scale';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'dangerOutline'
  | 'primaryOutline'
  | 'accentOutline';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon from the shared IconSymbol set. */
  icon?: IconSymbolName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const SIZES: Record<ButtonSize, { minHeight: number; paddingHorizontal: number; fontSize: number; iconSize: number }> = {
  sm: { minHeight: 40, paddingHorizontal: 16, fontSize: 13, iconSize: 16 },
  md: { minHeight: 48, paddingHorizontal: 20, fontSize: 15, iconSize: 18 },
  lg: { minHeight: 52, paddingHorizontal: 24, fontSize: 16, iconSize: 20 },
};

// A filled button's border only softens the fill's edge, so hairline is right.
// An outlined one has nothing but its border, and hairline (~0.5px) is too faint
// to read as a button — hence the explicit width per variant.
const OUTLINE_BORDER_WIDTH = 1.5;

function palette(c: AppColors, variant: ButtonVariant) {
  switch (variant) {
    case 'secondary':
      return { bg: c.surface, border: c.border, fg: c.text, borderWidth: StyleSheet.hairlineWidth };
    case 'ghost':
      return { bg: 'transparent', border: 'transparent', fg: c.primary, borderWidth: StyleSheet.hairlineWidth };
    case 'danger':
      return { bg: c.danger, border: c.danger, fg: '#FFFFFF', borderWidth: StyleSheet.hairlineWidth };
    // Outlined destructive action: the same weight of intent as `danger`, but it
    // does not shout from across the screen the way a solid red slab does.
    case 'dangerOutline':
      return { bg: 'transparent', border: c.danger, fg: c.danger, borderWidth: OUTLINE_BORDER_WIDTH };
    // The brand colour as an outline: a secondary action that still speaks in
    // the app's own voice. `primary` itself, not the fixed pomegranate the
    // filled variant uses — as a line rather than a fill it keeps its contrast
    // in both themes, so it can follow the theme's own accent.
    case 'primaryOutline':
      return {
        bg: 'transparent',
        border: c.primary,
        fg: c.primary,
        borderWidth: OUTLINE_BORDER_WIDTH,
      };
    // An outlined action that is neither the brand's nor destructive — going
    // somewhere else in the same record, say. Blue, the same one the calendars
    // fill a chosen date with, so "this is navigation, not a decision" reads
    // the same wherever it appears.
    case 'accentOutline':
      return {
        bg: 'transparent',
        border: c.belizeHole,
        fg: c.belizeHole,
        borderWidth: OUTLINE_BORDER_WIDTH,
      };
    case 'primary':
    // Pomegranate rather than `primary`: the brand red washes out to pink as a
    // fill in dark mode, and this holds one red across both themes.
    default:
      return { bg: c.pomegranate, border: c.pomegranate, fg: c.textOnPrimary, borderWidth: StyleSheet.hairlineWidth };
  }
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const c = useColors();
  const dims = SIZES[size];
  // The label is styled inline, so it misses the StyleSheet-level font scale and
  // has to opt in by hand. `minHeight` is generous enough to take the extra.
  const fontSize = scaleFont(dims.fontSize);
  const { bg, border, fg, borderWidth } = palette(c, variant);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: dims.minHeight,
          paddingHorizontal: dims.paddingHorizontal,
          backgroundColor: bg,
          borderColor: border,
          borderWidth,
        },
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <IconSymbol name={icon} size={dims.iconSize} color={fg} /> : null}
          <Text
            numberOfLines={1}
            style={{ color: fg, fontSize, fontFamily: AppFonts.psuBold, lineHeight: fontSize + 5 }}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
