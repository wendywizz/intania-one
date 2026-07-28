import { Minus, Plus, Search, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import { UserAvatar } from "./user-avatar";

// Remove the default focus outline on web so the active search field shows only
// its bottom line (RN Web only; no-op on native).
const webNoOutline: any = Platform.OS === "web" ? { outlineStyle: "none" } : null;

type AgentSelectFieldProps = {
  options: string[];
  selectedAgents: string[];
  /** Resolve an option/agent label to its staff photo id (uni_staff_id). */
  photoIdForOption?: (option: string) => string | undefined;
  /** Resolve an option/agent label to a secondary line (e.g. department). */
  subtitleForOption?: (option: string) => string | undefined;
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
  photoIdForOption,
  subtitleForOption,
  isOpen,
  hasError,
  errorMessage,
  onToggle,
  onSelect,
  onRemove,
}: AgentSelectFieldProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
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
      <ThemedText style={styles.fieldLabel}>{TEXT.ABSENCE_DELEGATE_LABEL}</ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={handleToggle}
        style={[styles.selectButton, hasError ? styles.inputError : undefined]}
      >
        <ThemedText style={[styles.selectText, styles.placeholder]}>
          {TEXT.ABSENCE_DELEGATE_PLACEHOLDER}
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
              <View style={styles.agentRow}>
                {photoIdForOption?.(selectedAgent) ? (
                  <UserAvatar staffId={photoIdForOption(selectedAgent)} size={34} />
                ) : null}
                <View style={styles.agentTextCol}>
                  <ThemedText style={styles.agentListText} numberOfLines={1}>
                    {selectedAgent}
                  </ThemedText>
                  {subtitleForOption?.(selectedAgent) ? (
                    <ThemedText style={styles.agentSubtitle} numberOfLines={1}>
                      {subtitleForOption(selectedAgent)}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={TEXT.SHARED_DELETE_THAI}
                onPress={() => onRemove(selectedAgent)}
                style={styles.deleteAgentButton}
              >
                <Minus size={18} color={c.danger} />
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
                  {TEXT.ABSENCE_DELEGATE_LABEL}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={TEXT.SHARED_CLOSE_THAI}
                  onPress={handleToggle}
                  style={styles.closeButton}
                >
                  <X size={20} color={c.text} />
                </Pressable>
              </View>

              <View style={styles.searchRow}>
                <Search size={18} color={c.textMuted} />
                <TextInput
                  onChangeText={setSearchText}
                  placeholder={TEXT.SHARED_SEARCH_NAME_PLACEHOLDER}
                  placeholderTextColor="#8A969C"
                  style={[styles.searchInput, webNoOutline]}
                  value={searchText}
                />
              </View>

              <ScrollView
                style={styles.optionScroll}
                contentContainerStyle={styles.optionScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {filteredOptions.length ? (
                  filteredOptions.map((option, index) => (
                    <Pressable
                      key={`${option}-${index}`}
                      accessibilityRole="button"
                      onPress={() => handleSelect(option)}
                      style={styles.option}
                    >
                      <View style={styles.agentRow}>
                        {photoIdForOption?.(option) ? (
                          <UserAvatar staffId={photoIdForOption(option)} size={38} />
                        ) : null}
                        <View style={styles.agentTextCol}>
                          <ThemedText style={styles.optionText} numberOfLines={1}>
                            {option}
                          </ThemedText>
                          {subtitleForOption?.(option) ? (
                            <ThemedText style={styles.agentSubtitle} numberOfLines={1}>
                              {subtitleForOption(option)}
                            </ThemedText>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.addButton}>
                        <Plus size={18} color={c.success} />
                      </View>
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

const makeStyles = (c: AppColors) => StyleSheet.create({
  field: {
    paddingHorizontal: 0,
    paddingVertical: 20,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 15,
    lineHeight: 20,
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  selectButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 0,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.inputBorder,
  },
  inputError: {
    borderBottomWidth: 1.5,
    borderBottomColor: c.danger,
  },
  selectText: {
    flex: 1,
    color: c.text,
    fontSize: 16,
    fontFamily: AppFonts.psuRegular,
  },
  placeholder: {
    color: c.textFaint,
  },
  chevron: {
    color: c.textMuted,
    fontSize: 18,
    lineHeight: 22,
  },
  fieldError: {
    color: c.danger,
    fontSize: 12,
    lineHeight: 18,
  },
  agentList: {
    marginTop: 12,
    gap: 10,
  },
  agentRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  agentTextCol: {
    flex: 1,
    gap: 2,
  },
  agentSubtitle: {
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
    fontSize: 12,
    lineHeight: 16,
  },
  agentListItem: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 0,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  agentListText: {
    flex: 1,
    color: c.text,
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  deleteAgentButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: c.danger,
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.inputBorder,
  },
  searchInput: {
    flex: 1,
    minHeight: 40,
    color: c.text,
    fontFamily: AppFonts.psuRegular,
    fontSize: 15,
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  optionScroll: {
    // Fixed height so filtering the list doesn't resize the modal on every
    // keystroke — the modal stays a constant size and only the list scrolls.
    height: 360,
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
    paddingHorizontal: 0,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  optionText: {
    flex: 1,
    color: c.text,
    lineHeight: 20,
  },
  optionActionText: {
    fontSize: 13,
  },
  addButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: c.success,
  },
  emptyOption: {
    color: c.textMuted,
    lineHeight: 20,
    paddingVertical: 16,
    textAlign: "center",
  },
});
