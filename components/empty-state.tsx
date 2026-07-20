import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

type EmptyStateProps = {
  /**
   * Preferred: an icon from the shared IconSymbol set (avoids the lucide barrel
   * import). Falls back to `icon` when not provided.
   */
  iconName?: IconSymbolName;
  /** @deprecated Pass `iconName` instead — a direct LucideIcon pulls in the barrel. */
  icon?: LucideIcon;
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
export function EmptyState({ iconName, icon: Icon, message, style }: EmptyStateProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.circle}>
        {iconName ? (
          <IconSymbol name={iconName} size={34} color={c.textFaint} />
        ) : Icon ? (
          <Icon size={34} color={c.textFaint} strokeWidth={1.75} />
        ) : null}
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
