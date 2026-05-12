import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { TEXT } from '@/constants/text';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type DatePickerFieldProps = {
  label: string;
  value: Date | null;
  minimumDate?: Date;
  hasError?: boolean;
  onChange: (date: Date) => void;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getMonthTitle(date: Date) {
  return date.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  });
}

function getCalendarDays(monthDate: Date) {
  const firstDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const firstDay = firstDate.getDay();
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const days: (Date | null)[] = [];

  for (let index = 0; index < firstDay; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }

  return days;
}

export function DatePickerField({
  label,
  value,
  minimumDate,
  hasError,
  onChange,
}: DatePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(value ?? minimumDate ?? new Date());
  const minimumDay = minimumDate ? startOfDay(minimumDate) : null;
  const days = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);

  const changeMonth = (offset: number) => {
    setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1));
  };

  const selectDate = (date: Date) => {
    onChange(date);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
        style={[styles.button, hasError ? styles.inputError : undefined]}>
        <ThemedText style={[styles.buttonText, !value && styles.placeholder]}>
          {value ? formatDate(value) : `เลือก${label}`}
        </ThemedText>
      </Pressable>

      <Modal transparent visible={isOpen} animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <Pressable>
            <ThemedView style={styles.calendar} lightColor="#FFFFFF" darkColor="#151718">
              <View style={styles.calendarHeader}>
                <Pressable accessibilityRole="button" onPress={() => changeMonth(-1)} style={styles.monthButton}>
                  <ThemedText type="defaultSemiBold">{TEXT.LT}</ThemedText>
                </Pressable>
                <ThemedText type="defaultSemiBold" style={styles.monthTitle}>
                  {getMonthTitle(visibleMonth)}
                </ThemedText>
                <Pressable accessibilityRole="button" onPress={() => changeMonth(1)} style={styles.monthButton}>
                  <ThemedText type="defaultSemiBold">{TEXT.GT}</ThemedText>
                </Pressable>
              </View>

              <View style={styles.weekRow}>
                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, index) => (
                  <ThemedText key={`${day}-${index}`} style={styles.weekLabel}>
                    {day}
                  </ThemedText>
                ))}
              </View>

              <View style={styles.dayGrid}>
                {days.map((date, index) => {
                  const isDisabled = Boolean(date && minimumDay && startOfDay(date) < minimumDay);
                  const isSelected = Boolean(
                    date && value && formatDate(date) === formatDate(value),
                  );

                  return (
                    <Pressable
                      key={date ? formatDate(date) : `empty-${index}`}
                      accessibilityRole={date ? 'button' : undefined}
                      disabled={!date || isDisabled}
                      onPress={() => date && selectDate(date)}
                      style={[
                        styles.dayButton,
                        isSelected ? styles.selectedDayButton : undefined,
                        isDisabled ? styles.disabledDayButton : undefined,
                      ]}>
                      {date ? (
                        <ThemedText
                          lightColor={isSelected ? '#FFFFFF' : undefined}
                          darkColor={isSelected ? '#FFFFFF' : undefined}
                          style={[styles.dayText, isDisabled ? styles.disabledDayText : undefined]}>
                          {date.getDate()}
                        </ThemedText>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 8,
  },
  button: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#BFD2DA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: '#B42318',
  },
  buttonText: {
    color: '#11181C',
  },
  placeholder: {
    color: '#8A969C',
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: 24,
  },
  calendar: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 8,
    padding: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#E4F0F6',
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: '#687076',
    fontSize: 12,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayButton: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  selectedDayButton: {
    backgroundColor: '#0A6E8A',
  },
  disabledDayButton: {
    opacity: 0.35,
  },
  dayText: {
    textAlign: 'center',
  },
  disabledDayText: {
    color: '#8A969C',
  },
});
