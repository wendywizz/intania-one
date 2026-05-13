import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import {colors} from '../constants/colors';

export function Screen({children}: {children: React.ReactNode}) {
  return <ScrollView contentContainerStyle={styles.screen}>{children}</ScrollView>;
}

export function Section({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function Card({children, style}: {children: React.ReactNode; style?: ViewStyle}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        pressed && styles.buttonPressed,
      ]}>
      <Text style={[styles.buttonText, variant === 'secondary' && styles.buttonSecondaryText]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function EmptyState({message = 'No data'}: {message?: string}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.muted}>{message}</Text>
    </View>
  );
}

export function LoadingState() {
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  multiline,
  placeholder,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  editable?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder={placeholder}
        editable={editable}
        style={[styles.input, multiline && styles.textarea]}
      />
    </View>
  );
}

export function DetailRow({label, value}: {label: string; value?: unknown}) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{String(value)}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: {
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonDanger: {
    backgroundColor: colors.danger,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonSecondaryText: {
    color: colors.text,
  },
  muted: {
    color: colors.mutedText,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  field: {
    gap: 6,
  },
  label: {
    color: colors.text,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#fff',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  textarea: {
    minHeight: 96,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  detailRow: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 3,
    paddingTop: 8,
  },
  detailLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: colors.text,
    fontSize: 15,
  },
});
