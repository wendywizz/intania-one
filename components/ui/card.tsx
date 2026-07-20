/**
 * Card — the standard themed surface container (cards / sheets / panels).
 *
 * Brand-red theme via useColors(); a subtle border + shadow that reads in both
 * light and dark. Optionally pressable. Replaces per-screen `formCard` /
 * `panel` StyleSheet blocks and the indigo-palette ModernCard.
 */
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useColors } from '@/constants/theme';

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
    { backgroundColor: c.surface, borderColor: c.border, shadowColor: c.shadow, padding },
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  pressed: { opacity: 0.9 },
});
