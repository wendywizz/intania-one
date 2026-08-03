import { MapPin } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { boxShadow } from '@/constants/shadows';

export type EventTimelineItemProps = {
  /**
   * Time shown in the left gutter. May contain a line break for a start/end
   * range (e.g. "09:00\n12:00"); shown as "—" when empty.
   */
  time?: string;
  /** Shorthand body: a single line. Ignored when `children` is given. */
  title?: string;
  location?: string;
  /**
   * The card body. Given this, the row renders it verbatim and ignores
   * `title`/`location` — that is how a screen with more to say (a booking with
   * a lecturer and a purpose, a job with a status chip) keeps the same rail and
   * time gutter as everything else while owning what sits beside them.
   */
  children?: ReactNode;
  /**
   * Overrides for the card — background and border.
   *
   * For lists where each entry carries a colour of its own: a room booking is
   * given one when it is made, and the website draws it in that colour, so the
   * app shows the same. Callers that set a background own the contrast of
   * whatever they render inside it.
   */
  cardStyle?: StyleProp<ViewStyle>;
  /** Dot colour, so the rail marker can follow the card. Defaults to primary. */
  dotColor?: string;
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
  cardStyle,
  dotColor,
  onPress,
}: EventTimelineItemProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  // A two-line time is a start and an end; anything else is one moment.
  const isRange = Boolean(time && time.includes('\n'));

  const body = (
    <>
      <View style={styles.timeCol}>
        <ThemedText style={styles.timeText} numberOfLines={2}>
          {time || '—'}
        </ThemedText>
      </View>
      <View style={styles.rail}>
        <View style={styles.railLine} />
        {/* The dot marks the slot, so it sits level with the middle of the time
            it marks: between the two lines of a start/end range, or on the
            single line when there is only one time. Both offsets are the time
            column's own geometry (its 20pt top padding + 16pt line height),
            which is why they are derived from it rather than guessed. */}
        <View
          style={[
            styles.dot,
            isRange ? styles.dotRange : styles.dotSingle,
            dotColor ? { backgroundColor: dotColor } : undefined,
          ]}
        />
      </View>
      <View style={[styles.card, cardStyle]}>
        {/* The rail, the time gutter and this card are the shared part. What
            goes inside the card is the caller's: pass `children` and the row
            renders exactly that. `title`/`location` stay as a shorthand for the
            common "one line and a place" case so simple screens need no body of
            their own — they are ignored once `children` is given. */}
        {children ?? (
          <>
            <ThemedText style={styles.title} numberOfLines={2}>
              {title}
            </ThemedText>
            {location ? (
              <View style={styles.metaRow}>
                <MapPin size={13} color={c.textMuted} />
                <ThemedText style={styles.metaText} numberOfLines={2}>
                  {location}
                </ThemedText>
              </View>
            ) : null}
          </>
        )}
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

/** Time-column geometry the dot is aligned against. */
const TIME_TOP = 20;
const TIME_LINE = 16;
const DOT_SIZE = 14;

const makeStyles = (c: AppColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  timeCol: {
    width: 38,
    alignItems: 'flex-end',
    paddingTop: TIME_TOP,
  },
  timeText: {
    fontSize: 13,
    lineHeight: TIME_LINE,
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
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: c.primary,
    borderWidth: 3,
    borderColor: c.background,
  },
  // Halfway between the two time lines — the gap the range spans.
  dotRange: { marginTop: TIME_TOP + TIME_LINE - DOT_SIZE / 2 },
  // Level with the middle of the one line there is.
  dotSingle: { marginTop: TIME_TOP + TIME_LINE / 2 - DOT_SIZE / 2 },
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
    boxShadow: boxShadow(c.shadow, { y: 3, blur: 10, opacity: 0.06 }),
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
