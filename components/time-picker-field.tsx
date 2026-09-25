/**
 * A time-of-day field, matching `DatePickerField`'s prop shape and trigger
 * style so the two sit naturally beside each other on a form (the
 * meeting-room booking form needs a start/end time per date row, and no
 * shared time input existed before this one — the only precedent,
 * app/timestamp/detail.tsx, inlines the native picker by hand rather than
 * through a reusable component).
 *
 * Native (iOS/Android) uses @react-native-community/datetimepicker, the same
 * library and open/close pattern that inline precedent uses:
 *   - Android: DateTimePickerAndroid.open() — a native dialog, no modal state
 *     of our own to manage.
 *   - iOS: the spinner inside the app's bottom `Sheet`, committed by "เสร็จ".
 *     Not inline under the trigger: the spinner's intrinsic width is wider
 *     than a half-width column, so an end-time field there overflowed the
 *     screen's right edge.
 * Web has no native time picker in Expo's RN runtime, so the trigger opens
 * the app-wide `SelectSheet` with one combined "HH:MM" list — hour and minute
 * picked together in one sheet, not two separate taps/sheets, the same as a
 * single native time-picker dialog reads as one action. The list is half-hour
 * slots from 06:00 to 23:30 (`TIME_OPTIONS`/`MINUTE_INTERVAL`/
 * `DAY_START_HOUR`) — meeting-room bookings are scheduled on the hour or the
 * half-hour, never any finer, and never before the building opens.
 */
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Clock } from 'lucide-react-native';
import { useContext, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { SelectSheet } from '@/components/ui/select-sheet';
import { Sheet } from '@/components/ui/sheet';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { ThemeContext } from '@/context/theme-context';

type TimePickerFieldProps = {
  label: string;
  /** Hide the text label above the field (still used for the "เลือก{label}" placeholder). */
  hideLabel?: boolean;
  value: Date | null;
  hasError?: boolean;
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  iconColor?: string;
  iconSize?: number;
  /**
   * Web and iOS: blocks every time at or before this Date's time-of-day — an
   * end-time field passes its paired start time so it can never even be set
   * to an invalid value. Android's own time dialog has no such option; the
   * screen's own validation enforces the rule there, and stays the real
   * backstop everywhere.
   */
  minExclusive?: Date | null;
  onChange: (date: Date) => void;
};

const MINUTE_INTERVAL = 30;
// The building isn't open before this — no meeting-room slot starts earlier,
// so the list's first item is 06:00 rather than midnight.
const DAY_START_HOUR = 6;

// Every half-hour slot from 06:00 through 23:30 — one flat list so the web
// picker selects a whole time in one sheet rather than hour and minute apart.
const TIME_OPTIONS = Array.from(
  { length: ((24 - DAY_START_HOUR) * 60) / MINUTE_INTERVAL },
  (_, i) => {
    const totalMinutes = DAY_START_HOUR * 60 + i * MINUTE_INTERVAL;
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const minutes = String(totalMinutes % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
  },
);
const TIME_SHEET_OPTIONS = TIME_OPTIONS.map((time) => ({ id: time, label: time }));

function formatTime(date: Date | null) {
  if (!date) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function withTimeParts(base: Date | null, hours: number, minutes: number) {
  const date = base ? new Date(base) : new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

const DAY_START_MINUTES = DAY_START_HOUR * 60;
const DAY_END_MINUTES = 24 * 60 - MINUTE_INTERVAL;

function minutesOf(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function atMinutes(base: Date | null, minutes: number) {
  return withTimeParts(base, Math.floor(minutes / 60), minutes % 60);
}

/** Earliest selectable slot, as minutes since midnight. */
function earliestMinutes(minExclusive?: Date | null) {
  return minExclusive
    ? Math.max(DAY_START_MINUTES, minutesOf(minExclusive) + MINUTE_INTERVAL)
    : DAY_START_MINUTES;
}

/**
 * What the iOS spinner opens on. It must already sit on a real slot: iOS only
 * fires onChange when the wheel moves, so tapping "เสร็จ" without scrolling
 * commits exactly this value, and an unrounded "now" would save e.g. 13:47.
 */
function initialDraft(value: Date | null, minExclusive?: Date | null) {
  if (value) return value;
  const now = new Date();
  const roundedNow = Math.ceil(minutesOf(now) / MINUTE_INTERVAL) * MINUTE_INTERVAL;
  const minutes = Math.min(DAY_END_MINUTES, Math.max(earliestMinutes(minExclusive), roundedNow));
  return atMinutes(now, minutes);
}

export function TimePickerField({
  label,
  hideLabel,
  value,
  hasError,
  buttonStyle,
  textStyle,
  iconColor,
  iconSize = 16,
  minExclusive,
  onChange,
}: TimePickerFieldProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const isDarkMode = useContext(ThemeContext)?.isDarkMode ?? false;
  const [iosDraft, setIosDraft] = useState<Date | null>(null);
  const [isWebSheetOpen, setIsWebSheetOpen] = useState(false);

  const timeSheetOptions = minExclusive
    ? TIME_SHEET_OPTIONS.filter((option) => option.id > formatTime(minExclusive))
    : TIME_SHEET_OPTIONS;

  // Android's picker is its own dialog, already closed by the time this fires.
  const handleAndroidChange = (event: DateTimePickerEvent, nextDate?: Date) => {
    if (event.type === 'set' && nextDate) {
      onChange(nextDate);
    }
  };

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: value ?? new Date(),
        mode: 'time',
        is24Hour: true,
        display: 'default',
        minuteInterval: MINUTE_INTERVAL,
        onChange: handleAndroidChange,
      });
      return;
    }
    if (Platform.OS === 'ios') {
      setIosDraft(initialDraft(value, minExclusive));
      return;
    }
    setIsWebSheetOpen(true);
  };

  const confirmIosDraft = () => {
    if (iosDraft) onChange(iosDraft);
    setIosDraft(null);
  };

  const selectTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    onChange(withTimeParts(value, hours, minutes));
    setIsWebSheetOpen(false);
  };

  return (
    <View style={styles.container}>
      {hideLabel ? null : <ThemedText type="defaultSemiBold">{label}</ThemedText>}

      <Pressable
        accessibilityRole="button"
        onPress={openPicker}
        style={[styles.button, hasError ? styles.inputError : undefined, buttonStyle]}>
        <Clock size={iconSize} color={iconColor ?? c.textMuted} />
        <ThemedText
          numberOfLines={1}
          style={[styles.buttonText, !value && styles.placeholder, textStyle]}>
          {formatTime(value) || `เลือก${label}`}
        </ThemedText>
      </Pressable>

      {Platform.OS === 'web' ? (
        <SelectSheet
          visible={isWebSheetOpen}
          onClose={() => setIsWebSheetOpen(false)}
          title={label}
          options={timeSheetOptions}
          selectedId={value ? formatTime(value) : undefined}
          onSelect={(option) => selectTime(option.id)}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Sheet
          visible={iosDraft !== null}
          onClose={() => setIosDraft(null)}
          title={label}
          scroll={false}>
          {iosDraft ? (
            <View style={styles.iosSheetBody}>
              <DateTimePicker
                value={iosDraft}
                mode="time"
                display="spinner"
                is24Hour
                locale="en_GB"
                minuteInterval={MINUTE_INTERVAL}
                minimumDate={atMinutes(iosDraft, earliestMinutes(minExclusive))}
                maximumDate={atMinutes(iosDraft, DAY_END_MINUTES)}
                themeVariant={isDarkMode ? 'dark' : 'light'}
                onChange={(_event, next) => {
                  if (next) setIosDraft(next);
                }}
                style={styles.iosSpinner}
              />
              <Button title="เสร็จ" onPress={confirmIosDraft} />
            </View>
          ) : null}
        </Sheet>
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, gap: 8 },
  button: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.inputBorder,
    paddingVertical: 6,
  },
  inputError: {
    borderBottomWidth: 1.5,
    borderBottomColor: c.danger,
  },
  buttonText: { flex: 1, color: c.text, fontSize: 15 },
  placeholder: { color: c.textFaint },
  iosSheetBody: { gap: 12, paddingBottom: 4 },
  iosSpinner: { alignSelf: 'stretch' },
});
