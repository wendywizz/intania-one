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
  hasError?: boolean;
  onChange: (date: Date) => void;
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function DatePickerField({
  label,
  value,
  minimumDate,
  hasError,
  onChange,
}: DatePickerFieldProps) {
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const displayValue = value ? formatDate(value) : '';

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
