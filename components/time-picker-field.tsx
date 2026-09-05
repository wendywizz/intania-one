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
 *   - iOS: an inline spinner shown under the trigger, dismissed by a "เสร็จ"
 *     button, since iOS has no native modal for this picker.
 * Web has no native time picker in Expo's RN runtime, so it falls back to two
 * plain numeric TextInputs (hour, minute) — simpler than reproducing the
 * SelectSheet-based dropdown pair app/timestamp/detail.tsx builds for its own
 * web fallback, and this field is used in a repeatable list (one row per
 * date), where a lighter fallback matters more than matching that screen
 * pixel-for-pixel.
 */
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Clock } from 'lucide-react-native';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

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
  onChange: (date: Date) => void;
};

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

export function TimePickerField({
  label,
  hideLabel,
  value,
  hasError,
  buttonStyle,
  textStyle,
  iconColor,
  iconSize = 16,
  onChange,
}: TimePickerFieldProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [isIosPickerOpen, setIsIosPickerOpen] = useState(false);

  const handleChange = (event: DateTimePickerEvent, nextDate?: Date) => {
    if (Platform.OS === 'android') {
      // Android's picker is its own dialog, already closed by the time this fires.
      if (event.type === 'set' && nextDate) {
        onChange(nextDate);
      }
      return;
    }
    if (nextDate) {
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
        onChange: handleChange,
      });
      return;
    }
    if (Platform.OS === 'ios') {
      setIsIosPickerOpen(true);
    }
    // web: nothing to open — the two numeric fields below handle it directly.
  };

  const setHour = (raw: string) => {
    const hours = Number(raw.replace(/[^0-9]/g, ''));
    if (Number.isNaN(hours) || raw === '') return;
    onChange(withTimeParts(value, Math.min(23, hours), value?.getMinutes() ?? 0));
  };

  const setMinute = (raw: string) => {
    const minutes = Number(raw.replace(/[^0-9]/g, ''));
    if (Number.isNaN(minutes) || raw === '') return;
    onChange(withTimeParts(value, value?.getHours() ?? 0, Math.min(59, minutes)));
  };

  return (
    <View style={styles.container}>
      {hideLabel ? null : <ThemedText type="defaultSemiBold">{label}</ThemedText>}

      {Platform.OS === 'web' ? (
        <View style={[styles.button, hasError ? styles.inputError : undefined, buttonStyle, styles.webRow]}>
          <Clock size={iconSize} color={iconColor ?? c.textMuted} />
          <TextInput
            value={value ? String(value.getHours()).padStart(2, '0') : ''}
            onChangeText={setHour}
            placeholder="HH"
            placeholderTextColor={c.textFaint}
            keyboardType="number-pad"
            maxLength={2}
            style={[styles.webInput, textStyle]}
          />
          <ThemedText style={styles.webColon}>:</ThemedText>
          <TextInput
            value={value ? String(value.getMinutes()).padStart(2, '0') : ''}
            onChangeText={setMinute}
            placeholder="MM"
            placeholderTextColor={c.textFaint}
            keyboardType="number-pad"
            maxLength={2}
            style={[styles.webInput, textStyle]}
          />
        </View>
      ) : (
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
      )}

      {Platform.OS === 'ios' && isIosPickerOpen ? (
        <>
          <DateTimePicker
            value={value ?? new Date()}
            mode="time"
            display="spinner"
            is24Hour
            onChange={handleChange}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsIosPickerOpen(false)}
            style={styles.doneButton}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              เสร็จ
            </ThemedText>
          </Pressable>
        </>
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
  webRow: { justifyContent: 'flex-start' },
  webInput: {
    color: c.text,
    fontSize: 15,
    minWidth: 28,
    textAlign: 'center',
    paddingVertical: 0,
  },
  webColon: { color: c.text, fontSize: 15 },
  doneButton: {
    alignSelf: 'flex-end',
    backgroundColor: c.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
