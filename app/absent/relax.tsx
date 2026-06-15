import { TEXT } from "@/constants/text";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { navReplace } from "@/utils/navigation";
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
import { TYPE_ABSENT_RELAX } from "@/constants/types";
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
  formatDateParam,
  formatDateTimeParam,
  getAbsentTextValue,
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
  Record<"approver" | "date" | "contact" | "agent", string>
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

function getApproverLabel(approver: Approver) {
  return getStaffDisplayLabel(approver);
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

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
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

type SelectFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  options: (string | SelectOption)[];
  isOpen: boolean;
  searchable?: boolean;
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
  optionActionLabel,
  hasError,
  errorMessage,
  onToggle,
  onSelect,
}: SelectFieldProps) {
  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );
  const selectedOption = normalizedOptions.find(
    (option) => option.value === value,
  );
  const displayValue = selectedOption?.label || value;
  const [searchQuery, setSearchQuery] = useState("");
  const visibleOptions = searchable && searchQuery.trim()
    ? normalizedOptions.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.trim().toLowerCase()),
      )
    : normalizedOptions;

  return (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
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
        onRequestClose={onToggle}
      >
        <Pressable style={styles.backdrop} onPress={onToggle}>
          <Pressable>
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
                  {label}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={onToggle}
                  style={styles.closeButton}
                >
                  <ThemedText type="defaultSemiBold">
                    {TEXT.SHARED_CLOSE_THAI}
                  </ThemedText>
                </Pressable>
              </View>

              {searchable ? (
                <TextInput
                  onChangeText={setSearchQuery}
                  placeholder={TEXT.SHARED_SEARCH_NAME_PLACEHOLDER}
                  placeholderTextColor="#8A969C"
                  style={styles.searchInput}
                  value={searchQuery}
                />
              ) : null}

              <ScrollView
                style={styles.optionScroll}
                contentContainerStyle={styles.optionScrollContent}
              >
                {visibleOptions.length ? (
                  visibleOptions.map((option, index) => (
                    <Pressable
                      key={`${String(option.value)}-${index}`}
                      accessibilityRole="button"
                      onPress={() => onSelect(option.value, option)}
                      style={[
                        styles.option,
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
                          lightColor={value === option.value ? "#FFFFFF" : "#0A6E8A"}
                          darkColor={value === option.value ? "#FFFFFF" : "#0A6E8A"}
                          type="defaultSemiBold"
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

export default function RelaxScreen() {
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
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [contact, setContact] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [deptId, setDeptId] = useState("");
  const [step, setStep] = useState("");
  const [absentTime, setAbsentTime] = useState("");
  const [absentStatus, setAbsentStatus] = useState("");
  const [openSelect, setOpenSelect] = useState<"approver" | "agent" | null>(
    null,
  );
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

    try {
      const data = await initAbsentData(userId, TYPE_ABSENT_RELAX);
      setInitialAbsentData(data);
      setDeptId(getAbsentTextValue(data, ["deptId", "dept_id", "departmentId", "department_id"]));
      setStep(getAbsentTextValue(data, ["step"]));
      setAbsentStatus(getAbsentTextValue(data, ["absentStatus", "absent_status", "status"]));
      setAbsentTime(getAbsentTextValue(data, ["absentTime", "absent_time", "times", "time"]));
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
          const previousData = await getAbsentData(routeEditId, TYPE_ABSENT_RELAX);

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
          label: getApproverLabel(item),
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

    setContact(getItemText(editItem, ["contact", "contactChannel", "contact_channel", "phone"]));

    const nextStartDate = parseDateParamValue(
      getItemText(editItem, ["startDate", "start_date", "dateStart", "date_start"]),
    );
    const nextEndDate = parseDateParamValue(
      getItemText(editItem, ["endDate", "end_date", "dateEnd", "date_end"]),
    );

    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
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

  const startDateError =
    startDate && startOfDay(startDate) < minimumStartDate
      ? TEXT.ABSENT_VALIDATION_START_DATE_NOT_PAST
      : "";
  const dateError =
    startDate && endDate && startOfDay(endDate) < startOfDay(startDate)
      ? TEXT.ABSENT_VALIDATION_END_DATE_AFTER_START
      : "";
  const displayedDateError =
    startDateError || dateError || validationErrors.date || "";
  const leaveDayCount = useMemo(() => {
    if (!startDate || !endDate || startDateError || dateError) {
      return null;
    }

    return getWeekdayLeaveDayCount(startDate, endDate, false);
  }, [dateError, endDate, startDate, startDateError]);

  const handleSubmit = useCallback(() => {
    if (isSubmitting || isRemoving) {
      return;
    }

    const nextErrors: ValidationErrors = {};

    if (!approver) {
      nextErrors.approver = TEXT.ABSENT_VALIDATION_APPROVER_REQUIRED;
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

    if (Object.keys(nextErrors).length || startDateError || dateError) {
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
    selectedAgents.length,
    startDate,
    startDateError,
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
          write_date: formatDateTimeParam(new Date()),
          contact: contact.trim(),
          start_date: formatDateParam(startDate),
          end_date: formatDateParam(endDate),
          num_days: leaveDayCount,
          agents: selectedAgentIds,
      };
      const result =
        isEditMode && editId
          ? await updateAbsentData(editId, payload, TYPE_ABSENT_RELAX)
          : await addAbsentData(payload, TYPE_ABSENT_RELAX);

      setToastType("success");
      setToastMessage(result.message || TEXT.ABSENT_RELAX_SUBMIT_SUCCESS_MESSAGE);
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
    absentStatus,
    absentTime,
    approver,
    approverStaffId,
    contact,
    deptId,
    editId,
    endDate,
    isRemoving,
    isSubmitting,
    isEditMode,
    leaveDayCount,
    selectedAgentIds,
    startDate,
    step,
    userId,
  ]);

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
      const result = await removeData(editId, TYPE_ABSENT_RELAX);
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

  if (isInitialLoading) {
    return (
      <ThemedView style={styles.container}>
        <NavTopBar title={TEXT.ABSENT_RELAX_TITLE} backHref={backHref} />
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
        <NavTopBar title={TEXT.ABSENT_RELAX_TITLE} backHref={backHref} />
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
              onPress={() => navReplace("/absent")}
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
      <NavTopBar title={TEXT.ABSENT_RELAX_TITLE} backHref={backHref} />

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
            {TEXT.ABSENT_RELAX_FORM_TITLE}
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
  selectedOption: {
    borderColor: "#0A6E8A",
    backgroundColor: "#0A6E8A",
  },
  optionText: {
    flex: 1,
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
  disabledButton: {
    opacity: 0.65,
  },
});
