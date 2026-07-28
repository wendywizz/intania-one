import { CalendarDays } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { DAY_STATUS_STYLE } from '@/constants/calendar-status';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { TEXT } from '@/constants/text';

import { ThemedText } from '@/components/themed-text';
import { MonthCalendar } from '@/components/ui';

type DatePickerFieldProps = {
  label: string;
  /** Hide the text label above the field (the label is still used for the
   * placeholder "เลือก{label}"). */
  hideLabel?: boolean;
  value: Date | null;
  minimumDate?: Date;
  maximumDate?: Date;
  highlightedStartDate?: Date | null;
  hasError?: boolean;
  /** Set of 'YYYY-MM-DD' keys that are public holidays — shown greyed and
   * non-selectable, like weekends. */
  holidays?: Set<string>;
  /** Map of 'YYYY-MM-DD' -> holiday name (reserved for future tooltip use). */
  holidayNames?: Map<string, string>;
  /** Fired with the year and 1-based month whenever the visible month changes
   * (and on open), so holidays for that month can be loaded lazily. */
  onVisibleMonthChange?: (year: number, month: number) => void;
  onChange: (date: Date) => void;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function isWeekendDate(date: Date) {
  const dayOfWeek = date.getDay();

  return dayOfWeek === 0 || dayOfWeek === 6;
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getMonthTitle(date: Date) {
  return date.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  });
}

