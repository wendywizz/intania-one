import { TEXT } from "@/constants/text";
import { CloudUpload, Eye, Info, Paperclip, X } from 'lucide-react-native';
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import { openBrowserAsync } from "expo-web-browser";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { navReplace } from "@/utils/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
import { TYPE_absence_SICK } from "@/constants/types";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import type { absence } from "@/models/types";
import {
  addabsenceData,
  getabsenceData,
  initabsenceData,
  removeData,
  updateabsenceData,
} from "@/services/absenceService";
import {
  formatDateParam,
  getabsenceTextValue,
  getHalfDayValue,
  getWeekdayLeaveDayCount,
  isRetryableInitialError,
  startOfDay
} from "@/utils/absence-form";

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

function getApproverList(data: absence | null): Approver[] {
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

function getItemText(item: absence, fields: string[]) {
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

function parseItemParam(value: string | string[] | undefined): absence {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return {};
  }

  try {
    return JSON.parse(decodeURIComponent(rawValue)) as absence;
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
  { label: TEXT.absence_HALF_DAY_NONE, value: "0" },
  { label: TEXT.absence_HALF_DAY_FIRST_MORNING, value: "1" },
  { label: TEXT.absence_HALF_DAY_FIRST_AFTERNOON, value: "2" },
  { label: TEXT.absence_HALF_DAY_LAST_MORNING, value: "3" },
  { label: TEXT.absence_HALF_DAY_FIRST_AFTERNOON_LAST_MORNING, value: "4" },
];

const FILE_PICKER_LABEL = TEXT.absence_MEDICAL_CERTIFICATE_LABEL;
const FILE_PICKER_ACTION = TEXT.absence_MEDICAL_CERTIFICATE_ACTION;
const FILE_PICKER_REUPLOAD_ACTION = "Re-upload file";
const SUBMITTING_LABEL = TEXT.absence_SUBMITTING_LABEL;
const SUBMIT_SUCCESS_MESSAGE = TEXT.absence_SICK_SUBMIT_SUCCESS_MESSAGE;
const SUBMIT_ERROR_MESSAGE = TEXT.absence_SICK_SUBMIT_ERROR_MESSAGE;
const CONFIRM_SUBMIT_TITLE = TEXT.absence_CONFIRM_SUBMIT_TITLE;
const CONFIRM_SUBMIT_MESSAGE = TEXT.absence_CONFIRM_SUBMIT_MESSAGE;
const CONFIRM_SUBMIT_CANCEL = TEXT.absence_CONFIRM_SUBMIT_CANCEL;
const CONFIRM_SUBMIT_ACTION = TEXT.absence_CONFIRM_SUBMIT_ACTION;
const CONFIRM_REMOVE_TITLE = TEXT.absence_CONFIRM_REMOVE_TITLE;
const CONFIRM_REMOVE_MESSAGE = TEXT.absence_CONFIRM_REMOVE_MESSAGE;
const PENDING_APPROVAL_TITLE = TEXT.absence_CANNOT_REQUEST_TITLE;

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
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
        style={[styles.selectButton, hasError ? styles.inputError : undefined]}
      >
        <ThemedText
          style={[styles.selectText, !displayValue && styles.placeholder]}
          numberOfLines={1}
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
                  normalizedOptions.map((option, index) => (
                    <Pressable
                      key={`${String(option.value)}-${index}`}
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

function getUploadFileName(asset: DocumentPicker.DocumentPickerAsset) {
  return asset.name || `medical-certificate.${asset.mimeType?.split("/")[1] || "jpg"}`;
}

function isImageFile(uri: string, fileName: string, mimeType?: string) {
  if (mimeType?.startsWith("image/")) {
    return true;
  }

  return /\.(avif|bmp|gif|heic|heif|jpe?g|png|webp)(?:[?#].*)?$/i.test(
    fileName || uri,
  );
}

function createUploadFile(asset: DocumentPicker.DocumentPickerAsset): UploadableFile {
  if (Platform.OS === "web" && asset.file) {
    return asset.file;
  }

  return {
    uri: asset.uri,
    name: getUploadFileName(asset),
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
    "absenceId",
    "absence_id",
    "requestId",
    "request_id",
  ]) || (Array.isArray(params.id) ? params.id[0] : params.id ?? "");
  const isEditMode = (Array.isArray(params.mode) ? params.mode[0] : params.mode) === "edit" || Boolean(routeEditId);
  const [initialabsenceData, setInitialabsenceData] = useState<absence | null>(
    null,
  );
  const [loadedEditItem, setLoadedEditItem] = useState<absence | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState("");
  const [deptId, setDeptId] = useState("");
  const [step, setStep] = useState("");
  const [absenceTime, setabsenceTime] = useState("");
  const [absenceStatus, setabsenceStatus] = useState("");
  const [approver, setApprover] = useState("");
  const [approverStaffId, setApproverStaffId] = useState("");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [halfDay, setHalfDay] = useState("");
  const [contact, setContact] = useState("");
  const [hasMedicalCert, setHasMedicalCert] = useState(false);
  const [selectedFile, setSelectedFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
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
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [viewerFile, setViewerFile] = useState({ name: "", url: "" });
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "">("");
  const userId = authUser?.staffId || USER_ID;
  const maximumStartDate = useMemo(() => startOfDay(new Date()), []);
  const editItem = loadedEditItem ?? routeEditItem;
  const editId = getItemText(editItem, [
    "id",
    "absenceId",
    "absence_id",
    "requestId",
    "request_id",
  ]) || routeEditId;
  const backHref = isEditMode ? "/absence/pending" : "/absence";
  const uploadedFileName = getItemText(editItem, [
    "fileUpload",
    "file_upload",
    "medicalCertificate",
    "medical_certificate",
    "image",
    "image_url",
  ]);
  const uploadedFileUrl = getItemText(editItem, [
    "fileUploadLink",
    "file_upload_link",
  ]);
  const activeFileUrl = selectedFile?.uri || uploadedFileUrl;
  const activeFileName = selectedFile
    ? getUploadFileName(selectedFile)
    : uploadedFileName;
  const hasUploadedFile = Boolean(uploadedFileUrl);

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
    setLoadedEditItem(null);
    setDeptId("");
    setStep("");
    setabsenceTime("");
    setabsenceStatus("");

    try {
      const data = await initabsenceData(userId, TYPE_absence_SICK);
      setInitialabsenceData(data);
      setDeptId(getabsenceTextValue(data, ["deptId", "dept_id", "departmentId", "department_id"]));
      setStep(getabsenceTextValue(data, ["step"]));
      setabsenceStatus(getabsenceTextValue(data, ["absenceStatus", "absence_status", "status"]));
      setabsenceTime(getabsenceTextValue(data, ["absenceTime", "absence_time", "times", "time"]));
    } catch (error) {
      if (!isEditMode) {
        setInitialError(
          error instanceof Error
            ? error.message
            : TEXT.absence_INIT_LOAD_ERROR_MESSAGE,
        );
      }
    } finally {
      if (isEditMode && routeEditId) {
        try {
          const previousData = await getabsenceData(routeEditId, TYPE_absence_SICK);

          setLoadedEditItem(previousData);
          setInitialabsenceData((currentData) => ({
            ...(currentData ?? {}),
            ...previousData,
            approverList: currentData?.approverList ?? previousData.approverList,
          }));
        } catch {
          setLoadedEditItem(routeEditItem);
          setInitialabsenceData((currentData) => currentData ?? routeEditItem);
        }
      }

      setIsInitialLoading(false);
    }
  }, [isEditMode, routeEditId, routeEditItem, userId]);

  useFocusEffect(
    useCallback(() => {
      loadInitialabsenceData();
    }, [loadInitialabsenceData]),
  );

  const minimumEndDate = useMemo(
    () => (startDate ? startOfDay(startDate) : undefined),
    [startDate],
  );
  const approverOptions = useMemo(
    () =>
      getApproverList(initialabsenceData)
        .map((item) => ({
          label: getApproverLabel(item),
          value: getApproverPositionId(item),
          staffId: getApproverStaffId(item),
        }))
        .filter((item) => item.label && item.value),
    [initialabsenceData],
  );

  useEffect(() => {
    if (!isEditMode || !editId) {
      return;
    }

    setReason(getItemText(editItem, ["reason", "detail", "description"]));
    setContact(getItemText(editItem, ["contact", "contactChannel", "contact_channel", "phone"]));
    const existingFile = getItemText(editItem, ["fileUpload", "file_upload", "medicalCertificate", "medical_certificate", "image", "image_url"]);
    if (existingFile) setHasMedicalCert(true);

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
      ? TEXT.absence_VALIDATION_START_DATE_NOT_FUTURE
      : "";
  const dateError =
    startDate && endDate && startOfDay(endDate) < startOfDay(startDate)
      ? TEXT.absence_VALIDATION_END_DATE_AFTER_START
      : endDate && startOfDay(endDate) > maximumStartDate
        ? TEXT.absence_VALIDATION_END_DATE_NOT_FUTURE
        : "";
  const displayedDateError =
    startDateError || dateError || validationErrors.date || "";
  const leaveDayCount = useMemo(() => {
    if (!startDate || !endDate || startDateError || dateError) {
      return null;
    }

    return getWeekdayLeaveDayCount(startDate, endDate, Number(halfDay) > 0);
  }, [dateError, endDate, halfDay, startDate, startDateError]);

  const handlePickFile = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: "*/*",
    });

    if (!result.canceled) {
      setSelectedFile(result.assets[0] ?? null);
    }
  }, []);

  const handleOpenFile = useCallback(
    async (fileUrl: string, fileName: string, mimeType?: string) => {
      if (!fileUrl) {
        return;
      }

      if (isImageFile(fileUrl, fileName, mimeType)) {
        setViewerFile({ name: fileName, url: fileUrl });
        setIsImageViewerVisible(true);
        return;
      }

      try {
        if (/^https?:/i.test(fileUrl)) {
          await openBrowserAsync(fileUrl);
          return;
        }

        await Linking.openURL(fileUrl);
      } catch {
        setToastType("error");
        setToastMessage("Unable to open file.");
      }
    },
    [],
  );

  const handleViewFile = useCallback(async () => {
    if (!activeFileUrl) {
      return;
    }

    await handleOpenFile(activeFileUrl, activeFileName, selectedFile?.mimeType);
  }, [activeFileName, activeFileUrl, handleOpenFile, selectedFile?.mimeType]);

  const handleViewUploadedFile = useCallback(async () => {
    await handleOpenFile(uploadedFileUrl, uploadedFileName);
  }, [handleOpenFile, uploadedFileName, uploadedFileUrl]);

  const handleSubmit = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    const nextErrors: ValidationErrors = {};

    if (!approver) {
      nextErrors.approver = TEXT.absence_VALIDATION_APPROVER_REQUIRED;
    }

    if (!reason.trim()) {
      nextErrors.reason = TEXT.absence_VALIDATION_REASON_REQUIRED;
    }

    if (!startDate || !endDate) {
      nextErrors.date = TEXT.absence_VALIDATION_DATE_REQUIRED;
    }

    if (!contact.trim()) {
      nextErrors.contact = TEXT.absence_VALIDATION_CONTACT_REQUIRED;
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
        status: absenceStatus,
        times: absenceTime,
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
          ? await updateabsenceData(editId, payload, TYPE_absence_SICK, uploadOptions)
          : await addabsenceData(payload, TYPE_absence_SICK, uploadOptions);

      setToastType("success");
      setToastMessage(result.message || SUBMIT_SUCCESS_MESSAGE);
      setTimeout(() => {
        router.replace("/absence/pending");
      }, 1500);
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
    absenceTime,
    absenceStatus,
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
      const result = await removeData(editId, TYPE_absence_SICK);
      setToastType("success");
      setToastMessage(result.message || TEXT.SHARED_DELETE_THAI);
      setTimeout(() => {
        router.replace("/absence/pending");
      }, 1500);
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
        <NavTopBar title={TEXT.absence_SICK_TITLE} backHref={backHref} />
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
        <NavTopBar title={TEXT.absence_SICK_TITLE} backHref={backHref} />
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
                onPress={loadInitialabsenceData}
                style={styles.secondaryButton}
              >
                <ThemedText type="defaultSemiBold">
                  {TEXT.SHARED_RETRY_THAI}
                </ThemedText>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => navReplace("/absence")}
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
      <NavTopBar title={TEXT.absence_SICK_TITLE} backHref={backHref} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.pageHeader}>
          <ThemedText style={styles.pageTitle}>{TEXT.absence_SICK_FORM_TITLE}</ThemedText>
          <ThemedText style={styles.pageSubtitle}>{TEXT.absence_SICK_DESCRIPTION}</ThemedText>
        </View>

        <View style={styles.formCard}>
          <SelectField
            label={TEXT.absence_APPROVER_LABEL}
            placeholder={TEXT.absence_APPROVER_PLACEHOLDER}
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
            <ThemedText style={styles.fieldLabel}>
              {TEXT.absence_REASON_LABEL}
            </ThemedText>
            <TextInput
              multiline
              numberOfLines={3}
              onChangeText={(value) => {
                setReason(value);
                if (value.trim()) {
                  clearValidationError("reason");
                }
              }}
              placeholder={TEXT.absence_REASON_PLACEHOLDER}
              placeholderTextColor="#9CA3AF"
              style={[
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
            <ThemedText style={styles.fieldLabel}>
              {TEXT.absence_LEAVE_DATE_LABEL}
            </ThemedText>
            <View style={styles.dateRow}>
              <DatePickerField
                label={TEXT.absence_START_DATE_LABEL}
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
                label={TEXT.absence_END_DATE_LABEL}
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
              {displayedDateError || TEXT.absence_SELECT_DATE_HINT}
            </ThemedText>
            {leaveDayCount !== null ? (
              <ThemedText
                type="defaultSemiBold"
                style={styles.leaveDaySummary}
              >
                {TEXT.absence_LEAVE_DAY_COUNT_LABEL}
                {leaveDayCount.toLocaleString("th-TH")} {TEXT.absence_DAY_UNIT}
              </ThemedText>
            ) : null}
          </View>

          <SelectField
            label={TEXT.absence_HALF_DAY_LABEL}
            placeholder={TEXT.absence_HALF_DAY_PLACEHOLDER}
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
            <ThemedText style={styles.fieldLabel}>
              {TEXT.absence_CONTACT_CHANNEL_LABEL}
            </ThemedText>
            <TextInput
              onChangeText={(value) => {
                setContact(value);
                if (value.trim()) {
                  clearValidationError("contact");
                }
              }}
              placeholder={TEXT.absence_CONTACT_CHANNEL_PLACEHOLDER}
              placeholderTextColor="#9CA3AF"
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
            <View style={styles.toggleRow}>
              <ThemedText style={styles.fieldLabel}>
                {TEXT.absence_MEDICAL_CERTIFICATE_TOGGLE}
              </ThemedText>
              <Switch
                value={hasMedicalCert}
                onValueChange={(value) => {
                  setHasMedicalCert(value);
                  if (!value) setSelectedFile(null);
                }}
                trackColor={{ false: '#E0E0E0', true: '#F4C4C4' }}
                thumbColor={hasMedicalCert ? '#B33939' : '#BDBDBD'}
              />
            </View>

            {hasMedicalCert ? (
              <>
                {selectedFile ? (
                  <View style={styles.selectedFileCard}>
                    <Paperclip size={18} color="#B33939" />
                    <ThemedText style={styles.selectedFileName} numberOfLines={1}>
                      {getUploadFileName(selectedFile)}
                    </ThemedText>
                    <View style={styles.fileActions}>
                      {activeFileUrl ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={handleViewFile}
                          style={styles.fileActionBtn}
                        >
                          <Eye size={20} color="#687076" />
                        </Pressable>
                      ) : null}
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setSelectedFile(null)}
                        style={styles.fileActionBtn}
                      >
                        <X size={20} color="#B42318" />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={handlePickFile}
                    style={styles.uploadZone}
                  >
                    <CloudUpload size={30} color="#B33939" />
                    <ThemedText style={styles.uploadZoneText}>
                      {isEditMode && hasUploadedFile
                        ? FILE_PICKER_REUPLOAD_ACTION
                        : FILE_PICKER_ACTION}
                    </ThemedText>
                    <ThemedText style={styles.uploadZoneHint}>PDF, JPG, PNG</ThemedText>
                  </Pressable>
                )}
                {uploadedFileUrl && !selectedFile ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={handleViewUploadedFile}
                    style={styles.uploadedFileLink}
                  >
                    <Paperclip size={16} color="#12805C" />
                    <ThemedText
                      lightColor="#12805C"
                      darkColor="#5EC6A3"
                      type="defaultSemiBold"
                      style={styles.uploadedFileLinkText}
                      numberOfLines={1}
                    >
                      Uploaded file
                    </ThemedText>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </View>

          <View style={styles.policyCard}>
            <View style={styles.policyIconWrap}>
              <Info size={20} color="#B33939" />
            </View>
            <View style={styles.policyBody}>
              <ThemedText style={styles.policyTitle}>
                {TEXT.absence_POLICY_NOTE_LABEL}
              </ThemedText>
              <ThemedText style={styles.policyText}>
                {TEXT.absence_POLICY_NOTE_TEXT}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomBar}>
        {isEditMode ? (
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting || isRemoving}
              onPress={handleRemove}
              style={[
                styles.deleteButton,
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
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting || isRemoving}
              onPress={handleSubmit}
              style={[
                styles.submitButton,
                styles.actionButton,
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
                {isSubmitting ? SUBMITTING_LABEL : TEXT.SHARED_UPDATE}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={handleSubmit}
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
              {isSubmitting ? SUBMITTING_LABEL : TEXT.absence_SUBMIT_REQUEST}
            </ThemedText>
          </Pressable>
        )}
      </View>

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
          <Pressable style={styles.modalContent}>
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
          <Pressable style={styles.modalContent}>
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

      <Modal
        transparent
        visible={isImageViewerVisible}
        animationType="fade"
        onRequestClose={() => setIsImageViewerVisible(false)}
      >
        <View style={styles.imageViewerBackdrop}>
          <View style={styles.imageViewerHeader}>
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              type="defaultSemiBold"
              style={styles.imageViewerTitle}
              numberOfLines={1}
            >
              {viewerFile.name}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsImageViewerVisible(false)}
              style={styles.imageViewerCloseButton}
            >
              <ThemedText
                lightColor="#FFFFFF"
                darkColor="#FFFFFF"
                type="defaultSemiBold"
              >
                {TEXT.SHARED_CLOSE_THAI}
              </ThemedText>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsImageViewerVisible(false)}
            style={styles.imageViewerBody}
          >
            {viewerFile.url ? (
              <Image
                source={{ uri: viewerFile.url }}
                contentFit="contain"
                style={styles.imageViewerImage}
              />
            ) : null}
          </Pressable>
        </View>
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
    backgroundColor: "#F8F9FD",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 4,
  },
  pageTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "700",
    color: "#191C1F",
  },
  pageSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: "#687076",
  },
  formCard: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
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
  field: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8ECF0",
  },
  fieldLabel: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.6,
    color: "#687076",
    textTransform: "uppercase",
  },
  input: {
    minHeight: 44,
    backgroundColor: "#F2F3F7",
    borderRadius: 8,
    color: "#191C1F",
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputError: {
    borderWidth: 1,
    borderColor: "#B42318",
  },
  textArea: {
    minHeight: 80,
    backgroundColor: "#F2F3F7",
    borderRadius: 8,
    color: "#191C1F",
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: "#687076",
  },
  leaveDaySummary: {
    fontSize: 13,
    lineHeight: 18,
    color: "#0A6E8A",
  },
  errorText: {
    color: "#B42318",
  },
  fieldError: {
    fontSize: 12,
    lineHeight: 17,
    color: "#B42318",
  },
  selectButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F2F3F7",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  selectText: {
    flex: 1,
    color: "#191C1F",
    fontSize: 14,
    fontFamily: AppFonts.psuRegular,
  },
  placeholder: {
    color: "#9CA3AF",
  },
  chevron: {
    color: "#687076",
    fontSize: 18,
    lineHeight: 22,
  },
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
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
    borderRadius: 16,
    padding: 16,
  },
  confirmModal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
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
    backgroundColor: "#F2F3F7",
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
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E8ECF0",
    backgroundColor: "#F8F9FD",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedOption: {
    borderColor: "#B33939",
    backgroundColor: "#B33939",
  },
  optionText: {
    color: "#191C1F",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: AppFonts.psuRegular,
  },
  emptyOption: {
    color: "#687076",
    lineHeight: 20,
    paddingVertical: 16,
    textAlign: "center",
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  uploadZone: {
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 12,
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 20,
  },
  uploadZoneText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: "#B33939",
  },
  uploadZoneHint: {
    fontSize: 12,
    lineHeight: 17,
    color: "#9CA3AF",
  },
  selectedFileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF5F5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFD9D9",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedFileName: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#191C1F",
  },
  fileActions: {
    flexDirection: "row",
    gap: 4,
  },
  fileActionBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  uploadedFileLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  uploadedFileLinkText: {
    fontSize: 13,
    lineHeight: 18,
    textDecorationLine: "underline",
  },
  policyCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFF8F8",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#FFD9D9",
    padding: 16,
  },
  policyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFE8E8",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  policyBody: {
    flex: 1,
    gap: 4,
  },
  policyTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#B33939",
  },
  policyText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#584140",
  },
  bottomSpacer: {
    height: 100,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E8ECF0",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  submitButton: {
    minHeight: 52,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#B33939",
  },
  deleteButton: {
    minHeight: 52,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#B42318",
    paddingHorizontal: 20,
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
  confirmActionButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryButton: {
    minHeight: 48,
    minWidth: 132,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
  },
  disabledButton: {
    opacity: 0.45,
  },
  imageViewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  imageViewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    gap: 12,
  },
  imageViewerTitle: {
    flex: 1,
    fontSize: 16,
  },
  imageViewerCloseButton: {
    minHeight: 40,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  imageViewerBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imageViewerImage: {
    width: "100%",
    height: "100%",
  },
});
