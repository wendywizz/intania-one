import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type DatePickerFieldProps = {
  label: string;
  value: Date | null;
  minimumDate?: Date;
  maximumDate?: Date;
  highlightedStartDate?: Date | null;
  hasError?: boolean;
  onChange: (date: Date) => void;
};

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function DatePickerField({
  label,
  value,
  minimumDate,
  maximumDate,
  hasError,
  onChange,
}: DatePickerFieldProps) {
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const displayValue = value ? formatDisplayDate(value) : '';

  const handlePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') {
      setIsPickerVisible(false);
    }

    if (event.type === 'set' && selectedDate) {
      onChange(selectedDate);
    }
  };

  const showPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: value ?? minimumDate ?? new Date(),
        mode: 'date',
        minimumDate,
        maximumDate,
        onChange: handlePickerChange,
      });
      return;
    }

    setIsPickerVisible(true);
  };

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={showPicker}
        style={[styles.button, hasError ? styles.inputError : undefined]}>
        <ThemedText style={[styles.buttonText, !value && styles.placeholder]}>
          {displayValue || `เลือก${label}`}
        </ThemedText>
      </Pressable>

      {isPickerVisible ? (
        <DateTimePicker
          value={value ?? minimumDate ?? new Date()}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handlePickerChange}
        />
      ) : null}
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
});
