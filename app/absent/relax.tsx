import { TEXT } from "@/constants/text";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";

import { AppToast } from "@/components/app-toast";
import { DatePickerField } from "@/components/date-picker-field";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppFonts } from "@/constants/fonts";
import { TYPE_ABSENT_RELAX } from "@/constants/type-absent";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import type { Absent } from "@/models/types";
import { addAbsentData, initAbsentData } from "@/services/absentService";
import {
  formatDateParam,
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

type ValidationErrors = Partial<
  Record<"approver" | "reason" | "date" | "contact", string>
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

function getApproverLabel(approver: Approver) {
  return getStaffDisplayLabel(approver);
}

function getStaffId(staff: Approver) {
  return getAbsentTextValue(staff as Absent, ["staffId", "staff_id", "STAFF_ID", "id"]);
}

function getPositionId(staff: Approver) {
  return getAbsentTextValue(staff as Absent, ["positionId", "position_id", "POSITION_ID"]);
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

              <ScrollView
                style={styles.optionScroll}
                contentContainerStyle={styles.optionScrollContent}
              >
                {normalizedOptions.length ? (
                  normalizedOptions.map((option) => (
                    <Pressable
                      key={option.value}
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
  const [initialAbsentData, setInitialAbsentData] = useState<Absent | null>(
    null,
  );
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState("");
  const [approver, setApprover] = useState("");
  const [approverStaffId, setApproverStaffId] = useState("");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [halfDay, setHalfDay] = useState("");
  const [contact, setContact] = useState("");
  const [deptId, setDeptId] = useState("");
  const [step, setStep] = useState("");
  const [absentTime, setAbsentTime] = useState("");
  const [absentStatus, setAbsentStatus] = useState("");
  const [openSelect, setOpenSelect] = useState<"approver" | "halfDay" | null>(
    null,
  );
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "">("");
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

    return getWeekdayLeaveDayCount(startDate, endDate, halfDay !== "0");
  }, [dateError, endDate, halfDay, startDate, startDateError]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) {
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

    setValidationErrors(nextErrors);

    if (Object.keys(nextErrors).length || startDateError || dateError) {
      return;
    }

    if (!startDate || !endDate) {
      return;
    }

    setIsSubmitting(true);
    setToastMessage("");
    setToastType("");

    try {
      const result = await addAbsentData(
        {
          staff_id: userId,
          dept_id: deptId,
          step,
          status: absentStatus,
          times: absentTime,
          main_approver: approverStaffId,
          approver_position: approver,
          reason: reason.trim(),
          write_date: formatDateTimeParam(new Date()),
          contact: contact.trim(),
          start_date: formatDateParam(startDate),
          end_date: formatDateParam(endDate),
          num_days: leaveDayCount,
          startpart: getHalfDayValue(halfDay, halfDayOptions),
        },
        TYPE_ABSENT_RELAX,
      );

      setToastType("success");
      setToastMessage(result.message || TEXT.ABSENT_RELAX_SUBMIT_SUCCESS_MESSAGE);
      setTimeout(() => {
        router.replace("/absent/waiting");
      }, 900);
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
    dateError,
    deptId,
    endDate,
    halfDay,
    isSubmitting,
    leaveDayCount,
    reason,
    startDate,
    startDateError,
    step,
    userId,
  ]);

  if (isInitialLoading) {
    return (
      <ThemedView style={styles.container}>
        <NavTopBar title={TEXT.ABSENT_RELAX_TITLE} backHref="/absent" />
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
        <NavTopBar title={TEXT.ABSENT_RELAX_TITLE} backHref="/absent" />
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
      <NavTopBar title={TEXT.ABSENT_RELAX_TITLE} backHref="/absent" />

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

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={handleSubmit}
              style={[styles.submitButton, isSubmitting ? styles.disabledButton : undefined]}
            >
              {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
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
    gap: 18,
    marginTop: 20,
  },
  field: {
    gap: 8,
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
  disabledButton: {
    opacity: 0.65,
  },
});
