import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { boxShadow } from '@/constants/shadows';

export type ListCardBadge = {
  text: string;
  bg: string;
  color: string;
  /** Small leading glyph inside the badge, sized to the badge text. */
  icon?: ReactNode;
};

export type ListCardMeta = {
  /** Optional small leading icon (~13px) for the line. */
  icon?: ReactNode;
  /** Optional bold muted prefix (e.g. a field label). */
  label?: string;
  /** The meta value text. Lines with empty text are dropped. */
  text: string;
};

type ListCardProps = {
  /** Tapping the whole card. When omitted the card is static (no chevron). */
  onPress?: () => void;
  /** Icon element rendered inside the leading circle (e.g. an <IconSymbol/>). */
  icon?: ReactNode;
  /** Background colour of the leading icon circle (defaults to primarySoft). */
  iconBackground?: string;
  title: string;
  titleNumberOfLines?: number;
  /** Small muted line directly under the title (e.g. a date). */
  date?: string;
  /** Secondary lines under the title, all rendered with one canonical style so
   * every module's rows match. Prefer this over `children`. */
  meta?: ListCardMeta[];
  /** Escape hatch for genuinely custom content; prefer `meta`. */
  children?: ReactNode;
  /** Trailing status badge, shown before the chevron. */
  badge?: ListCardBadge | null;
  /** Show the trailing chevron. Defaults to true when `onPress` is set. */
  showChevron?: boolean;
  /** Override the card container style (margins, etc.). */
  style?: StyleProp<ViewStyle>;
};

// The app-wide list row: a flat card with a leading icon circle, a title +
// optional date/meta column, and a trailing badge/chevron. Every module's list
// uses this so rows look identical (see the timestamp/approve reference).
export function ListCard({
  onPress,
  icon,
  iconBackground,
  title,
  titleNumberOfLines = 2,
  date,
  meta,
  children,
  badge,
  showChevron,
  style,
}: ListCardProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const withChevron = showChevron ?? Boolean(onPress);
  const metaLines = (meta ?? []).filter((line) => line.text);

  const body = (
    <View style={[styles.card, style]}>
      {icon != null ? (
        <View style={[styles.iconCircle, iconBackground ? { backgroundColor: iconBackground } : null]}>
          {icon}
        </View>
      ) : null}
      <View style={styles.info}>
        <ThemedText style={styles.title} numberOfLines={titleNumberOfLines}>
          {title}
        </ThemedText>
        {date ? <ThemedText style={styles.date}>{date}</ThemedText> : null}
        {metaLines.map((line, index) => (
          <View key={index} style={styles.metaRow}>
            {line.icon != null ? <View style={styles.metaIcon}>{line.icon}</View> : null}
            <ThemedText style={styles.metaText} numberOfLines={1}>
              {line.label ? <ThemedText style={styles.metaLabel}>{line.label} </ThemedText> : null}
              {line.text}
            </ThemedText>
          </View>
        ))}
        {children}
      </View>
      {badge || withChevron ? (
        <View style={styles.right}>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              {badge.icon}
              <ThemedText style={[styles.badgeText, { color: badge.color }]} numberOfLines={1}>
                {badge.text}
              </ThemedText>
            </View>
          ) : null}
          {withChevron ? <ChevronRight size={16} color={c.textFaint} /> : null}
        </View>
      ) : null}
    </View>
  );

  if (!onPress) {
    return body;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {body}
    </Pressable>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 12,
    boxShadow: boxShadow(c.shadow, { y: 2, blur: 8, opacity: 0.04 }),
  },
  pressed: {
    opacity: 0.72,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    lineHeight: 21,
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  // Canonical secondary-text style shared by the date line and every meta line,
  // so all modules' rows use the same size/colour/font.
  date: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaIcon: {
    flexShrink: 0,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  metaLabel: {
    color: c.textMuted,
    fontFamily: AppFonts.psuBold,
  },
  // Pinned to the top of the row and capped at a quarter of the card so a long
  // status label ellipsizes instead of squeezing the title column.
  right: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    gap: 6,
    flexShrink: 0,
    maxWidth: '25%',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexShrink: 1,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: AppFonts.psuBold,
  },
});
