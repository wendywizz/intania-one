import { TEXT } from "@/constants/text";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { DatePickerField } from "@/components/date-picker-field";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppFonts } from "@/constants/fonts";
import { TYPE_ABSENT_BUSINESS } from "@/constants/type-absent";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import type { Absent } from "@/models/types";
import { initAbsentData } from "@/services/absentService";
import {
  getWeekdayLeaveDayCount,
  isRetryableInitialError,
  startOfDay,
} from "@/utils/absent-form";
import { getStaffDisplayLabel } from "@/utils/staff-label";

type Approver = {
  staffId?: string;
  prefixNameTH?: string;
  firstNameTH?: string;
  lastNameTH?: string;
  positionName?: string;
};

type Agent = Approver;

type ValidationErrors = Partial<
  Record<"approver" | "reason" | "date" | "contact" | "agent", string>
>;

function getApproverList(data: Absent | null): Approver[] {
  return Array.isArray(data?.approverList)
    ? (data.approverList as Approver[])
    : [];
}

function getAgentList(data: Absent | null): Agent[] {
  return Array.isArray(data?.agentList) ? (data.agentList as Agent[]) : [];
}

function getStaffLabel(staff: Approver | Agent) {
  return getStaffDisplayLabel(staff);
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

const halfDayOptions = [
  TEXT.ABSENT_HALF_DAY_FIRST_MORNING,
  TEXT.ABSENT_HALF_DAY_FIRST_AFTERNOON,
  TEXT.ABSENT_HALF_DAY_LAST_MORNING,
  TEXT.ABSENT_HALF_DAY_FIRST_AFTERNOON_LAST_MORNING,
];

type SelectFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  isOpen: boolean;
  searchable?: boolean;
  wideModal?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  onToggle: () => void;
  onSelect: (value: string) => void;
};

