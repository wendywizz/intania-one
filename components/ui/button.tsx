/**
 * Button — the single tappable action primitive for the whole app.
 *
 * Replaces the per-screen `Pressable` + StyleSheet buttons (submit bars,
 * secondary/back buttons, dialog actions) and the indigo `ModernButton`.
 * Brand-red primary, theme-aware via useColors(), ≥44pt touch target,
 * built-in loading + disabled states.
 */
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useColors } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
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

function palette(c: AppColors, variant: ButtonVariant) {
  switch (variant) {
    case 'secondary':
      return { bg: c.surface, border: c.border, fg: c.text };
    case 'ghost':
      return { bg: 'transparent', border: 'transparent', fg: c.primary };
    case 'danger':
      return { bg: c.danger, border: c.danger, fg: '#FFFFFF' };
    case 'primary':
    default:
      return { bg: c.primary, border: c.primary, fg: c.textOnPrimary };
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
  const { bg, border, fg } = palette(c, variant);
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
            style={{ color: fg, fontSize: dims.fontSize, fontFamily: AppFonts.psuBold, lineHeight: dims.fontSize + 5 }}
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
    borderWidth: StyleSheet.hairlineWidth,
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
