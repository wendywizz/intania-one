/**
 * The booking type, as an icon and a sentence.
 *
 * Which of the three forms was filled in is what decides whether a booking
 * holds one date or sixty, so it is stated wherever a booking's dates are
 * shown. The three types differ in exactly one way that matters — how the dates
 * were generated — so the icon says it before the words do: one date, a repeat,
 * or a repeat inside a fixed range.
 *
 * Shared so the icon, the wording and the spacing cannot drift between the
 * screens that show it.
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import type { BookingTypeCode } from '@/services/bookingRoomService';

export function bookingTypeIcon(code: BookingTypeCode) {
  if (code === 'TERM') return 'arrow.triangle.2.circlepath' as const;
  if (code === 'PERIOD') return 'calendar-range' as const;
  if (code === 'DAY') return 'calendar' as const;
  return 'calendar-clock' as const;
}

export function bookingTypeNote(code: BookingTypeCode) {
  if (code === 'TERM') return TEXT.BOOKING_ROOM_SLOT_TYPE_TERM;
  if (code === 'PERIOD') return TEXT.BOOKING_ROOM_SLOT_TYPE_PERIOD;
  if (code === 'DAY') return TEXT.BOOKING_ROOM_SLOT_TYPE_DAY;
  return TEXT.BOOKING_ROOM_SLOT_TYPE_UNKNOWN;
}

export function BookingTypeStrip({
  code,
  label,
  /** Draw the hairline underneath. Off when the strip ends a card. */
  divided = true,
}: {
  code: BookingTypeCode;
  label: string;
  divided?: boolean;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.strip, divided && styles.stripDivided]}>
      <View style={styles.icon}>
        <IconSymbol name={bookingTypeIcon(code)} size={20} color={c.primary} />
      </View>
      <View style={styles.text}>
        <ThemedText style={styles.title}>{label}</ThemedText>
        <ThemedText style={styles.note}>{bookingTypeNote(code)}</ThemedText>
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    strip: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    stripDivided: {
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    icon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primarySoft,
    },
    text: { flex: 1, gap: 4 },
    title: { fontSize: 16, lineHeight: 24, color: c.text, fontFamily: AppFonts.psuBold },
    note: { fontSize: 14, lineHeight: 22, color: c.textMuted },
  });
