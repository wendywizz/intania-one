import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

type EmptyStateProps = {
  /** Lucide icon shown inside the tonal circle. */
  icon: LucideIcon;
  /** "No data" message under the icon. */
  message: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Shared "no data" state for empty lists. The icon sits in a soft circle tinted
 * from the surface, and both the circle and icon use a *darker shade of the
 * background tone* so the state reads as a deliberate, calm placeholder in both
 * light and dark themes (rather than a barely-visible pale glyph).
 */
export function EmptyState({ icon: Icon, message, style }: EmptyStateProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.circle}>
        <Icon size={34} color={c.textFaint} strokeWidth={1.75} />
      </View>
      <ThemedText style={styles.message} type="defaultSemiBold">
        {message}
      </ThemedText>
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  wrap: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 14,
  },
  circle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: c.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    color: c.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
