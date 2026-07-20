/**
 * ListItem — the standard row for all lists and settings/menu screens.
 *
 * Leading icon (in a soft circle) or a custom leading element, title/subtitle,
 * an optional trailing value + chevron, and press feedback. ≥56pt tall for a
 * comfortable touch target. Themed via useColors().
 */
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { useColors } from '@/constants/theme';

type ListItemProps = {
  title: string;
  subtitle?: string;
  leadingIcon?: IconSymbolName;
  /** Overrides the tint of the leading icon + its soft circle (default brand). */
  leadingColor?: string;
  /** Custom leading node (e.g. an avatar); takes precedence over leadingIcon. */
  leadingElement?: React.ReactNode;
  trailingText?: string;
  /** Trailing icon; defaults to a chevron when onPress is set. */
  trailingIcon?: IconSymbolName;
  onPress?: () => void;
  /** Renders title + leading tint in the danger color (e.g. logout/delete). */
  danger?: boolean;
  showDivider?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ListItem({
  title,
  subtitle,
  leadingIcon,
  leadingColor,
  leadingElement,
  trailingText,
  trailingIcon,
  onPress,
  danger = false,
  showDivider = false,
  style,
}: ListItemProps) {
  const c = useColors();
  const tint = danger ? c.danger : leadingColor ?? c.primary;
  const resolvedTrailingIcon = trailingIcon ?? (onPress ? 'chevron.right' : undefined);

  const content = (
    <>
      {leadingElement ? (
        <View style={styles.leading}>{leadingElement}</View>
      ) : leadingIcon ? (
        <View style={[styles.iconCircle, { backgroundColor: danger ? c.dangerSoft : c.primarySoft }]}>
          <IconSymbol name={leadingIcon} size={20} color={tint} />
        </View>
      ) : null}

      <View style={styles.body}>
        <Text numberOfLines={1} style={[styles.title, { color: danger ? c.danger : c.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={2} style={[styles.subtitle, { color: c.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailingText ? (
        <Text numberOfLines={1} style={[styles.trailingText, { color: c.textMuted }]}>
          {trailingText}
        </Text>
      ) : null}
      {resolvedTrailingIcon ? <IconSymbol name={resolvedTrailingIcon} size={18} color={c.textFaint} /> : null}
    </>
  );

  const rowStyle: StyleProp<ViewStyle> = [
    styles.row,
    showDivider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [rowStyle, pressed && { backgroundColor: c.surfaceMuted }]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={rowStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leading: { alignItems: 'center', justifyContent: 'center' },
  iconCircle: { height: 40, width: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 15, lineHeight: 20, fontFamily: AppFonts.psuBold },
  subtitle: { fontSize: 13, lineHeight: 18, fontFamily: AppFonts.psuRegular },
  trailingText: { fontSize: 14, lineHeight: 18, fontFamily: AppFonts.psuRegular, maxWidth: 140 },
});
