import { TEXT } from "@/constants/text";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
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
import { TYPE_ABSENT_SICK } from "@/constants/type-absent";
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
  getAbsentTextValue,
  getHalfDayValue,
  getWeekdayLeaveDayCount,
  isRetryableInitialError,
  startOfDay
} from "@/utils/absent-form";

type Approver = {
  staffId?: string;
  staff_id?: string;
  positionId?: string;
  position_id?: string;
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

type UploadableFile =
  | Blob
  | {
      uri: string;
      name?: string;
      type?: string;
    };

function getApproverList(data: Absent | null): Approver[] {
  const approverList = data?.approverList;

  if (Array.isArray(approverList)) {
    return approverList as Approver[];
  }

  if (
    approverList &&
    typeof approverList === "object" &&
    Array.isArray((approverList as { item?: unknown }).item)
  ) {
    return (approverList as { item: Approver[] }).item;
  }

  return [];
}

function getApproverLabel(approver: Approver) {
  const fullName =
    `${approver.firstNameTH ?? ""} ${approver.lastNameTH ?? ""}`.trim();
  const positionName = approver.positionName?.trim();

  if (positionName && fullName) {
    return `${positionName} (${fullName})`;
  }

  return positionName || fullName || approver.staffId || "";
}

function getApproverPositionId(approver: Approver) {
  return String(approver.positionId ?? approver.position_id ?? "").trim();
}

function getApproverStaffId(approver: Approver) {
  return String(approver.staffId ?? approver.staff_id ?? "").trim();
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

const halfDayOptions: SelectOption[] = [
  { label: TEXT.ABSENT_HALF_DAY_NONE, value: "0" },
  { label: TEXT.ABSENT_HALF_DAY_FIRST_MORNING, value: "1" },
  { label: TEXT.ABSENT_HALF_DAY_FIRST_AFTERNOON, value: "2" },
  { label: TEXT.ABSENT_HALF_DAY_LAST_MORNING, value: "3" },
  { label: TEXT.ABSENT_HALF_DAY_FIRST_AFTERNOON_LAST_MORNING, value: "4" },
];

const FILE_PICKER_LABEL = TEXT.ABSENT_MEDICAL_CERTIFICATE_LABEL;
const FILE_PICKER_PLACEHOLDER = TEXT.ABSENT_MEDICAL_CERTIFICATE_PLACEHOLDER;
const FILE_PICKER_ACTION = TEXT.ABSENT_MEDICAL_CERTIFICATE_ACTION;
const FILE_PICKER_REMOVE = TEXT.ABSENT_MEDICAL_CERTIFICATE_REMOVE;
const IMAGE_PICKER_PERMISSION_TITLE = TEXT.ABSENT_PERMISSION_REQUIRED_TITLE;
const IMAGE_PICKER_PERMISSION_MESSAGE = TEXT.ABSENT_PERMISSION_REQUIRED_MESSAGE;
const SUBMITTING_LABEL = TEXT.ABSENT_SUBMITTING_LABEL;
const SUBMIT_SUCCESS_MESSAGE = TEXT.ABSENT_SICK_SUBMIT_SUCCESS_MESSAGE;
const SUBMIT_ERROR_MESSAGE = TEXT.ABSENT_SICK_SUBMIT_ERROR_MESSAGE;
const CONFIRM_SUBMIT_TITLE = TEXT.ABSENT_CONFIRM_SUBMIT_TITLE;
const CONFIRM_SUBMIT_MESSAGE = TEXT.ABSENT_CONFIRM_SUBMIT_MESSAGE;
const CONFIRM_SUBMIT_CANCEL = TEXT.ABSENT_CONFIRM_SUBMIT_CANCEL;
const CONFIRM_SUBMIT_ACTION = TEXT.ABSENT_CONFIRM_SUBMIT_ACTION;
const CONFIRM_REMOVE_TITLE = TEXT.ABSENT_CONFIRM_REMOVE_TITLE;
const CONFIRM_REMOVE_MESSAGE = TEXT.ABSENT_CONFIRM_REMOVE_MESSAGE;
const PENDING_APPROVAL_TITLE = TEXT.ABSENT_CANNOT_REQUEST_TITLE;

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
        <ThemedText
          style={[styles.selectText, !displayValue && styles.placeholder]}
        >
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
                        value === option.value
                          ? styles.selectedOption
                          : undefined,
                      ]}
                    >
                      <ThemedText
                        lightColor={
                          value === option.value ? "#FFFFFF" : undefined
                        }
                        darkColor={
                          value === option.value ? "#FFFFFF" : undefined
                        }
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

function getImageFileName(asset: ImagePicker.ImagePickerAsset) {
  return (
    asset.fileName ||
    `medical-certificate.${asset.mimeType?.split("/")[1] || "jpg"}`
  );
}