export function DatePickerField({
  label,
  hideLabel,
  value,
  minimumDate,
  maximumDate,
  highlightedStartDate,
  hasError,
  holidays,
  onVisibleMonthChange,
  onChange,
}: DatePickerFieldProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [isOpen, setIsOpen] = useState(false);
  const [isMonthLoading, setIsMonthLoading] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(value ?? minimumDate ?? new Date());
  const minimumDay = minimumDate ? startOfDay(minimumDate) : null;
  const maximumDay = maximumDate ? startOfDay(maximumDate) : null;
  const rangeStartDay = highlightedStartDate ? startOfDay(highlightedStartDate) : null;
  const rangeEndDay = rangeStartDay && value ? startOfDay(value) : rangeStartDay;

  const isHolidayDate = (date: Date) => Boolean(holidays?.has(formatDateKey(date)));

  // Load the holidays for whichever month is on screen (and each time it opens),
  // and keep the calendar hidden behind a spinner until that month has finished
  // loading — so the days appear already marked with their holidays.
  useEffect(() => {
    if (!isOpen) return;
    const result = onVisibleMonthChange?.(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + 1,
    );
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      let cancelled = false;
      setIsMonthLoading(true);
      void (result as Promise<unknown>).finally(() => {
        if (!cancelled) setIsMonthLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }
    setIsMonthLoading(false);
  }, [isOpen, visibleMonth, onVisibleMonthChange]);

  const changeMonth = (offset: number) => {
    setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1));
  };

  const selectDate = (date: Date) => {
    if (isWeekendDate(date) || isHolidayDate(date)) {
      return;
    }

    onChange(date);
    setIsOpen(false);
  };

  const renderDay = (date: Date) => {
    const currentDay = startOfDay(date);
    const isWeekend = isWeekendDate(currentDay);
    const isHoliday = isHolidayDate(currentDay);
    // Out of the allowed range — greyed and non-selectable, but no
    // weekend/holiday colour.
    const isOutOfRange = Boolean(
      (minimumDay && currentDay < minimumDay) || (maximumDay && currentDay > maximumDay),
    );
    // Weekends and holidays stay full-colour (informational) but are still not
    // selectable.
    const isDisabled = isWeekend || isHoliday || isOutOfRange;
    const isSelected = Boolean(value && formatDateKey(date) === formatDateKey(value));
    const isHighlighted = Boolean(
      rangeStartDay &&
        rangeEndDay &&
        currentDay >= rangeStartDay &&
        currentDay <= rangeEndDay &&
        !isDisabled,
    );

    return (
      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={() => selectDate(date)}>
        <View
          style={[
            styles.dayInner,
            isHighlighted ? styles.highlightedDayButton : undefined,
            isWeekend ? styles.weekendDayButton : undefined,
            isHoliday ? styles.holidayDayButton : undefined,
            isSelected ? styles.selectedDayButton : undefined,
            isOutOfRange ? styles.disabledDayButton : undefined,
          ]}>
          <ThemedText
            lightColor={isSelected ? '#FFFFFF' : undefined}
            darkColor={isSelected ? '#FFFFFF' : undefined}
            style={[
              styles.dayText,
              isWeekend ? styles.weekendDayText : undefined,
              isHoliday ? styles.holidayDayText : undefined,
              isHighlighted ? styles.highlightedDayText : undefined,
              isOutOfRange ? styles.disabledDayText : undefined,
            ]}>
            {date.getDate()}
          </ThemedText>
        </View>
      </Pressable>
    );
  };

  const legend = (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, styles.weekendDayButton]} />
        <ThemedText style={styles.legendText}>{TEXT.DATE_PICKER_LEGEND_WEEKEND}</ThemedText>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, styles.holidayDayButton]} />
        <ThemedText style={styles.legendText}>{TEXT.DATE_PICKER_LEGEND_HOLIDAY}</ThemedText>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {hideLabel ? null : (
        <ThemedText type="defaultSemiBold">{label}</ThemedText>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
        style={[styles.button, hasError ? styles.inputError : undefined]}>
        <CalendarDays size={16} color={c.textMuted} />
        <ThemedText
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.buttonText, !value && styles.placeholder]}>
          {value ? formatDisplayDate(value) : `เลือก${label}`}
        </ThemedText>
      </Pressable>

      <Modal transparent visible={isOpen} animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <Pressable>
            {isMonthLoading ? (
              <View style={[styles.calendar, styles.loadingCard]}>
                <ActivityIndicator color={c.primary} />
                <ThemedText style={styles.loadingText}>
                  {TEXT.SHARED_LOADING_DATA_TITLE}
                </ThemedText>
              </View>
            ) : (
              <MonthCalendar
                style={styles.calendar}
                visibleMonth={visibleMonth}
                monthLabel={getMonthTitle(visibleMonth)}
                onPrevMonth={() => changeMonth(-1)}
                onNextMonth={() => changeMonth(1)}
                prevLabel={TEXT.DATE_PICKER_PREVIOUS_MONTH_LABEL}
                nextLabel={TEXT.DATE_PICKER_NEXT_MONTH_LABEL}
                renderDay={renderDay}
                // Colour description — only weekend and holiday, since those are the
                // non-working days a requester needs to recognise.
                footer={legend}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    gap: 8,
  },
  button: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.inputBorder,
    paddingHorizontal: 0,
    paddingVertical: 6,
  },
  inputError: {
    borderBottomWidth: 1.5,
    borderBottomColor: c.danger,
  },
  buttonText: {
    flex: 1,
    color: c.text,
    fontSize: 15,
  },
  placeholder: {
    color: c.textFaint,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: 24,
  },
  // Width/sizing only — the card surface, radius and header band come from the
  // shared MonthCalendar.
  calendar: {
    width: '100%',
    maxWidth: 360,
  },
  // Shown while the visible month's holidays are still loading, in place of the
  // calendar, so the days only appear once already marked.
  loadingCard: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
    backgroundColor: c.surface,
    borderRadius: 16,
  },
  loadingText: {
    fontSize: 14,
    color: c.textMuted,
  },
  // The inner day pill carries the colour and rounded shape; the shared grid
  // provides the 1/7 column around it.
  dayInner: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  selectedDayButton: {
    backgroundColor: c.info,
  },
  // Backgrounds mirror the timestamp calendar (the source of truth): weekends &
  // public holidays share the "holiday" grey; the requested leave span uses the
  // "leave" blue. See constants/calendar-status.ts.
  weekendDayButton: {
    backgroundColor: DAY_STATUS_STYLE.holiday.bg,
  },
  holidayDayButton: {
    backgroundColor: DAY_STATUS_STYLE.holiday.bg,
  },
  highlightedDayButton: {
    backgroundColor: DAY_STATUS_STYLE.leave.bg,
  },
  disabledDayButton: {
    opacity: 0.35,
  },
  dayText: {
    textAlign: 'center',
    fontSize: 14,
  },
  // Weekend numbers are brand-red like the timestamp calendar; holiday & leave
  // days keep the default dark number.
  weekendDayText: {
    color: c.primary,
  },
  holidayDayText: {
    color: c.text,
  },
  highlightedDayText: {
    color: c.text,
  },
  disabledDayText: {
    color: c.textFaint,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 14,
    paddingHorizontal: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  legendSwatch: {
    width: 16,
    height: 16,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: c.textMuted,
  },
});
