import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

// Thai weekday abbreviations, Sunday first — shared default for every calendar.
const DEFAULT_WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export type MonthCalendarProps = {
  /** First-of-month Date for the visible month (the day component is ignored). */
  visibleMonth: Date;
  /** Single-line header label, e.g. "กรกฎาคม 2569" — the caller owns formatting. */
  monthLabel: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  /**
   * Render the content of one day cell. The 1/7-width column wrapper (with its
   * 2px gutter) is provided by the shell — the returned element stretches to
   * fill it, so callers only style the inner day pill.
   */
  renderDay: (date: Date) => ReactNode;
  /** Weekday header labels, Sunday first. Defaults to Thai abbreviations. */
  weekdayLabels?: string[];
  /** Colour the Sat/Sun weekday labels with the brand accent. */
  colorWeekendLabels?: boolean;
  /** Optional content rendered below the grid (e.g. a legend). */
  footer?: ReactNode;
  /** Accessibility labels for the prev/next month buttons. */
  prevLabel?: string;
  nextLabel?: string;
  /** Style override for the outer card (border, shadow, maxWidth…). */
  style?: StyleProp<ViewStyle>;
  /** Style override for the padded body wrapping the weekday row + grid. */
  bodyStyle?: StyleProp<ViewStyle>;
};

// Sunday-first month matrix: leading blanks to align the 1st on its weekday,
// then one Date per day. Callers key off the Date in `renderDay`.
function getMonthMatrix(visibleMonth: Date): (Date | null)[] {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const leading = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  return cells;
}

/**
 * Shared calendar chrome: the bordered card, the primary month-nav header band
 * (deep-red circular prev/next buttons + a single-line month label), the
 * weekday-name row, and the Sunday-first day grid. Day cells are provided by the
 * caller via `renderDay`, since each screen styles days differently (single-date
 * picker, per-day status, …). Used by the absence date-picker and the timestamp
 * calendar; the executive calendar shares the same brand tokens via its library
 * theme.
 */
export function MonthCalendar({
  visibleMonth,
  monthLabel,
  onPrevMonth,
  onNextMonth,
  renderDay,
  weekdayLabels = DEFAULT_WEEKDAYS,
  colorWeekendLabels = false,
  footer,
  prevLabel,
  nextLabel,
  style,
  bodyStyle,
}: MonthCalendarProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const cells = useMemo(() => getMonthMatrix(visibleMonth), [visibleMonth]);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={prevLabel}
          onPress={onPrevMonth}
          style={styles.navButton}>
          <ChevronLeft size={20} color={c.textOnPrimary} />
        </Pressable>
        <ThemedText style={styles.monthLabel}>{monthLabel}</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={nextLabel}
          onPress={onNextMonth}
          style={styles.navButton}>
          <ChevronRight size={20} color={c.textOnPrimary} />
        </Pressable>
      </View>

      <View style={[styles.body, bodyStyle]}>
        <View style={styles.weekRow}>
          {weekdayLabels.map((label, index) => (
            <View key={`${label}-${index}`} style={styles.weekCell}>
              <ThemedText
                style={[
                  styles.weekLabel,
                  colorWeekendLabels && (index === 0 || index === 6)
                    ? styles.weekendLabel
                    : undefined,
                ]}>
                {label}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((date, index) =>
            date ? (
              <View key={date.toISOString()} style={styles.dayCell}>
                {renderDay(date)}
              </View>
            ) : (
              <View key={`blank-${index}`} style={styles.dayCell} />
            ),
          )}
        </View>

        {footer}
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  // Primary month-nav band — mirrors the timestamp/executive calendar headers.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.primary,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primaryDeep,
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: c.textOnPrimary,
    fontFamily: AppFonts.psuBold,
  },
  body: {
    padding: 12,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: 12,
    textAlign: 'center',
    color: c.textMuted,
    fontFamily: AppFonts.psuBold,
  },
  weekendLabel: {
    color: c.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // Outer column only reserves the 1/7 width + gutter; the caller's day pill
  // stretches to fill it.
  dayCell: {
    width: `${100 / 7}%`,
    padding: 2,
  },
});
