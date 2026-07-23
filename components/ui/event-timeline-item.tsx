import { MapPin } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

export type EventTimelineItemProps = {
  /**
   * Time shown in the left gutter. May contain a line break for a start/end
   * range (e.g. "09:00\n12:00"); shown as "—" when empty.
   */
  time?: string;
  title: string;
  location?: string;
  /** Extra meta row(s) rendered under the title (before the location). */
  children?: ReactNode;
  onPress?: () => void;
};

/**
 * The app-wide event/meeting row: the time sits in the left gutter, a dot on a
 * continuous vertical rail marks the moment, and the details float in a card on
 * the right. Rendered with no separators so consecutive rails read as one line.
 * Shared by the meeting lists and the executive calendar so every event looks
 * identical (same accent colour, backgrounds and font sizes).
 */
export function EventTimelineItem({
  time,
  title,
  location,
  children,
  onPress,
}: EventTimelineItemProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);

  const body = (
    <>
      <View style={styles.timeCol}>
        <ThemedText style={styles.timeText} numberOfLines={2}>
          {time || '—'}
        </ThemedText>
      </View>
      <View style={styles.rail}>
        <View style={styles.railLine} />
        <View style={styles.dot} />
      </View>
      <View style={styles.card}>
        <ThemedText style={styles.title} numberOfLines={2}>
          {title}
        </ThemedText>
        {children}
        {location ? (
          <View style={styles.metaRow}>
            <MapPin size={13} color={c.textMuted} />
            <ThemedText style={styles.metaText} numberOfLines={2}>
              {location}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
        {body}
      </Pressable>
    );
  }
  return <View style={styles.row}>{body}</View>;
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  timeCol: {
    width: 38,
    alignItems: 'flex-end',
    paddingTop: 20,
  },
  timeText: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: AppFonts.psuBold,
    color: c.primary,
  },
  rail: {
    width: 20,
    alignItems: 'center',
  },
  railLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 9,
    width: 2,
    backgroundColor: c.border,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: c.primary,
    borderWidth: 3,
    borderColor: c.background,
    marginTop: 18,
  },
  card: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 14,
    marginVertical: 6,
    marginLeft: 2,
    gap: 5,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
  title: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: AppFonts.psuBold,
    color: c.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppFonts.psuRegular,
    color: c.textMuted,
  },
});
