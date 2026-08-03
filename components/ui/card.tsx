/**
 * Card — the standard themed surface container (cards / sheets / panels).
 *
 * Brand-red theme via useColors(); a subtle border + shadow that reads in both
 * light and dark. Optionally pressable. Replaces per-screen `formCard` /
 * `panel` StyleSheet blocks and the indigo-palette ModernCard.
 */
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useColors } from '@/constants/theme';
import { boxShadow } from '@/constants/shadows';

type CardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  /** Inner padding (default 16). Pass 0 for edge-to-edge content like lists. */
  padding?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Card({ children, onPress, padding = 16, style, accessibilityLabel }: CardProps) {
  const c = useColors();

  const base: StyleProp<ViewStyle> = [
    styles.card,
    {
      backgroundColor: c.surface,
      borderColor: c.border,
      // The shadow lives here rather than in `styles` because its colour comes
      // from the theme, and boxShadow bakes the colour into the string.
      boxShadow: boxShadow(c.shadow, { y: 1, blur: 4, opacity: 0.04 }),
      padding,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [base, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={base}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.9 },
});
