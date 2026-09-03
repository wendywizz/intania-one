import { X } from "lucide-react-native";
import { TEXT } from "@/constants/text";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { navReplace } from "@/utils/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { type AppColors, useColors, useScreenGutter, useThemedStyles } from '@/constants/theme';

import { AppToast } from "@/components/app-toast";
import { DatePickerField } from "@/components/date-picker-field";
import { useHolidays } from "@/hooks/use-holidays";
import { ErrorState } from "@/components/error-state";
import { LoadingAnimate } from "@/components/loading-animate";
import { ScreenHeader } from "@/components/screen-header";
import { SectionCard } from "@/components/section-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { UserAvatar } from "@/components/user-avatar";
import { AppFonts } from "@/constants/fonts";
import { TYPE_ABSENCE_BIRTH } from "@/constants/types";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import type { absence } from "@/models/types";
import {
  addabsenceData,
  initabsenceData,
  removeData,
  updateabsenceData,
} from "@/services/absenceService";
import {
  formatDateParam,
  formatDateTimeParam,
  getabsenceTextValue,
  getWeekdayLeaveDayCount,
  isRetryableInitialError,
  startOfDay,
} from "@/utils/absence-form";
import {
  getStaffDisplayLabel,
  getStaffNameLabel,
  getStaffPositionLabel,
} from "@/utils/staff-label";
import { StaffOptionLabel } from "@/components/staff-option-label";

// Remove the default focus outline on web so active inputs match the
// borderless underline style (RN Web only; no-op on native).
const webNoOutline: any = Platform.OS === "web" ? { outlineStyle: "none" } : null;

type Approver = {
  staffId?: string;
  firstNameTH?: string;
  lastNameTH?: string;
  positionName?: string;
};

type ValidationErrors = Partial<
  Record<"approver" | "date" | "contact", string>
>;

type SelectOption = {
  label: string;
  value: string;
  staffId?: string;
  photoId?: string;
  // Staff options render as two lines (position over a bold name) instead of
  // the flat `label`, which stays as the collapsed value and search text.
  position?: string;
  name?: string;
};

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

function getApproverList(data: absence | null): Approver[] {
  return Array.isArray(data?.approverList)
    ? (data.approverList as Approver[])
    : [];
}

function getApproverLabel(approver: Approver) {
  return getStaffDisplayLabel(approver);
}

function getStaffId(staff: Approver) {
  return getabsenceTextValue(staff as absence, ["staffId", "staff_id", "STAFF_ID", "id"]);
}

// Staff photos are keyed on the university staff id (UNI_STAFF_ID). Fall back to
// the internal staffId so an avatar still resolves if only that is present.
function getStaffPhotoId(staff: Approver) {
  return (
    getabsenceTextValue(staff as absence, [
      "uniStaffId",
      "uni_staff_id",
      "UNI_STAFF_ID",
    ]) || getStaffId(staff)
  );
}

