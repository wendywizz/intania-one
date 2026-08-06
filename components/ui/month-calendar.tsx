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

// Sunday-first month matrix, one array per week: leading blanks to align the 1st
// on its weekday, one Date per day, then trailing blanks so every week is
// exactly 7 cells. Callers key off the Date in `renderDay`.
//
// Weeks are laid out as explicit non-wrapping rows of seven `flex: 1` cells
// rather than one wrapping row of 1/7-width cells: Android rounds every child's
// width up to the pixel grid, so seven 14.2857% cells overflow the row and the
// seventh wraps — which silently shifted every date one column per week.
function getMonthMatrix(visibleMonth: Date): (Date | null)[][] {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const leading = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
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
  const weeks = useMemo(() => getMonthMatrix(visibleMonth), [visibleMonth]);

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
          {weeks.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.weekLine}>
              {week.map((date, dayIndex) =>
                date ? (
                  <View key={date.toISOString()} style={styles.dayCell}>
                    {renderDay(date)}
                  </View>
                ) : (
                  <View key={`blank-${weekIndex}-${dayIndex}`} style={styles.dayCell} />
                ),
              )}
            </View>
          ))}
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
  // Same `flex: 1` sizing as a day cell, so a weekday name always sits over its
  // own column.
  weekCell: {
    flex: 1,
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
    flexDirection: 'column',
  },
  weekLine: {
    flexDirection: 'row',
  },
  // Outer column only reserves its share of the week + the gutter; the caller's
  // day pill stretches to fill it. `flex: 1` (not a 1/7 width) so the seven
  // cells always divide the row exactly, whatever the pixel rounding.
  dayCell: {
    flex: 1,
    padding: 2,
  },
});
