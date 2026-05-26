import { TEXT } from "@/constants/text";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { AgentSelectField } from "@/components/agent-select-field";
import { AppToast } from "@/components/app-toast";
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
import {
  addAbsentData,
  getAbsentData,
  initAbsentData,
  removeData,
  updateAbsentData,
} from "@/services/absentService";
import {
  formatDateTimeParam,
  getAbsentTextValue,
  getHalfDayValue,
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

type SelectOption = {
  label: string;
  value: string;
  staffId?: string;
};

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

function getStaffId(staff: Approver | Agent) {
  return getAbsentTextValue(staff as Absent, ["staffId", "staff_id", "STAFF_ID", "id"]);
}

function getPositionId(staff: Approver | Agent) {
  return getAbsentTextValue(staff as Absent, ["positionId", "position_id", "POSITION_ID"]);
}

function getItemText(item: Absent, fields: string[]) {
  for (const field of fields) {
    const value = item[field];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function getItemStringList(item: Absent, fields: string[]) {
  for (const field of fields) {
    const value = item[field];

    if (Array.isArray(value)) {
      return value
        .map((itemValue) => {
          if (itemValue && typeof itemValue === "object") {
            return (
              getAbsentTextValue(itemValue as Absent, [
                "staffId",
                "staff_id",
                "STAFF_ID",
                "id",
              ]) || getStaffDisplayLabel(itemValue)
            );
          }

          return String(itemValue);
        })
        .filter(Boolean);
    }

    if (typeof value === "string" && value.trim()) {
      return value
        .split(",")
        .map((itemValue) => itemValue.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function getAgentSelectionLabels(selectedValues: string[], agentList: Agent[]) {
  return selectedValues.map((selectedValue) => {
    const matchedAgent = agentList.find(
      (agentItem) =>
        getStaffId(agentItem) === selectedValue ||
        getStaffLabel(agentItem) === selectedValue,
    );

    return matchedAgent ? getStaffLabel(matchedAgent) : selectedValue;
  });
}

function parseItemParam(value: string | string[] | undefined): Absent {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return {};
  }

  try {
    return JSON.parse(decodeURIComponent(rawValue)) as Absent;
  } catch {
    return {};
  }
}

function parseDateParamValue(value: string) {
  const dateText = value.trim();

  if (!dateText) {
    return null;
  }

  const datePart = dateText.split(" ")[0]?.split("T")[0] ?? "";
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function getHalfDayLabel(value: string) {
  if (!value || value === "0") {
    return "0";
  }

  const halfDayIndex = Number(value) - 1;

  return halfDayOptions[halfDayIndex + 1]?.value ?? "";
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

const halfDayOptions: SelectOption[] = [
  { label: TEXT.ABSENT_HALF_DAY_NONE, value: "0" },
  { label: TEXT.ABSENT_HALF_DAY_FIRST_MORNING, value: "1" },
  { label: TEXT.ABSENT_HALF_DAY_FIRST_AFTERNOON, value: "2" },
  { label: TEXT.ABSENT_HALF_DAY_LAST_MORNING, value: "3" },
  { label: TEXT.ABSENT_HALF_DAY_FIRST_AFTERNOON_LAST_MORNING, value: "4" },
];

type SelectFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  options: (string | SelectOption)[];
  isOpen: boolean;
  searchable?: boolean;
  wideModal?: boolean;
  optionActionLabel?: string;
  hasError?: boolean;
  errorMessage?: string;
  onToggle: () => void;
  onSelect: (value: string, option?: SelectOption) => void;
};

function SelectField({
  label,
  placeholder,
  value,
  options,
  isOpen,
  searchable,
  wideModal,
  optionActionLabel,
  hasError,
  errorMessage,
  onToggle,
  onSelect,
}: SelectFieldProps) {
  const normalizedOptions = useMemo(
    () =>
      options.map((option) =>
        typeof option === "string" ? { label: option, value: option } : option,
      ),
    [options],
  );
  const [searchText, setSearchText] = useState("");
  const filteredOptions = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      return normalizedOptions;
    }

    return normalizedOptions.filter((option) => option.label.toLowerCase().includes(keyword));
  }, [normalizedOptions, searchText]);
  const selectedOption = normalizedOptions.find(
    (option) => option.value === value,
  );
  const displayValue = selectedOption?.label || value;

  const handleToggle = () => {
    if (isOpen) {
      setSearchText("");
    }

    onToggle();
  };

  return (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={handleToggle}
        style={[styles.selectButton, hasError ? styles.inputError : undefined]}
      >
        <ThemedText style={[styles.selectText, !displayValue && styles.placeholder]}>
          {displayValue || placeholder}
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
          <Pressable style={styles.modalContent}>
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
                style={[
                  styles.optionScroll,
                  wideModal ? styles.wideOptionScroll : undefined,
                ]}
                contentContainerStyle={styles.optionScrollContent}
              >
                {filteredOptions.length ? (
                  filteredOptions.map((option, index) => (
                    <Pressable
                      key={`${String(option.value)}-${index}`}
                      accessibilityRole="button"
                      onPress={() => {
                        setSearchText("");
                        onSelect(option.value, option);
                      }}
                      style={[
                        styles.option,
                        optionActionLabel ? styles.optionWithAction : undefined,
                        value === option.value ? styles.selectedOption : undefined,
                      ]}
                    >
                      <ThemedText
                        lightColor={value === option.value ? "#FFFFFF" : undefined}
                        darkColor={value === option.value ? "#FFFFFF" : undefined}
                        style={styles.optionText}
                      >
                        {option.label}
                      </ThemedText>
                      {optionActionLabel ? (
                        <ThemedText
                          lightColor="#0A6E8A"
                          darkColor="#0A6E8A"
                          type="defaultSemiBold"
                          style={styles.optionActionText}
                        >
                          {optionActionLabel}
                        </ThemedText>
                      ) : null}
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
  const params = useLocalSearchParams<{
    id?: string;
    item?: string;
    mode?: string;
  }>();
  const routeEditItem = useMemo(() => parseItemParam(params.item), [params.item]);
  const routeEditId =
    getItemText(routeEditItem, [
      "id",
      "absentId",
      "absent_id",
      "requestId",
      "request_id",
    ]) || (Array.isArray(params.id) ? params.id[0] : params.id ?? "");
  const isEditMode =
    (Array.isArray(params.mode) ? params.mode[0] : params.mode) === "edit" ||
    Boolean(routeEditId);
  const [initialAbsentData, setInitialAbsentData] = useState<Absent | null>(
    null,
  );
  const [loadedEditItem, setLoadedEditItem] = useState<Absent | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState("");
  const [approver, setApprover] = useState("");
  const [approverStaffId, setApproverStaffId] = useState("");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [halfDay, setHalfDay] = useState("");
  const [contact, setContact] = useState("");
  const [travelDetail, setTravelDetail] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [deptId, setDeptId] = useState("");
  const [step, setStep] = useState("");
  const [absentTime, setAbsentTime] = useState("");
  const [absentStatus, setAbsentStatus] = useState("");
  const [writeDate, setWriteDate] = useState("");
  const [openSelect, setOpenSelect] = useState<
    "approver" | "halfDay" | "agent" | null
  >(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isRemoveConfirmVisible, setIsRemoveConfirmVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "">("");
  const minimumStartDate = useMemo(() => startOfDay(new Date()), []);
  const userId = authUser?.staffId || USER_ID;
  const editItem = loadedEditItem ?? routeEditItem;
  const editId =
    getItemText(editItem, [
      "id",
      "absentId",
      "absent_id",
      "requestId",
      "request_id",
    ]) || routeEditId;
  const backHref = isEditMode ? "/absent/waiting" : "/absent";

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
    setLoadedEditItem(null);
    setDeptId("");
    setStep("");
    setAbsentTime("");
    setAbsentStatus("");
    setWriteDate("");

    try {
      const data = await initAbsentData(userId, TYPE_ABSENT_BUSINESS);
      setInitialAbsentData(data);
      setDeptId(getAbsentTextValue(data, ["deptId", "dept_id", "departmentId", "department_id"]));
      setStep(getAbsentTextValue(data, ["step"]));
      setAbsentStatus(getAbsentTextValue(data, ["absentStatus", "absent_status", "status"]));
      setAbsentTime(getAbsentTextValue(data, ["absentTime", "absent_time", "times", "time"]));
      setWriteDate(getAbsentTextValue(data, ["writeDate", "write_date"]));
    } catch (error) {
      if (!isEditMode) {
        setInitialError(
          error instanceof Error
            ? error.message
            : TEXT.ABSENT_INIT_LOAD_ERROR_MESSAGE,
        );
      }
    } finally {
      if (isEditMode && routeEditId) {
        try {
          const previousData = await getAbsentData(routeEditId, TYPE_ABSENT_BUSINESS);

          setLoadedEditItem(previousData);
          setInitialAbsentData((currentData) => ({
            ...(currentData ?? {}),
            ...previousData,
            approverList: currentData?.approverList ?? previousData.approverList,
            agentList: currentData?.agentList ?? previousData.agentList,
          }));
        } catch {
          setLoadedEditItem(routeEditItem);
          setInitialAbsentData((currentData) => currentData ?? routeEditItem);
        }
      }

      setIsInitialLoading(false);
    }
  }, [isEditMode, routeEditId, routeEditItem, userId]);

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
    () =>
      getApproverList(initialAbsentData)
        .map((item) => ({
          label: getStaffLabel(item),
          value: getPositionId(item),
          staffId: getStaffId(item),
        }))
        .filter((item) => item.label && item.value),
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
  const selectedAgentIds = useMemo(
    () =>
      selectedAgents
        .map((selectedAgent) => {
          const matchedAgent = getAgentList(initialAbsentData).find(
            (item) => getStaffLabel(item) === selectedAgent,
          );

          return getStaffId(matchedAgent ?? {}) || selectedAgent;
        })
        .filter(Boolean),
    [initialAbsentData, selectedAgents],
  );
  useEffect(() => {
    if (!isEditMode || !editId) {
      return;
    }

    setReason(getItemText(editItem, ["reason", "detail", "description"]));
    setContact(getItemText(editItem, ["contact", "contactChannel", "contact_channel", "phone"]));
    setTravelDetail(getItemText(editItem, ["travelDetail", "travel_detail"]));

    const nextStartDate = parseDateParamValue(
      getItemText(editItem, ["startDate", "start_date", "dateStart", "date_start"]),
    );
    const nextEndDate = parseDateParamValue(
      getItemText(editItem, ["endDate", "end_date", "dateEnd", "date_end"]),
    );

    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
    setHalfDay(
      getHalfDayLabel(getItemText(editItem, ["partFlag", "part_flag", "startpart", "half_day", "halfDay"])),
    );
    setApprover(
      getItemText(editItem, [
        "approverPosition",
        "approver_position",
        "approver_id",
        "positionId",
        "position_id",
      ]),
    );
    setApproverStaffId(
      getItemText(editItem, [
        "mainApprover",
        "main_approver",
        "approverName",
        "approver_name",
        "approver",
        "staffId",
        "staff_id",
      ]),
    );
    const nextSelectedAgents = getItemStringList(editItem, [
        "selectedAgents",
        "selected_agents",
        "agents",
        "agentStaffIds",
        "agent_staff_ids",
      ]);
    setSelectedAgents(
      getAgentSelectionLabels(nextSelectedAgents, getAgentList(initialAbsentData)),
    );
  }, [editId, editItem, initialAbsentData, isEditMode]);

  const dateError =
    startDate && endDate && startOfDay(endDate) < startOfDay(startDate)
      ? TEXT.ABSENT_VALIDATION_END_DATE_AFTER_START
      : "";
  const displayedDateError = dateError || validationErrors.date || "";
  const leaveDayCount = useMemo(() => {
    if (!startDate || !endDate || dateError) {
      return null;
    }

    return getWeekdayLeaveDayCount(startDate, endDate, halfDay !== "0");
  }, [dateError, endDate, halfDay, startDate]);

  const handleSubmit = useCallback(() => {
    if (isSubmitting || isRemoving) {
      return;
    }

    const nextErrors: ValidationErrors = {};

    if (!approver) {
      nextErrors.approver = TEXT.ABSENT_VALIDATION_APPROVER_REQUIRED;
    }

    if (!reason.trim()) {
      nextErrors.reason = TEXT.ABSENT_VALIDATION_REASON_REQUIRED;
    }

    if (!startDate || !endDate) {
      nextErrors.date = TEXT.ABSENT_VALIDATION_DATE_REQUIRED;
    }

    if (!contact.trim()) {
      nextErrors.contact = TEXT.ABSENT_VALIDATION_CONTACT_REQUIRED;
    }

    if (!selectedAgents.length) {
      nextErrors.agent = TEXT.ABSENT_VALIDATION_AGENT_REQUIRED;
    }

    setValidationErrors(nextErrors);

    if (Object.keys(nextErrors).length || dateError) {
      return;
    }

    if (!startDate || !endDate) {
      return;
    }

    setIsConfirmVisible(true);
  }, [
    approver,
    contact,
    dateError,
    endDate,
    isRemoving,
    isSubmitting,
    reason,
    selectedAgents,
    startDate,
  ]);

  const handleConfirmSubmit = useCallback(async () => {
    if (isSubmitting || isRemoving || !startDate || !endDate) {
      return;
    }

    setIsConfirmVisible(false);
    setIsSubmitting(true);
    setToastMessage("");
    setToastType("");

    try {
      const payload = {
          staff_id: userId,
          dept_id: deptId,
          step,
          status: absentStatus,
          times: absentTime,
          main_approver: approverStaffId,
          approver_position: approver,
          reason: reason.trim(),
          write_date: writeDate || formatDateTimeParam(new Date()),
          contact: contact.trim(),
          start_date: formatDateTimeParam(startDate),
          end_date: formatDateTimeParam(endDate),
          num_days: leaveDayCount?.toString() ?? "",
          startpart: getHalfDayValue(halfDay, halfDayOptions),
          travel_detail: travelDetail.trim(),
          agents: selectedAgentIds,
      };
      const result =
        isEditMode && editId
          ? await updateAbsentData(editId, payload, TYPE_ABSENT_BUSINESS)
          : await addAbsentData(payload, TYPE_ABSENT_BUSINESS);

      setToastType("success");
      setToastMessage(result.message || TEXT.ABSENT_BUSINESS_SUBMIT_SUCCESS_MESSAGE);
      setTimeout(() => {
        router.replace("/absent/waiting");
      }, 1500);
    } catch (error) {
      setToastType("error");
      setToastMessage(error instanceof Error ? error.message : TEXT.ABSENT_SUBMIT_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    approver,
    approverStaffId,
    absentStatus,
    absentTime,
    contact,
    deptId,
    editId,
    endDate,
    halfDay,
    isRemoving,
    isSubmitting,
    isEditMode,
    leaveDayCount,
    reason,
    selectedAgentIds,
    startDate,
    step,
    travelDetail,
    userId,
    writeDate,
  ]);

  const handleRemove = useCallback(() => {
    if (!isEditMode || !editId || isSubmitting || isRemoving) {
      return;
    }

    setIsRemoveConfirmVisible(true);
  }, [editId, isEditMode, isRemoving, isSubmitting]);

  const handleConfirmRemove = useCallback(async () => {
    if (!isEditMode || !editId || isSubmitting || isRemoving) {
      return;
    }

    setIsRemoveConfirmVisible(false);
    setIsRemoving(true);
    setToastMessage("");
    setToastType("");

    try {
      const result = await removeData(editId, TYPE_ABSENT_BUSINESS);
      setToastType("success");
      setToastMessage(result.message || TEXT.SHARED_DELETE_THAI);
      setTimeout(() => {
        router.replace("/absent/waiting");
      }, 1500);
    } catch (error) {
      setToastType("error");
      setToastMessage(error instanceof Error ? error.message : TEXT.ABSENT_SUBMIT_ERROR_MESSAGE);
    } finally {
      setIsRemoving(false);
    }
  }, [editId, isEditMode, isRemoving, isSubmitting]);

  const handleSelectAgent = useCallback((selectedAgent: string) => {
    if (!selectedAgent) {
      return;
    }

    let didAddAgent = false;

    setSelectedAgents((currentAgents) => {
      if (currentAgents.includes(selectedAgent)) {
        return currentAgents;
      }

      didAddAgent = true;
      return [...currentAgents, selectedAgent];
    });

    if (didAddAgent) {
      clearValidationError("agent");
    }

    setOpenSelect(null);
  }, [clearValidationError]);

  const handleRemoveAgent = useCallback((agentToRemove: string) => {
    setSelectedAgents((currentAgents) =>
      currentAgents.filter((currentAgent) => currentAgent !== agentToRemove),
    );
  }, []);

  if (isInitialLoading) {
    return (
      <ThemedView style={styles.container}>
        <NavTopBar title={TEXT.ABSENT_BUSINESS_TITLE} backHref={backHref} />
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
        <NavTopBar title={TEXT.ABSENT_BUSINESS_TITLE} backHref={backHref} />
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">
            {shouldShowRetry ? TEXT.SHARED_ERROR_TITLE_THAI : TEXT.ABSENT_CANNOT_REQUEST_TITLE}
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
      <NavTopBar title={TEXT.ABSENT_BUSINESS_TITLE} backHref={backHref} />

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
              onSelect={(value, option) => {
                setApprover(value);
                setApproverStaffId(option?.staffId ?? "");
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
                {displayedDateError || TEXT.ABSENT_SELECT_DATE_HINT}
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
              <ThemedText type="defaultSemiBold">
                {TEXT.ABSENT_TRAVEL_DETAIL_LABEL}
              </ThemedText>
              <TextInput
                multiline
                numberOfLines={2}
                onChangeText={setTravelDetail}
                placeholder={TEXT.ABSENT_TRAVEL_DETAIL_PLACEHOLDER}
                placeholderTextColor="#8A969C"
                style={[styles.input, styles.textArea]}
                textAlignVertical="top"
                value={travelDetail}
              />
            </View>

            <AgentSelectField
              options={availableAgentOptions}
              selectedAgents={selectedAgents}
              isOpen={openSelect === "agent"}
              hasError={Boolean(validationErrors.agent)}
              errorMessage={validationErrors.agent}
              onToggle={() =>
                setOpenSelect(openSelect === "agent" ? null : "agent")
              }
              onSelect={handleSelectAgent}
              onRemove={handleRemoveAgent}
            />

            <View style={isEditMode ? styles.actionRow : undefined}>
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting || isRemoving}
                onPress={handleSubmit}
                style={[
                  styles.submitButton,
                  isEditMode ? styles.actionButton : undefined,
                  isSubmitting || isRemoving ? styles.disabledButton : undefined,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : null}
                <ThemedText
                  lightColor="#FFFFFF"
                  darkColor="#FFFFFF"
                  type="defaultSemiBold"
                >
                  {isEditMode ? TEXT.SHARED_UPDATE : TEXT.ABSENT_SUBMIT_REQUEST}
                </ThemedText>
              </Pressable>

              {isEditMode ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting || isRemoving}
                  onPress={handleRemove}
                  style={[
                    styles.removeRequestButton,
                    isSubmitting || isRemoving ? styles.disabledButton : undefined,
                  ]}
                >
                  {isRemoving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : null}
                  <ThemedText
                    lightColor="#FFFFFF"
                    darkColor="#FFFFFF"
                    type="defaultSemiBold"
                  >
                    {TEXT.SHARED_DELETE_THAI}
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          </View>
        </ThemedView>
      </ScrollView>
      <Modal
        transparent
        visible={isConfirmVisible}
        animationType="fade"
        onRequestClose={() => setIsConfirmVisible(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setIsConfirmVisible(false)}
        >
          <Pressable>
            <ThemedView
              style={styles.confirmModal}
              lightColor="#FFFFFF"
              darkColor="#151718"
            >
              <ThemedText type="subtitle">
                {TEXT.ABSENT_CONFIRM_SUBMIT_TITLE}
              </ThemedText>
              <ThemedText style={styles.confirmMessage}>
                {TEXT.ABSENT_CONFIRM_SUBMIT_MESSAGE}
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsConfirmVisible(false)}
                  style={styles.secondaryButton}
                >
                  <ThemedText type="defaultSemiBold">
                    {TEXT.ABSENT_CONFIRM_SUBMIT_CANCEL}
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={handleConfirmSubmit}
                  style={[
                    styles.submitButton,
                    isSubmitting ? styles.disabledButton : undefined,
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : null}
                  <ThemedText
                    lightColor="#FFFFFF"
                    darkColor="#FFFFFF"
                    type="defaultSemiBold"
                  >
                    {TEXT.ABSENT_CONFIRM_SUBMIT_ACTION}
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        transparent
        visible={isRemoveConfirmVisible}
        animationType="fade"
        onRequestClose={() => setIsRemoveConfirmVisible(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setIsRemoveConfirmVisible(false)}
        >
          <Pressable>
            <ThemedView
              style={styles.confirmModal}
              lightColor="#FFFFFF"
              darkColor="#151718"
            >
              <ThemedText type="subtitle">
                {TEXT.ABSENT_CONFIRM_REMOVE_TITLE}
              </ThemedText>
              <ThemedText style={styles.confirmMessage}>
                {TEXT.ABSENT_CONFIRM_REMOVE_MESSAGE}
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsRemoveConfirmVisible(false)}
                  style={styles.secondaryButton}
                >
                  <ThemedText type="defaultSemiBold">
                    {TEXT.ABSENT_CONFIRM_SUBMIT_CANCEL}
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isRemoving}
                  onPress={handleConfirmRemove}
                  style={[
                    styles.removeConfirmButton,
                    isRemoving ? styles.disabledButton : undefined,
                  ]}
                >
                  {isRemoving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : null}
                  <ThemedText
                    lightColor="#FFFFFF"
                    darkColor="#FFFFFF"
                    type="defaultSemiBold"
                  >
                    {TEXT.SHARED_DELETE_THAI}
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
      <AppToast
        message={toastMessage}
        type={toastType === "error" ? "error" : "success"}
      />
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
    gap: 24,
    marginTop: 24,
  },
  field: {
    gap: 10,
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
    gap: 14,
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
  modalContent: {
    width: "100%",
    alignItems: "center",
  },
  selectModal: {
    width: "100%",
    maxWidth: 420,
    maxHeight: 460,
    borderRadius: 8,
    padding: 16,
  },
  confirmModal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 8,
    padding: 20,
  },
  confirmMessage: {
    marginTop: 10,
    color: "#687076",
    fontSize: 14,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  wideSelectModal: {
    width: "95%",
    height: 520,
    maxHeight: "85%",
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
  wideOptionScroll: {
    flex: 1,
    maxHeight: undefined,
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
  optionWithAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  selectedOption: {
    borderColor: "#0A6E8A",
    backgroundColor: "#0A6E8A",
  },
  optionText: {
    flex: 1,
    color: "#11181C",
    lineHeight: 20,
  },
  optionActionText: {
    fontSize: 13,
    lineHeight: 18,
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
  disabledButton: {
    opacity: 0.45,
  },
  actionRow: {
    flexDirection: "row",
    gap: 14,
    justifyContent: "center",
    marginTop: 6,
  },
  actionButton: {
    flex: 1,
    marginTop: 0,
  },
  submitButton: {
    minHeight: 48,
    minWidth: 132,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0A6E8A",
    marginTop: 6,
  },
  removeRequestButton: {
    minHeight: 48,
    minWidth: 132,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#B42318",
  },
  removeConfirmButton: {
    minHeight: 48,
    minWidth: 132,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#B42318",
  },
});