function SelectField({
  label,
  placeholder,
  value,
  options,
  isOpen,
  searchable,
  wideModal,
  hasError,
  errorMessage,
  onToggle,
  onSelect,
}: SelectFieldProps) {
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

  const handleSelect = (selectedValue: string) => {
    setSearchText("");
    onSelect(selectedValue);
  };

  return (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={handleToggle}
        style={[styles.selectButton, hasError ? styles.inputError : undefined]}
      >
        <ThemedText style={[styles.selectText, !value && styles.placeholder]}>
          {value || placeholder}
        </ThemedText>
        <ThemedText style={styles.chevron}>⌄</ThemedText>
      </Pressable>
      {errorMessage ? (
        <ThemedText style={styles.fieldError}>{errorMessage}</ThemedText>
      ) : null}

      <Modal
        transparent
        visible={isOpen}
        animationType="fade"
        onRequestClose={handleToggle}
      >
        <Pressable style={styles.backdrop} onPress={handleToggle}>
          <Pressable>
            <ThemedView
              style={[
                styles.selectModal,
                wideModal ? styles.wideSelectModal : undefined,
              ]}
              lightColor="#FFFFFF"
              darkColor="#151718"
            >
              <View style={styles.selectModalHeader}>
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.selectModalTitle}
                >
                  {label}
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

              {searchable ? (
                <TextInput
                  onChangeText={setSearchText}
                  placeholder={TEXT.SHARED_SEARCH_NAME_PLACEHOLDER}
                  placeholderTextColor="#8A969C"
                  style={styles.searchInput}
                  value={searchText}
                />
              ) : null}

              <ScrollView
                style={styles.optionScroll}
                contentContainerStyle={styles.optionScrollContent}
              >
                {filteredOptions.length ? (
                  filteredOptions.map((option) => (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      onPress={() => handleSelect(option)}
                      style={[
                        styles.option,
                        value === option ? styles.selectedOption : undefined,
                      ]}
                    >
                      <ThemedText
                        lightColor={value === option ? "#FFFFFF" : undefined}
                        darkColor={value === option ? "#FFFFFF" : undefined}
                        style={styles.optionText}
                      >
                        {option}
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

export default function BusinessScreen() {
  const { user: authUser } = useAuth();
  const [initialAbsentData, setInitialAbsentData] = useState<Absent | null>(
    null,
  );
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState("");
  const [approver, setApprover] = useState("");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [halfDay, setHalfDay] = useState("");
  const [contact, setContact] = useState("");
  const [agent, setAgent] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [openSelect, setOpenSelect] = useState<
    "approver" | "halfDay" | "agent" | null
  >(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );
  const minimumStartDate = useMemo(() => startOfDay(new Date()), []);
  const userId = authUser?.staffId || USER_ID;

  const clearValidationError = useCallback((field: keyof ValidationErrors) => {
    setValidationErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  }, []);

  const loadInitialAbsentData = useCallback(async () => {
    setIsInitialLoading(true);
    setInitialError("");
    setInitialAbsentData(null);

    try {
      const data = await initAbsentData(userId, TYPE_ABSENT_BUSINESS);
      setInitialAbsentData(data);
    } catch (error) {
      setInitialError(
        error instanceof Error
          ? error.message
          : TEXT.ABSENT_INIT_LOAD_ERROR_MESSAGE,
      );
    } finally {
      setIsInitialLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadInitialAbsentData();
    }, [loadInitialAbsentData]),
  );

  const minimumEndDate = useMemo(
    () => (startDate ? startOfDay(startDate) : undefined),
    [startDate],
  );
  const approverOptions = useMemo(
    () => getApproverList(initialAbsentData).map(getStaffLabel).filter(Boolean),
    [initialAbsentData],
  );
  const agentOptions = useMemo(
    () =>
      uniqueValues(
        getAgentList(initialAbsentData).map(getStaffLabel).filter(Boolean),
      ),
    [initialAbsentData],
  );
  const availableAgentOptions = useMemo(
    () => agentOptions.filter((option) => !selectedAgents.includes(option)),
    [agentOptions, selectedAgents],
  );
  const isAgentAlreadySelected = selectedAgents.includes(agent);
  const dateError =
    startDate && endDate && startOfDay(endDate) < startOfDay(startDate)
      ? "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น"
      : "";
  const displayedDateError = dateError || validationErrors.date || "";
  const leaveDayCount = useMemo(() => {
    if (!startDate || !endDate || dateError) {
      return null;
    }

    return getWeekdayLeaveDayCount(startDate, endDate, Boolean(halfDay));
  }, [dateError, endDate, halfDay, startDate]);

  const handleSubmit = useCallback(() => {
    const nextErrors: ValidationErrors = {};

    if (!approver) {
      nextErrors.approver = "กรุณาเลือกผู้อนุมัติ";
    }

    if (!reason.trim()) {
      nextErrors.reason = "กรุณากรอกเหตุผล";
    }

    if (!startDate || !endDate) {
      nextErrors.date = "กรุณาเลือกวันที่ลา";
    }

    if (!contact.trim()) {
      nextErrors.contact = "กรุณากรอกช่องทางติดต่อ";
    }

    if (!selectedAgents.length) {
      nextErrors.agent = "กรุณาเพิ่มผู้รับมอบหมายอย่างน้อย 1 คน";
    }

    setValidationErrors(nextErrors);

    if (Object.keys(nextErrors).length || dateError) {
      return;
    }
  }, [
    approver,
    contact,
    dateError,
    endDate,
    reason,
    selectedAgents.length,
    startDate,
  ]);

  const handleAddAgent = useCallback(() => {
    if (!agent) {
      return;
    }

    let didAddAgent = false;

    setSelectedAgents((currentAgents) => {
      if (currentAgents.includes(agent)) {
        return currentAgents;
      }

      didAddAgent = true;
      return [...currentAgents, agent];
    });

    if (didAddAgent) {
      clearValidationError("agent");
      setAgent("");
    }
  }, [agent, clearValidationError]);

  const handleRemoveAgent = useCallback((agentToRemove: string) => {
    setSelectedAgents((currentAgents) =>
      currentAgents.filter((currentAgent) => currentAgent !== agentToRemove),
    );
  }, []);

  if (isInitialLoading) {
    return (
      <ThemedView style={styles.container}>
        <NavTopBar title={TEXT.ABSENT_BUSINESS_TITLE} backHref="/absent" />
        <LoadingAnimate
          title={TEXT.SHARED_LOADING_DATA_TITLE}
          desc={TEXT.SHARED_LOADING_DESCRIPTION}
        />
      </ThemedView>
    );
  }

  if (initialError) {
    const shouldShowRetry = isRetryableInitialError(initialError);

    return (
      <ThemedView style={styles.container}>
        <NavTopBar title={TEXT.ABSENT_BUSINESS_TITLE} backHref="/absent" />
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">
            {shouldShowRetry ? TEXT.SHARED_ERROR_TITLE_THAI : "ไม่สามารถทำเรื่องลาได้"}
          </ThemedText>
          <ThemedText style={[styles.stateMessage, styles.errorText]}>
            {initialError}
          </ThemedText>
          <View style={styles.errorActions}>
            {shouldShowRetry ? (
              <Pressable
                accessibilityRole="button"
                onPress={loadInitialAbsentData}
                style={styles.secondaryButton}
              >
                <ThemedText type="defaultSemiBold">
                  {TEXT.SHARED_RETRY_THAI}
                </ThemedText>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace("/absent")}
              style={styles.submitButton}
            >
              <ThemedText
                lightColor="#FFFFFF"
                darkColor="#FFFFFF"
                type="defaultSemiBold"
              >
                {TEXT.SHARED_BACK_THAI}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.ABSENT_BUSINESS_TITLE} backHref="/absent" />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView
          style={styles.panel}
          lightColor="#FFFFFF"
          darkColor="#1F2B30"
        >
          <ThemedText type="subtitle">
            {TEXT.ABSENT_BUSINESS_FORM_TITLE}
          </ThemedText>
          {initialAbsentData ? (
            <ThemedText style={styles.initialStatus}>
              {TEXT.ABSENT_INITIAL_DATA_LOADED}
            </ThemedText>
          ) : null}

          <View style={styles.form}>
            <SelectField
              label={TEXT.ABSENT_APPROVER_LABEL}
              placeholder={TEXT.ABSENT_APPROVER_PLACEHOLDER}
              value={approver}
              options={approverOptions}
              isOpen={openSelect === "approver"}
              hasError={Boolean(validationErrors.approver)}
              errorMessage={validationErrors.approver}
              onToggle={() =>
                setOpenSelect(openSelect === "approver" ? null : "approver")
              }
              onSelect={(value) => {
                setApprover(value);
                clearValidationError("approver");
                setOpenSelect(null);
              }}
            />

            <View style={styles.field}>
              <ThemedText type="defaultSemiBold">
                {TEXT.ABSENT_REASON_LABEL}
              </ThemedText>
              <TextInput
                multiline
                numberOfLines={2}
                onChangeText={(value) => {
                  setReason(value);
                  if (value.trim()) {
                    clearValidationError("reason");
                  }
                }}
                placeholder={TEXT.ABSENT_REASON_PLACEHOLDER}
                placeholderTextColor="#8A969C"
                style={[
                  styles.input,
                  styles.textArea,
                  validationErrors.reason ? styles.inputError : undefined,
                ]}
                textAlignVertical="top"
                value={reason}
              />
              {validationErrors.reason ? (
                <ThemedText style={styles.fieldError}>
                  {validationErrors.reason}
                </ThemedText>
              ) : null}
            </View>

            <View style={styles.field}>
              <ThemedText type="defaultSemiBold">
                {TEXT.ABSENT_LEAVE_DATE_LABEL}
              </ThemedText>
              <View style={styles.dateRow}>
                <DatePickerField
                  label={TEXT.ABSENT_START_DATE_LABEL}
                  value={startDate}
                  minimumDate={minimumStartDate}
                  onChange={(date) => {
                    setStartDate(date);
                    if (endDate && startOfDay(endDate) < startOfDay(date)) {
                      setEndDate(null);
                    } else if (endDate) {
                      clearValidationError("date");
                    }
                  }}
                  hasError={Boolean(displayedDateError)}
                />
                <DatePickerField
                  label={TEXT.ABSENT_END_DATE_LABEL}
                  value={endDate}
                  minimumDate={minimumEndDate}
                  highlightedStartDate={startDate}
                  hasError={Boolean(displayedDateError)}
                  onChange={(date) => {
                    setEndDate(date);
                    if (startDate) {
                      clearValidationError("date");
                    }
                  }}
                />
              </View>
              <ThemedText
                style={[
                  styles.hint,
                  displayedDateError ? styles.errorText : undefined,
                ]}
              >
                {displayedDateError || "เลือกวันที่เริ่มต้นและวันที่สิ้นสุด"}
              </ThemedText>
              {leaveDayCount !== null ? (
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.leaveDaySummary}
                >
                  {TEXT.ABSENT_LEAVE_DAY_COUNT_LABEL}
                  {leaveDayCount.toLocaleString("th-TH")} {TEXT.ABSENT_DAY_UNIT}
                </ThemedText>
              ) : null}
            </View>

            <SelectField
              label={TEXT.ABSENT_HALF_DAY_LABEL}
              placeholder={TEXT.ABSENT_HALF_DAY_PLACEHOLDER}
              value={halfDay}
              options={halfDayOptions}
              isOpen={openSelect === "halfDay"}
              onToggle={() =>
                setOpenSelect(openSelect === "halfDay" ? null : "halfDay")
              }
              onSelect={(value) => {
                setHalfDay(value);
                setOpenSelect(null);
              }}
            />

            <View style={styles.field}>
              <ThemedText type="defaultSemiBold">
                {TEXT.ABSENT_CONTACT_CHANNEL_LABEL}
              </ThemedText>
              <TextInput
                onChangeText={(value) => {
                  setContact(value);
                  if (value.trim()) {
                    clearValidationError("contact");
                  }
                }}
                placeholder={TEXT.ABSENT_CONTACT_CHANNEL_PLACEHOLDER}
                placeholderTextColor="#8A969C"
                style={[
                  styles.input,
                  validationErrors.contact ? styles.inputError : undefined,
                ]}
                value={contact}
              />
              {validationErrors.contact ? (
                <ThemedText style={styles.fieldError}>
                  {validationErrors.contact}
                </ThemedText>
              ) : null}
            </View>

            <View style={styles.field}>
              <View style={styles.agentRow}>
                <View style={styles.agentSelect}>
                  <SelectField
                    label={TEXT.ABSENT_DELEGATE_LABEL}
                    placeholder={TEXT.ABSENT_DELEGATE_PLACEHOLDER}
                    value={agent}
                    options={availableAgentOptions}
                    isOpen={openSelect === "agent"}
                    searchable
                    wideModal
                    hasError={Boolean(validationErrors.agent)}
                    onToggle={() =>
                      setOpenSelect(openSelect === "agent" ? null : "agent")
                    }
                    onSelect={(value) => {
                      setAgent(value);
                      setOpenSelect(null);
                    }}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={!agent || isAgentAlreadySelected}
                  onPress={handleAddAgent}
                  style={[
                    styles.addButton,
                    !agent || isAgentAlreadySelected
                      ? styles.disabledButton
                      : undefined,
                  ]}
                >
                  <ThemedText
                    lightColor="#0A6E8A"
                    darkColor="#0A6E8A"
                    type="defaultSemiBold"
                  >
                    {TEXT.SHARED_ADD_THAI}
                  </ThemedText>
                </Pressable>
              </View>
              {selectedAgents.length ? (
                <View style={styles.agentList}>
                  {selectedAgents.map((selectedAgent) => (
                    <View key={selectedAgent} style={styles.agentListItem}>
                      <Text style={styles.agentListText}>{selectedAgent}</Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => handleRemoveAgent(selectedAgent)}
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
              {validationErrors.agent ? (
                <ThemedText style={styles.fieldError}>
                  {validationErrors.agent}
                </ThemedText>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={handleSubmit}
              style={styles.submitButton}
            >
              <ThemedText
                lightColor="#FFFFFF"
                darkColor="#FFFFFF"
                type="defaultSemiBold"
              >
                {TEXT.ABSENT_SUBMIT_REQUEST}
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  stateContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  stateMessage: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  errorActions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    marginTop: 24,
    maxWidth: 360,
    width: "100%",
  },
  panel: {
    borderRadius: 8,
    padding: 0,
  },
  initialStatus: {
    marginTop: 8,
    color: "#687076",
    fontSize: 12,
    lineHeight: 18,
  },
  form: {
    gap: 18,
    marginTop: 20,
  },
  field: {
    gap: 8,
  },
  agentRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  agentSelect: {
    flex: 1,
  },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#BFD2DA",
    backgroundColor: "#FFFFFF",
    color: "#11181C",
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: "#B42318",
  },
  textArea: {
    minHeight: 72,
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  hint: {
    color: "#687076",
    fontSize: 12,
    lineHeight: 18,
  },
  leaveDaySummary: {
    color: "#0A6E8A",
  },
  errorText: {
    color: "#B42318",
  },
  fieldError: {
    color: "#B42318",
    fontSize: 12,
    lineHeight: 18,
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
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    padding: 24,
  },
  selectModal: {
    width: "100%",
    maxWidth: 420,
    maxHeight: 460,
    borderRadius: 8,
    padding: 16,
  },
  wideSelectModal: {
    maxWidth: 620,
    minHeight: "25%",
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
    maxHeight: 360,
  },
  optionScrollContent: {
    gap: 8,
  },
  option: {
    minHeight: 48,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D7E6EC",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedOption: {
    borderColor: "#0A6E8A",
    backgroundColor: "#0A6E8A",
  },
  optionText: {
    color: "#11181C",
    lineHeight: 20,
  },
  emptyOption: {
    color: "#687076",
    lineHeight: 20,
    paddingVertical: 16,
    textAlign: "center",
  },
  secondaryButton: {
    minHeight: 48,
    minWidth: 132,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#BFD2DA",
    backgroundColor: "#FFFFFF",
  },
  addButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#0A6E8A",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
  },
  disabledButton: {
    opacity: 0.45,
  },
  agentList: {
    gap: 8,
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
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#F0B4AE",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
  },
  submitButton: {
    minHeight: 48,
    minWidth: 132,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0A6E8A",
    marginTop: 6,
  },
});