function getPositionId(staff: Approver) {
  return getabsenceTextValue(staff as absence, ["positionId", "position_id", "POSITION_ID"]);
}

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
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );
  const selectedOption = normalizedOptions.find(
    (option) => option.value === value,
  );
  const displayValue = selectedOption?.label || value;

  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
        style={[styles.selectButton, hasError ? styles.inputError : undefined]}
      >
        <View style={styles.selectValueRow}>
          {selectedOption?.photoId ? (
            <UserAvatar staffId={selectedOption.photoId} size={30} />
          ) : null}
          <ThemedText style={[styles.selectText, !displayValue && styles.placeholder]} numberOfLines={1}>
            {displayValue || placeholder}
          </ThemedText>
        </View>
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
                  accessibilityLabel={TEXT.SHARED_CLOSE_THAI}
                  onPress={onToggle}
                  style={styles.closeButton}
                >
                  <X size={20} color={c.text} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.optionScroll}
                contentContainerStyle={styles.optionScrollContent}
              >
                {normalizedOptions.length ? (
                  normalizedOptions.map((option, index) => (
                    <Pressable
                      key={`${String(option.value)}-${index}`}
                      accessibilityRole="button"
                      onPress={() => onSelect(option.value, option)}
                      style={[
                        styles.option,
                        value === option.value ? styles.selectedOption : undefined,
                      ]}
                    >
                      <View style={styles.optionRow}>
                        {option.photoId ? (
                          <UserAvatar staffId={option.photoId} size={38} />
                        ) : null}
                        {option.position || option.name ? (
                          <StaffOptionLabel
                            position={option.position}
                            name={option.name}
                            selected={value === option.value}
                          />
                        ) : (
                          <ThemedText
                            style={[
                              styles.optionText,
                              value === option.value ? styles.selectedOptionText : undefined,
                            ]}
                          >
                            {option.label}
                          </ThemedText>
                        )}
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

export default function BirthScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const gutter = useScreenGutter();
  const { user: authUser } = useAuth();
  const params = useLocalSearchParams<{ id?: string; mode?: string }>();
  const routeEditId = Array.isArray(params.id) ? params.id[0] : params.id ?? "";
  const isEditMode =
    (Array.isArray(params.mode) ? params.mode[0] : params.mode) === "edit" ||
    Boolean(routeEditId);
  const userId = authUser?.staffId || USER_ID;
  const holidays = useHolidays(userId);
  const backHref = isEditMode ? "/absence/pending" : "/absence";
  const [initialabsenceData, setInitialabsenceData] = useState<absence | null>(
    null,
  );
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState("");
  const [approver, setApprover] = useState("");
  const [approverStaffId, setApproverStaffId] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [contact, setContact] = useState("");
  const [deptId, setDeptId] = useState("");
  const [step, setStep] = useState("");
  const [absenceTime, setabsenceTime] = useState("");
  const [absenceStatus, setabsenceStatus] = useState("");
  const [isApproverOpen, setIsApproverOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isRemoveConfirmVisible, setIsRemoveConfirmVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "">("");

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

  const loadInitialabsenceData = useCallback(async () => {
    setIsInitialLoading(true);
    setInitialError("");
    setInitialabsenceData(null);
    setDeptId("");
    setStep("");
    setabsenceTime("");
    setabsenceStatus("");

    try {
      const data = await initabsenceData(userId, TYPE_ABSENCE_BIRTH);
      setInitialabsenceData(data);
      setDeptId(getabsenceTextValue(data, ["deptId", "dept_id", "departmentId", "department_id"]));
      setStep(getabsenceTextValue(data, ["step"]));
      setabsenceStatus(getabsenceTextValue(data, ["absenceStatus", "ABSENCE_status", "status"]));
      setabsenceTime(getabsenceTextValue(data, ["absentTime", "absenceTime", "ABSENCE_time", "times", "time"]));
    } catch (error) {
      setInitialError(
        error instanceof Error
          ? error.message
          : TEXT.ABSENCE_INIT_LOAD_ERROR_MESSAGE,
      );
    } finally {
      setIsInitialLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadInitialabsenceData();
    }, [loadInitialabsenceData]),
  );

  const approverOptions = useMemo(
    () =>
      getApproverList(initialabsenceData)
        .map((item) => ({
          label: getApproverLabel(item),
          value: getPositionId(item),
          staffId: getStaffId(item),
          photoId: getStaffPhotoId(item),
          position: getStaffPositionLabel(item),
          name: getStaffNameLabel(item),
        }))
        .filter((item) => item.label && item.value),
    [initialabsenceData],
  );
  const minimumEndDate = useMemo(
    () => (startDate ? startOfDay(startDate) : undefined),
    [startDate],
  );
  const dateError =
    startDate && endDate && startOfDay(endDate) < startOfDay(startDate)
      ? TEXT.ABSENCE_VALIDATION_END_DATE_AFTER_START
      : "";
  const displayedDateError = dateError || validationErrors.date || "";
  // Make sure holidays for the whole selected range are loaded so the day count
  // can exclude them.
  useEffect(() => {
    holidays.ensureRange(startDate, endDate);
  }, [startDate, endDate, holidays.ensureRange]);

  const leaveDayCount = useMemo(() => {
    if (!startDate || !endDate || dateError) {
      return null;
    }

    return getWeekdayLeaveDayCount(startDate, endDate, false, holidays.isHoliday);
  }, [dateError, endDate, startDate, holidays.isHoliday]);

  const handleSubmit = useCallback(() => {
    if (isSubmitting || isRemoving) {
      return;
    }

    const nextErrors: ValidationErrors = {};

    if (!approver) {
      nextErrors.approver = TEXT.ABSENCE_VALIDATION_APPROVER_REQUIRED;
    }

    if (!startDate || !endDate) {
      nextErrors.date = TEXT.ABSENCE_VALIDATION_DATE_REQUIRED;
    }

    if (!contact.trim()) {
      nextErrors.contact = TEXT.ABSENCE_VALIDATION_CONTACT_REQUIRED;
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
          status: absenceStatus,
          times: absenceTime,
          main_approver: approverStaffId,
          approver_position: approver,
          write_date: formatDateTimeParam(new Date()),
          contact: contact.trim(),
          start_date: formatDateParam(startDate),
          end_date: formatDateParam(endDate),
          num_days: leaveDayCount,
      };
      const result =
        isEditMode && routeEditId
          ? await updateabsenceData(routeEditId, payload, TYPE_ABSENCE_BIRTH)
          : await addabsenceData(payload, TYPE_ABSENCE_BIRTH);

      setToastType("success");
      setToastMessage(result.message || TEXT.ABSENCE_BIRTH_SUBMIT_SUCCESS_MESSAGE);
      setTimeout(() => {
        router.replace("/absence/pending");
      }, 1500);
    } catch (error) {
      setToastType("error");
      setToastMessage(error instanceof Error ? error.message : TEXT.ABSENCE_SUBMIT_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    absenceStatus,
    absenceTime,
    approver,
    approverStaffId,
    contact,
    deptId,
    endDate,
    isRemoving,
    isSubmitting,
    isEditMode,
    leaveDayCount,
    routeEditId,
    startDate,
    step,
    userId,
  ]);

  const handleRemove = useCallback(() => {
    if (!isEditMode || !routeEditId || isSubmitting || isRemoving) {
      return;
    }

    setIsRemoveConfirmVisible(true);
  }, [isEditMode, isRemoving, isSubmitting, routeEditId]);

  const handleConfirmRemove = useCallback(async () => {
    if (!isEditMode || !routeEditId || isSubmitting || isRemoving) {
      return;
    }

    setIsRemoveConfirmVisible(false);
    setIsRemoving(true);
    setToastMessage("");
    setToastType("");

    try {
      const result = await removeData(routeEditId, TYPE_ABSENCE_BIRTH);
      setToastType("success");
      setToastMessage(result.message || TEXT.SHARED_DELETE_THAI);
      setTimeout(() => {
        router.replace("/absence/pending");
      }, 1500);
    } catch (error) {
      setToastType("error");
      setToastMessage(error instanceof Error ? error.message : TEXT.ABSENCE_SUBMIT_ERROR_MESSAGE);
    } finally {
      setIsRemoving(false);
    }
  }, [isEditMode, isRemoving, isSubmitting, routeEditId]);

  if (isInitialLoading) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader title={TEXT.ABSENCE_BIRTH_TITLE} backHref={backHref} showHomeButton={false} titleInNavBar tone="primary" />
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
        <ScreenHeader title={TEXT.ABSENCE_BIRTH_TITLE} backHref={backHref} showHomeButton={false} titleInNavBar tone="primary" />
        {shouldShowRetry ? (
          <ErrorState
            variant="error"
            title={TEXT.SHARED_ERROR_TITLE_THAI}
            message={initialError}
            onRetry={loadInitialabsenceData}
            onBack={() => navReplace("/absence")}
          />
        ) : (
          <ErrorState
            variant="empty"
            title={TEXT.ABSENCE_CANNOT_REQUEST_TITLE}
            message={TEXT.ABSENCE_PENDING_APPROVAL_MESSAGE}
            actions={[
              {
                label: TEXT.ABSENCE_VIEW_PENDING_APPROVAL,
                onPress: () => navReplace("/absence/pending"),
                variant: "primary",
              },
            ]}
          />
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={TEXT.ABSENCE_BIRTH_TITLE} backHref={backHref} showHomeButton={false} titleInNavBar tone="primary" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCard}>
          <View style={styles.form}>
            {/* Approver */}
            <SectionCard>
              <SelectField
                label={TEXT.ABSENCE_APPROVER_LABEL}
                placeholder={TEXT.ABSENCE_APPROVER_PLACEHOLDER}
                value={approver}
                options={approverOptions}
                isOpen={isApproverOpen}
                hasError={Boolean(validationErrors.approver)}
                errorMessage={validationErrors.approver}
                onToggle={() => setIsApproverOpen((isOpen) => !isOpen)}
                onSelect={(value, option) => {
                  setApprover(value);
                  setApproverStaffId(option?.staffId ?? "");
                  clearValidationError("approver");
                  setIsApproverOpen(false);
                }}
              />
            </SectionCard>

            {/* Absence date */}
            <SectionCard>
              <View style={styles.field}>
                <ThemedText style={styles.fieldLabel}>
                  {TEXT.ABSENCE_LEAVE_DATE_LABEL}
                </ThemedText>
                <View style={styles.dateRow}>
                  <DatePickerField
                    label={TEXT.ABSENCE_START_DATE_LABEL}
                    hideLabel
                    value={startDate}
                    holidays={holidays.holidaySet}
                    onVisibleMonthChange={holidays.ensureMonth}
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
                    label={TEXT.ABSENCE_END_DATE_LABEL}
                    hideLabel
                    value={endDate}
                    minimumDate={minimumEndDate}
                    highlightedStartDate={startDate}
                    holidays={holidays.holidaySet}
                    onVisibleMonthChange={holidays.ensureMonth}
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
                  {displayedDateError || TEXT.ABSENCE_SELECT_DATE_HINT}
                </ThemedText>
              </View>
            </SectionCard>

            {/* Contact and reason */}
            <SectionCard>
              <View style={styles.field}>
                <ThemedText style={styles.fieldLabel}>
                  {TEXT.ABSENCE_CONTACT_CHANNEL_LABEL}
                </ThemedText>
                <TextInput
                  onChangeText={(value) => {
                    setContact(value);
                    if (value.trim()) {
                      clearValidationError("contact");
                    }
                  }}
                  placeholder={TEXT.ABSENCE_CONTACT_CHANNEL_PLACEHOLDER}
                  placeholderTextColor="#8A969C"
                  style={[
                    styles.input,
                    validationErrors.contact ? styles.inputError : undefined,
                    webNoOutline,
                  ]}
                  value={contact}
                />
                {validationErrors.contact ? (
                  <ThemedText style={styles.fieldError}>
                    {validationErrors.contact}
                  </ThemedText>
                ) : null}
              </View>
            </SectionCard>

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
                  {isEditMode ? TEXT.SHARED_UPDATE : TEXT.ABSENCE_SUBMIT_REQUEST}
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
        </View>
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
                {TEXT.ABSENCE_CONFIRM_SUBMIT_TITLE}
              </ThemedText>
              <ThemedText style={styles.confirmMessage}>
                {TEXT.ABSENCE_CONFIRM_SUBMIT_MESSAGE}
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsConfirmVisible(false)}
                  style={[styles.secondaryButton, styles.confirmActionButton]}
                >
                  <ThemedText type="defaultSemiBold">
                    {TEXT.ABSENCE_CONFIRM_SUBMIT_CANCEL}
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={handleConfirmSubmit}
                  style={[
                    styles.submitButton,
                    styles.confirmActionButton,
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
                    {TEXT.ABSENCE_CONFIRM_SUBMIT_ACTION}
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
                {TEXT.ABSENCE_CONFIRM_REMOVE_TITLE}
              </ThemedText>
              <ThemedText style={styles.confirmMessage}>
                {TEXT.ABSENCE_CONFIRM_REMOVE_MESSAGE}
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsRemoveConfirmVisible(false)}
                  style={[styles.secondaryButton, styles.confirmActionButton]}
                >
                  <ThemedText type="defaultSemiBold">
                    {TEXT.ABSENCE_CONFIRM_SUBMIT_CANCEL}
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isRemoving}
                  onPress={handleConfirmRemove}
                  style={[
                    styles.removeConfirmButton,
                    styles.confirmActionButton,
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

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 24,
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
  formCard: {},
  form: {
    marginTop: 4,
    gap: 14,
  },
  field: {
    paddingHorizontal: 0,
    paddingVertical: 12,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 15,
    lineHeight: 20,
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  input: {
    minHeight: 40,
    color: c.text,
    fontFamily: AppFonts.psuRegular,
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 0,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.inputBorder,
  },
  inputError: {
    borderBottomWidth: 1.5,
    borderBottomColor: c.danger,
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  hint: {
    marginTop: 10,
    color: c.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  errorText: {
    color: c.danger,
  },
  fieldError: {
    color: c.danger,
    fontSize: 12,
    lineHeight: 18,
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
  selectValueRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectText: {
    flex: 1,
    color: c.text,
    fontSize: 16,
    fontFamily: AppFonts.psuRegular,
  },
  optionRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  placeholder: {
    color: c.textFaint,
  },
  chevron: {
    color: c.textMuted,
    fontSize: 18,
    lineHeight: 22,
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
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: "row-reverse",
    gap: 12,
    marginTop: 20,
  },
  confirmActionButton: {
    flex: 1,
    minWidth: 0,
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
    maxHeight: 360,
  },
  optionScrollContent: {
    gap: 8,
  },
  option: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 0,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  selectedOption: {},
  optionText: {
    color: c.text,
    lineHeight: 20,
  },
  selectedOptionText: {
    color: c.primary,
    fontFamily: AppFonts.psuBold,
  },
  emptyOption: {
    color: c.textMuted,
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
    borderColor: c.border,
    backgroundColor: c.surface,
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
    backgroundColor: c.pomegranate,
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
    backgroundColor: c.danger,
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
    backgroundColor: c.danger,
  },
  disabledButton: {
    opacity: 0.65,
  },
});