function createUploadFile(asset: ImagePicker.ImagePickerAsset): UploadableFile {
  if (Platform.OS === "web" && asset.file) {
    return asset.file;
  }

  return {
    uri: asset.uri,
    name: getImageFileName(asset),
    type: asset.mimeType,
  };
}

export default function SickScreen() {
  const { user: authUser } = useAuth();
  const params = useLocalSearchParams<{
    id?: string;
    item?: string;
    mode?: string;
  }>();
  const routeEditItem = useMemo(() => parseItemParam(params.item), [params.item]);
  const routeEditId = getItemText(routeEditItem, [
    "id",
    "absentId",
    "absent_id",
    "requestId",
    "request_id",
  ]) || (Array.isArray(params.id) ? params.id[0] : params.id ?? "");
  const isEditMode = (Array.isArray(params.mode) ? params.mode[0] : params.mode) === "edit" || Boolean(routeEditId);
  const [initialAbsentData, setInitialAbsentData] = useState<Absent | null>(
    null,
  );
  const [loadedEditItem, setLoadedEditItem] = useState<Absent | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState("");
  const [deptId, setDeptId] = useState("");
  const [step, setStep] = useState("");
  const [absentTime, setAbsentTime] = useState("");
  const [absentStatus, setAbsentStatus] = useState("");
  const [approver, setApprover] = useState("");
  const [approverStaffId, setApproverStaffId] = useState("");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [halfDay, setHalfDay] = useState("");
  const [contact, setContact] = useState("");
  const [selectedFile, setSelectedFile] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [openSelect, setOpenSelect] = useState<"approver" | "halfDay" | null>(
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
  const userId = authUser?.staffId || USER_ID;
  const maximumStartDate = useMemo(() => startOfDay(new Date()), []);
  const editItem = loadedEditItem ?? routeEditItem;
  const editId = getItemText(editItem, [
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
      const data = await initAbsentData(userId, TYPE_ABSENT_SICK);
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
          const previousData = await getAbsentData(routeEditId, TYPE_ABSENT_SICK);

          setLoadedEditItem(previousData);
          setInitialAbsentData((currentData) => ({
            ...(currentData ?? {}),
            ...previousData,
            approverList: currentData?.approverList ?? previousData.approverList,
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
          value: getApproverPositionId(item),
          staffId: getApproverStaffId(item),
        }))
        .filter((item) => item.label && item.value),
    [initialAbsentData],
  );

  useEffect(() => {
    if (!isEditMode || !editId) {
      return;
    }

    setReason(getItemText(editItem, ["reason", "detail", "description"]));
    setContact(getItemText(editItem, ["contact", "contactChannel", "contact_channel", "phone"]));

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
        "approverName",
        "approver_name",
        "approver",
        "staffId",
        "staff_id",
      ]),
    );
  }, [editId, editItem, isEditMode]);
  const startDateError =
    startDate && startOfDay(startDate) > maximumStartDate
      ? TEXT.ABSENT_VALIDATION_START_DATE_NOT_FUTURE
      : "";
  const dateError =
    startDate && endDate && startOfDay(endDate) < startOfDay(startDate)
      ? TEXT.ABSENT_VALIDATION_END_DATE_AFTER_START
      : endDate && startOfDay(endDate) > maximumStartDate
        ? TEXT.ABSENT_VALIDATION_END_DATE_NOT_FUTURE
        : "";
  const displayedDateError =
    startDateError || dateError || validationErrors.date || "";
  const leaveDayCount = useMemo(() => {
    if (!startDate || !endDate || startDateError || dateError) {
      return null;
    }

    return getWeekdayLeaveDayCount(startDate, endDate, halfDay !== "0");
  }, [dateError, endDate, halfDay, startDate, startDateError]);

  const handlePickFile = useCallback(async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        IMAGE_PICKER_PERMISSION_TITLE,
        IMAGE_PICKER_PERMISSION_MESSAGE,
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
      mediaTypes: ["images"],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedFile(result.assets[0] ?? null);
    }
  }, []);

  const handleSubmit = useCallback(() => {
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

    setIsConfirmVisible(true);
  }, [
    approver,
    contact,
    dateError,
    endDate,
    isSubmitting,
    reason,
    startDate,
    startDateError,
  ]);

  const handleConfirmSubmit = useCallback(async () => {
    if (isSubmitting || !startDate || !endDate) {
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
        contact: contact.trim(),
        start_date: formatDateParam(startDate),
        end_date: formatDateParam(endDate),
        num_days: leaveDayCount,
        startpart: getHalfDayValue(halfDay, halfDayOptions),
        old_file_upload: getItemText(editItem, ["fileUpload", "file_upload"]),
      };
      const uploadOptions = selectedFile
        ? { fileUpload: createUploadFile(selectedFile) }
        : undefined;
      const result =
        isEditMode && editId
          ? await updateAbsentData(editId, payload, TYPE_ABSENT_SICK, uploadOptions)
          : await addAbsentData(payload, TYPE_ABSENT_SICK, uploadOptions);

      setToastType("success");
      setToastMessage(result.message || SUBMIT_SUCCESS_MESSAGE);
      setTimeout(() => {
        router.replace("/absent/waiting");
      }, 900);
    } catch (error) {
      setToastType("error");
      setToastMessage(
        error instanceof Error ? error.message : SUBMIT_ERROR_MESSAGE,
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    deptId,
    editId,
    editItem,
    step,
    absentTime,
    absentStatus,
    approver,
    approverStaffId,
    contact,
    endDate,
    halfDay,
    isEditMode,
    isSubmitting,
    leaveDayCount,
    reason,
    selectedFile,
    startDate,
    userId,
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
      const result = await removeData(editId, TYPE_ABSENT_SICK);
      setToastType("success");
      setToastMessage(result.message || TEXT.SHARED_DELETE_THAI);
      setTimeout(() => {
        router.replace("/absent/waiting");
      }, 900);
    } catch (error) {
      setToastType("error");
      setToastMessage(
        error instanceof Error ? error.message : SUBMIT_ERROR_MESSAGE,
      );
    } finally {
      setIsRemoving(false);
    }
  }, [editId, isEditMode, isRemoving, isSubmitting]);

  if (isInitialLoading) {
    return (
      <ThemedView style={styles.container}>
        <NavTopBar title={TEXT.ABSENT_SICK_TITLE} backHref={backHref} />
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
        <NavTopBar title={TEXT.ABSENT_SICK_TITLE} backHref={backHref} />
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">
            {shouldShowRetry ? TEXT.SHARED_ERROR_TITLE_THAI : PENDING_APPROVAL_TITLE}
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
      <NavTopBar title={TEXT.ABSENT_SICK_TITLE} backHref={backHref} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView
          style={styles.panel}
          lightColor="#FFFFFF"
          darkColor="#1F2B30"
        >
          <ThemedText type="subtitle">{TEXT.ABSENT_SICK_FORM_TITLE}</ThemedText>
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
                  maximumDate={maximumStartDate}
                  onChange={(date) => {
                    setStartDate(date);
                    if (
                      endDate &&
                      (startOfDay(endDate) < startOfDay(date) ||
                        startOfDay(endDate) > maximumStartDate)
                    ) {
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
                  maximumDate={maximumStartDate}
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
                {FILE_PICKER_LABEL}
              </ThemedText>
              <View style={styles.filePickerRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={handlePickFile}
                  style={styles.filePickerButton}
                >
                  <ThemedText
                    lightColor="#0A6E8A"
                    darkColor="#0A6E8A"
                    type="defaultSemiBold"
                  >
                    {FILE_PICKER_ACTION}
                  </ThemedText>
                </Pressable>
                {selectedFile ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSelectedFile(null)}
                    style={styles.removeFileButton}
                  >
                    <ThemedText
                      lightColor="#B42318"
                      darkColor="#B42318"
                      type="defaultSemiBold"
                    >
                      {FILE_PICKER_REMOVE}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
              <ThemedText
                style={[
                  styles.fileName,
                  !selectedFile ? styles.placeholder : undefined,
                ]}
              >
                {selectedFile
                  ? getImageFileName(selectedFile)
                  : FILE_PICKER_PLACEHOLDER}
              </ThemedText>
            </View>

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
                  {isSubmitting
                    ? SUBMITTING_LABEL
                    : isEditMode
                      ? TEXT.SHARED_UPDATE
                      : TEXT.ABSENT_SUBMIT_REQUEST}
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
                    <ActivityIndicator color="#B42318" size="small" />
                  ) : null}
                  <ThemedText
                    lightColor="#B42318"
                    darkColor="#B42318"
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
              <ThemedText type="subtitle">{CONFIRM_SUBMIT_TITLE}</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                {CONFIRM_SUBMIT_MESSAGE}
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsConfirmVisible(false)}
                  style={styles.secondaryButton}
                >
                  <ThemedText type="defaultSemiBold">
                    {CONFIRM_SUBMIT_CANCEL}
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
                    {CONFIRM_SUBMIT_ACTION}
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
              <ThemedText type="subtitle">{CONFIRM_REMOVE_TITLE}</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                {CONFIRM_REMOVE_MESSAGE}
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsRemoveConfirmVisible(false)}
                  style={styles.secondaryButton}
                >
                  <ThemedText type="defaultSemiBold">
                    {CONFIRM_SUBMIT_CANCEL}
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
  filePickerRow: {
    flexDirection: "row",
    gap: 12,
  },
  filePickerButton: {
    minHeight: 46,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#0A6E8A",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
  },
  removeFileButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#F0B4AE",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
  },
  fileName: {
    color: "#11181C",
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#F0B4AE",
    backgroundColor: "#FFFFFF",
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
