import { useState } from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { type AppColors, useThemedStyles } from '@/constants/theme';

import { SelectSheet } from "@/components/ui/select-sheet";
import { ThemedText } from "./themed-text";

export type ModalSelectOption = {
  label: string;
  value: string;
};

type ModalSelectFieldProps = {
  hasError?: boolean;
  options: ModalSelectOption[];
  placeholder: string;
  title: string;
  value: string;
  width?: number;
  /** Override the trigger button style (e.g. an underline field look). */
  buttonStyle?: StyleProp<ViewStyle>;
  onSelect: (value: string) => void;
};

export function ModalSelectField({
  hasError,
  options,
  placeholder,
  title,
  value,
  width,
  buttonStyle,
  onSelect,
}: ModalSelectFieldProps) {
  const styles = useThemedStyles(makeStyles);
  const selectedOption = options.find((option) => option.value === value);
  const [isOpen, setIsOpen] = useState(false);

  const close = () => setIsOpen(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
        style={[
          styles.button,
          width ? { width } : undefined,
          buttonStyle,
          hasError ? styles.inputError : undefined,
        ]}
      >
        <ThemedText style={[styles.buttonText, !selectedOption ? styles.placeholder : undefined]}>
          {selectedOption?.label || placeholder}
        </ThemedText>
      </Pressable>

      {/* The list is the app-wide SelectSheet, so a year/term/period choice
          looks and behaves like every other choice. Only the trigger above is
          this component's own — it has a distinct field look callers rely on. */}
      <SelectSheet
        visible={isOpen}
        onClose={close}
        title={title}
        options={options.map((option) => ({ id: option.value, label: option.label }))}
        selectedId={value}
        onSelect={(option) => onSelect(option.id)}
      />
    </>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: 8,
  },
  inputError: {
    borderColor: c.danger,
  },
  buttonText: {
    color: c.text,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  placeholder: {
    color: c.textFaint,
  },
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 520,
  },
  selectModal: {
    width: "100%",
    maxHeight: 540,
    borderRadius: 8,
    padding: 16,
  },
  selectModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  selectModalTitle: {
    flex: 1,
    fontSize: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: `${c.text}14`,
  },
  optionScroll: {
    maxHeight: 420,
  },
  optionScrollContent: {
    gap: 8,
  },
  option: {
    minHeight: 48,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionText: {
    color: c.text,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyOption: {
    color: c.textMuted,
    lineHeight: 20,
    paddingVertical: 16,
    textAlign: "center",
  },
});
