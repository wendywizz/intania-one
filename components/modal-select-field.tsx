import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { TEXT } from "@/constants/text";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

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
  onSelect: (value: string) => void;
};

export function ModalSelectField({
  hasError,
  options,
  placeholder,
  title,
  value,
  width,
  onSelect,
}: ModalSelectFieldProps) {
  const c = useColors();
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
          hasError ? styles.inputError : undefined,
        ]}
      >
        <ThemedText style={[styles.buttonText, !selectedOption ? styles.placeholder : undefined]}>
          {selectedOption?.label || placeholder}
        </ThemedText>
      </Pressable>

      <Modal transparent visible={isOpen} animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.modalContent}>
            <ThemedView
              style={styles.selectModal}
              lightColor="#FFFFFF"
              darkColor="#151718"
            >
              <View style={styles.selectModalHeader}>
                <ThemedText type="defaultSemiBold" style={styles.selectModalTitle}>
                  {title}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={close}
                  style={styles.closeButton}
                >
                  <ThemedText type="defaultSemiBold">
                    {TEXT.SHARED_CLOSE_THAI}
                  </ThemedText>
                </Pressable>
              </View>

              <ScrollView
                style={styles.optionScroll}
                contentContainerStyle={styles.optionScrollContent}
              >
                {options.length ? (
                  options.map((option) => (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      onPress={() => {
                        onSelect(option.value);
                        close();
                      }}
                      style={styles.option}
                    >
                      <ThemedText style={styles.optionText}>
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  ))
                ) : (
                  <ThemedText style={styles.emptyOption}>
                    {TEXT.SHARED_EMPTY_DATA}
                  </ThemedText>
                )}
              </ScrollView>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
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
    minHeight: 40,
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.infoSoft,
    paddingHorizontal: 14,
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
