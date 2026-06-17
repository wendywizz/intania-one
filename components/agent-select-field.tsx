import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

type AgentSelectFieldProps = {
  options: string[];
  selectedAgents: string[];
  isOpen: boolean;
  hasError?: boolean;
  errorMessage?: string;
  onToggle: () => void;
  onSelect: (agent: string) => void;
  onRemove: (agent: string) => void;
};

export function AgentSelectField({
  options,
  selectedAgents,
  isOpen,
  hasError,
  errorMessage,
  onToggle,
  onSelect,
  onRemove,
}: AgentSelectFieldProps) {
  const [searchText, setSearchText] = useState("");
  const filteredOptions = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      return options;
    }

    return options.filter((option) => option.toLowerCase().includes(keyword));
  }, [options, searchText]);

  const handleToggle = () => {
    if (isOpen) {
      setSearchText("");
    }

    onToggle();
  };

  const handleSelect = (agent: string) => {
    setSearchText("");
    onSelect(agent);
  };

  return (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold">{TEXT.absence_DELEGATE_LABEL}</ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={handleToggle}
        style={[styles.selectButton, hasError ? styles.inputError : undefined]}
      >
        <ThemedText style={[styles.selectText, styles.placeholder]}>
          {TEXT.absence_DELEGATE_PLACEHOLDER}
        </ThemedText>
        <ThemedText style={styles.chevron}>⌄</ThemedText>
      </Pressable>
      {errorMessage ? (
        <ThemedText style={styles.fieldError}>{errorMessage}</ThemedText>
      ) : null}

      {selectedAgents.length ? (
        <View style={styles.agentList}>
          {selectedAgents.map((selectedAgent, index) => (
            <View
              key={`${String(selectedAgent)}-${index}`}
              style={styles.agentListItem}
            >
              <ThemedText style={styles.agentListText}>
                {selectedAgent}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => onRemove(selectedAgent)}
                style={styles.deleteAgentButton}
              >
                <ThemedText
                  lightColor="#B42318"
                  darkColor="#B42318"
                  type="defaultSemiBold"
                >
                  {TEXT.SHARED_DELETE_THAI}
                </ThemedText>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <Modal
        transparent
        visible={isOpen}
        animationType="fade"
        onRequestClose={handleToggle}
      >
        <Pressable style={styles.backdrop} onPress={handleToggle}>
          <Pressable style={styles.modalContent}>
            <ThemedView
              style={styles.selectModal}
              lightColor="#FFFFFF"
              darkColor="#151718"
            >
              <View style={styles.selectModalHeader}>
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.selectModalTitle}
                >
                  {TEXT.absence_DELEGATE_LABEL}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleToggle}
                  style={styles.closeButton}
                >
                  <ThemedText type="defaultSemiBold">
                    {TEXT.SHARED_CLOSE_THAI}
                  </ThemedText>
                </Pressable>
              </View>

              <TextInput
                onChangeText={setSearchText}
                placeholder={TEXT.SHARED_SEARCH_NAME_PLACEHOLDER}
                placeholderTextColor="#8A969C"
                style={styles.searchInput}
                value={searchText}
              />

              <ScrollView
                style={styles.optionScroll}
                contentContainerStyle={styles.optionScrollContent}
              >
                {filteredOptions.length ? (
                  filteredOptions.map((option, index) => (
                    <Pressable
                      key={`${option}-${index}`}
                      accessibilityRole="button"
                      onPress={() => handleSelect(option)}
                      style={styles.option}
                    >
                      <ThemedText style={styles.optionText}>
                        {option}
                      </ThemedText>
                      <ThemedText
                        lightColor="#0A6E8A"
                        darkColor="#0A6E8A"
                        type="defaultSemiBold"
                        style={styles.optionActionText}
                      >
                        {TEXT.SHARED_ADD_THAI}
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
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 10,
  },
  selectButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#BFD2DA",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: "#B42318",
  },
  selectText: {
    flex: 1,
    color: "#11181C",
  },
  placeholder: {
    color: "#8A969C",
  },
  chevron: {
    color: "#0A6E8A",
    fontSize: 16,
    lineHeight: 20,
    marginLeft: 8,
  },
  fieldError: {
    color: "#B42318",
    fontSize: 12,
    lineHeight: 18,
  },
  agentList: {
    gap: 10,
  },
  agentListItem: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D7E6EC",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  agentListText: {
    flex: 1,
    color: "#11181C",
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  deleteAgentButton: {
    minHeight: 36,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#F0B4AE",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
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
    backgroundColor: "#E4F0F6",
    paddingHorizontal: 14,
  },
  searchInput: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#BFD2DA",
    backgroundColor: "#FFFFFF",
    color: "#11181C",
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionScroll: {
    maxHeight: 420,
  },
  optionScrollContent: {
    gap: 8,
  },
  option: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D7E6EC",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionText: {
    flex: 1,
    color: "#11181C",
    lineHeight: 20,
  },
  optionActionText: {
    fontSize: 13,
  },
  emptyOption: {
    color: "#687076",
    lineHeight: 20,
    paddingVertical: 16,
    textAlign: "center",
  },
});
