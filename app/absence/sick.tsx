import { TEXT } from "@/constants/text";
import { Camera, CloudUpload, Eye, FileText, Images, Paperclip, X } from 'lucide-react-native';
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
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
  TextInput,
  View,
} from "react-native";
import { type AppColors, useColors, useScreenGutter, useThemedStyles } from '@/constants/theme';

import { AppToast } from "@/components/app-toast";
import { DatePickerField } from "@/components/date-picker-field";
import { Sheet } from "@/components/ui/sheet";
import { TipAlert } from "@/components/ui/tip-alert";
import { Toggle } from "@/components/ui/toggle";
import { useHolidays } from "@/hooks/use-holidays";
import { ErrorState } from "@/components/error-state";
import { LoadingAnimate } from "@/components/loading-animate";
import { ScreenHeader } from "@/components/screen-header";
import { SectionCard } from "@/components/section-card";
import { UserAvatar } from "@/components/user-avatar";
import { SelectSheet } from "@/components/ui/select-sheet";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ENDPOINTS } from "@/constants/endpoints";
import { AppFonts } from "@/constants/fonts";
import { TYPE_ABSENCE_SICK } from "@/constants/types";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import type { absence } from "@/models/types";
import { USER_PLACEHOLDER } from "@/constants/images";
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

// Removes the browser focus outline on web so active inputs show only their
// bottom border (no box).
const webNoOutline: any = Platform.OS === "web" ? { outlineStyle: "none" } : null;

type Approver = {
  staffId?: string;
  staff_id?: string;
  uniStaffId?: string;
  uni_staff_id?: string;
  UNI_STAFF_ID?: string;
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
  photoId?: string;
  title?: string;
  subtitle?: string;
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

function getApproverFullName(approver: Approver) {
  return `${approver.prefixNameTH ?? ""}${approver.firstNameTH ?? ""} ${approver.lastNameTH ?? ""}`
    .replace(/\s+/g, " ")
    .trim();
}

function getApproverPositionName(approver: Approver) {
  return approver.positionName?.trim() ?? "";
}

function getApproverPositionId(approver: Approver) {
  return String(approver.positionId ?? approver.position_id ?? "").trim();
}

function getApproverStaffId(approver: Approver) {
  return String(approver.staffId ?? approver.staff_id ?? "").trim();
}

// Staff photos are keyed on the university staff id (UNI_STAFF_ID). If the API
// doesn't send it yet, fall back to the internal staffId so the image still
// resolves once the server starts returning uni_staff_id.
function getApproverPhotoId(approver: Approver) {
  return (
    String(
      approver.uniStaffId ??
        approver.uni_staff_id ??
        approver.UNI_STAFF_ID ??
        "",
    ).trim() || getApproverStaffId(approver)
  );
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
  // Empty, not "0". A saved request with no half-day carries part_flag = 0 and
  // the picker offers no such option, so the field had nothing to match and
  // showed the raw "0" where its placeholder belonged.
  if (!value || value === "0") {
    return "";
  }

  const halfDayIndex = Number(value) - 1;

  return halfDayOptions[halfDayIndex + 1]?.value ?? "";
}

const halfDayOptions: SelectOption[] = [
  { label: TEXT.ABSENCE_HALF_DAY_NONE, value: "0" },
  { label: TEXT.ABSENCE_HALF_DAY_FIRST_MORNING, value: "1" },
  { label: TEXT.ABSENCE_HALF_DAY_FIRST_AFTERNOON, value: "2" },
  { label: TEXT.ABSENCE_HALF_DAY_LAST_MORNING, value: "3" },
  { label: TEXT.ABSENCE_HALF_DAY_FIRST_AFTERNOON_LAST_MORNING, value: "4" },
];

/**
 * Everything except "none" — the form only ever offers real half-days.
 *
 * Named once so the field and the sheet cannot end up showing different lists.
 */
const halfDayChoices = halfDayOptions.filter((option) => option.value !== "0");

const FILE_PICKER_LABEL = TEXT.ABSENCE_MEDICAL_CERTIFICATE_LABEL;
const FILE_PICKER_ACTION = TEXT.ABSENCE_MEDICAL_CERTIFICATE_ACTION;
const FILE_PICKER_REUPLOAD_ACTION = "Re-upload file";
const SUBMITTING_LABEL = TEXT.ABSENCE_SUBMITTING_LABEL;
const SUBMIT_SUCCESS_MESSAGE = TEXT.ABSENCE_SICK_SUBMIT_SUCCESS_MESSAGE;
const SUBMIT_ERROR_MESSAGE = TEXT.ABSENCE_SICK_SUBMIT_ERROR_MESSAGE;
const CONFIRM_SUBMIT_TITLE = TEXT.ABSENCE_CONFIRM_SUBMIT_TITLE;
const CONFIRM_SUBMIT_MESSAGE = TEXT.ABSENCE_CONFIRM_SUBMIT_MESSAGE;
const CONFIRM_SUBMIT_CANCEL = TEXT.ABSENCE_CONFIRM_SUBMIT_CANCEL;
const CONFIRM_SUBMIT_ACTION = TEXT.ABSENCE_CONFIRM_SUBMIT_ACTION;
const CONFIRM_REMOVE_TITLE = TEXT.ABSENCE_CONFIRM_REMOVE_TITLE;
const CONFIRM_REMOVE_MESSAGE = TEXT.ABSENCE_CONFIRM_REMOVE_MESSAGE;
const PENDING_APPROVAL_TITLE = TEXT.ABSENCE_CANNOT_REQUEST_TITLE;

function PersonAvatar({
  photoId,
  size = 40,
}: {
  photoId?: string;
  size?: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const [failed, setFailed] = useState(false);
  const uri = photoId ? `${ENDPOINTS.photoBase}${photoId}.jpg` : "";
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  return (
    <Image
      source={uri && !failed ? { uri } : USER_PLACEHOLDER}
      style={[styles.personAvatar, dimension]}
      contentFit="cover"
      onError={() => setFailed(true)}
    />
  );
}

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
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );
  const selectedOption = normalizedOptions.find(
    (option) => option.value === value,
  );
  // Only show a label when the value maps to a real option; otherwise fall back
  // to the placeholder (e.g. half-day "0"/none must not render a literal "0").
  const displayValue = selectedOption?.label ?? "";

  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
        style={[styles.selectButton, hasError ? styles.inputError : undefined]}
      >
        {selectedOption && (selectedOption.staffId || selectedOption.title) ? (
          <View style={styles.selectPerson}>
            <PersonAvatar
              photoId={selectedOption.photoId ?? selectedOption.staffId}
              size={40}
            />
            <View style={styles.selectPersonText}>
              <ThemedText style={styles.selectPersonTitle} numberOfLines={1}>
                {selectedOption.title || displayValue}
              </ThemedText>
              {selectedOption.subtitle ? (
                <ThemedText style={styles.selectPersonSubtitle} numberOfLines={1}>
                  {selectedOption.subtitle}
                </ThemedText>
              ) : null}
            </View>
          </View>
        ) : (
          <ThemedText
            style={[styles.selectText, !displayValue && styles.placeholder]}
            numberOfLines={1}
          >
            {displayValue || placeholder}
          </ThemedText>
        )}
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
                        (option.staffId || option.title) && styles.optionPersonRow,
                        value === option.value
                          ? styles.selectedOption
                          : undefined,
                      ]}
                    >
                      {option.staffId || option.title ? (
                        <View style={styles.optionPerson}>
                          <PersonAvatar
                            photoId={option.photoId ?? option.staffId}
                            size={40}
                          />
                          <View style={styles.optionPersonText}>
                            <ThemedText
                              numberOfLines={1}
                              style={[
                                styles.optionText,
                                value === option.value ? styles.selectedOptionText : undefined,
                              ]}
                            >
                              {option.title || option.label}
                            </ThemedText>
                            {option.subtitle ? (
                              <ThemedText
                                numberOfLines={1}
                                style={styles.optionSubtitle}
                              >
                                {option.subtitle}
                              </ThemedText>
                            ) : null}
                          </View>
                        </View>
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

/**
 * ImagePicker and DocumentPicker describe a picked file differently — a photo
 * has `fileName`/`fileSize`, a document has `name`/`size`. Everything downstream
 * (the file card, the preview, the upload body) already speaks DocumentPicker's
 * shape, so a photo is translated once here rather than teaching each of them
 * both dialects.
 */
function imageAssetToDocumentAsset(
  asset: ImagePicker.ImagePickerAsset,
): DocumentPicker.DocumentPickerAsset {
  const mimeType = asset.mimeType || "image/jpeg";

  return {
    uri: asset.uri,
    // A camera capture usually arrives with no name at all.
    name: asset.fileName || `medical-certificate.${mimeType.split("/")[1] || "jpg"}`,
    mimeType,
    size: asset.fileSize,
    lastModified: Date.now(),
    file: asset.file,
  };
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
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const gutter = useScreenGutter();
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
    "ABSENCE_id",
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
  // Which of the three ways to attach a certificate — browse files, pick a photo,
  // or take one — the user is choosing between.
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);
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
  const holidays = useHolidays(userId);
  const maximumStartDate = useMemo(() => startOfDay(new Date()), []);
  const editItem = loadedEditItem ?? routeEditItem;
  const editId = getItemText(editItem, [
    "id",
    "absenceId",
    "ABSENCE_id",
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
      const data = await initabsenceData(userId, TYPE_ABSENCE_SICK);
      setInitialabsenceData(data);
      setDeptId(getabsenceTextValue(data, ["deptId", "dept_id", "departmentId", "department_id"]));
      setStep(getabsenceTextValue(data, ["step"]));
      setabsenceStatus(getabsenceTextValue(data, ["absenceStatus", "ABSENCE_status", "status"]));
      setabsenceTime(getabsenceTextValue(data, ["absentTime", "absenceTime", "ABSENCE_time", "times", "time"]));
    } catch (error) {
      if (!isEditMode) {
        setInitialError(
          error instanceof Error
            ? error.message
            : TEXT.ABSENCE_INIT_LOAD_ERROR_MESSAGE,
        );
      }
    } finally {
      if (isEditMode && routeEditId) {
        try {
          const previousData = await getabsenceData(routeEditId, TYPE_ABSENCE_SICK);

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
          photoId: getApproverPhotoId(item),
          title: getApproverFullName(item),
          subtitle: getApproverPositionName(item),
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
      ? TEXT.ABSENCE_VALIDATION_START_DATE_NOT_FUTURE
      : "";
  const dateError =
    startDate && endDate && startOfDay(endDate) < startOfDay(startDate)
      ? TEXT.ABSENCE_VALIDATION_END_DATE_AFTER_START
      : endDate && startOfDay(endDate) > maximumStartDate
        ? TEXT.ABSENCE_VALIDATION_END_DATE_NOT_FUTURE
        : "";
  const displayedDateError =
    startDateError || dateError || validationErrors.date || "";
  // Make sure holidays for the whole selected range are loaded so the day count
  // can exclude them.
  useEffect(() => {
    holidays.ensureRange(startDate, endDate);
  }, [startDate, endDate, holidays.ensureRange]);

  const leaveDayCount = useMemo(() => {
    if (!startDate || !endDate || startDateError || dateError) {
      return null;
    }

    return getWeekdayLeaveDayCount(startDate, endDate, Number(halfDay) > 0, holidays.isHoliday);
  }, [dateError, endDate, halfDay, startDate, startDateError, holidays.isHoliday]);

  const handlePickFile = useCallback(async () => {
    setIsSourceMenuOpen(false);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: "*/*",
      });

      if (!result.canceled) {
        setSelectedFile(result.assets[0] ?? null);
      }
    } catch {
      setToastMessage(TEXT.MEDIA_PICKER_FAILED);
    }
  }, []);

  const handlePickFromLibrary = useCallback(async () => {
    setIsSourceMenuOpen(false);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setToastMessage(TEXT.MEDIA_LIBRARY_PERMISSION);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });

      // No cropping step here, unlike the profile photo: a certificate must be
      // uploaded whole, and a fixed aspect ratio would cut part of it off.
      if (!result.canceled && result.assets[0]) {
        setSelectedFile(imageAssetToDocumentAsset(result.assets[0]));
      }
    } catch {
      setToastMessage(TEXT.MEDIA_PICKER_FAILED);
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    setIsSourceMenuOpen(false);

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setToastMessage(TEXT.MEDIA_CAMERA_PERMISSION);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(imageAssetToDocumentAsset(result.assets[0]));
      }
    } catch {
      setToastMessage(TEXT.MEDIA_PICKER_FAILED);
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
      nextErrors.approver = TEXT.ABSENCE_VALIDATION_APPROVER_REQUIRED;
    }

    if (!reason.trim()) {
      nextErrors.reason = TEXT.ABSENCE_VALIDATION_REASON_REQUIRED;
    }

    if (!startDate || !endDate) {
      nextErrors.date = TEXT.ABSENCE_VALIDATION_DATE_REQUIRED;
    }

    if (!contact.trim()) {
      nextErrors.contact = TEXT.ABSENCE_VALIDATION_CONTACT_REQUIRED;
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
          ? await updateabsenceData(editId, payload, TYPE_ABSENCE_SICK, uploadOptions)
          : await addabsenceData(payload, TYPE_ABSENCE_SICK, uploadOptions);

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
      const result = await removeData(editId, TYPE_ABSENCE_SICK);
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
        <ScreenHeader title={TEXT.ABSENCE_SICK_TITLE} backHref={backHref} showHomeButton={false} titleInNavBar tone="primary" />
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
        <ScreenHeader title={TEXT.ABSENCE_SICK_TITLE} backHref={backHref} showHomeButton={false} titleInNavBar tone="primary" />
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
            title={PENDING_APPROVAL_TITLE}
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
      <ScreenHeader title={TEXT.ABSENCE_SICK_TITLE} backHref={backHref} showHomeButton={false} titleInNavBar tone="primary" />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: gutter }]}
        keyboardShouldPersistTaps="handled"
      >
        <TipAlert
          title={TEXT.ABSENCE_POLICY_NOTE_LABEL}
          message={TEXT.ABSENCE_POLICY_NOTE_TEXT}
          style={styles.policyCard}
        />

        {/* Approver */}
        <SectionCard>
          <SelectField
            label={TEXT.ABSENCE_APPROVER_LABEL}
            placeholder={TEXT.ABSENCE_APPROVER_PLACEHOLDER}
            value={approver}
            options={approverOptions}
            isOpen={false}
            hasError={Boolean(validationErrors.approver)}
            errorMessage={validationErrors.approver}
            onToggle={() => setOpenSelect("approver")}
            onSelect={() => {}}
          />

          {/* The approver list carries a face, a position and a name, so each
              option keeps its avatar and leads with the position over the
              name. */}
          <SelectSheet
            visible={openSelect === "approver"}
            onClose={() => setOpenSelect(null)}
            title={TEXT.ABSENCE_APPROVER_LABEL}
            options={approverOptions.map((option) => ({
              id: option.value,
              // Position over the name, the name in bold — the same approver
              // row shape every absence form uses.
              overline: option.subtitle,
              label: option.title || option.label,
              searchText: option.label,
              leading: option.photoId ? (
                <UserAvatar staffId={option.photoId} size={40} />
              ) : undefined,
            }))}
            selectedId={approver}
            onSelect={(picked) => {
              const option = approverOptions.find((o) => o.value === picked.id);
              setApprover(picked.id);
              setApproverStaffId(option?.staffId ?? "");
              clearValidationError("approver");
            }}
          />
        </SectionCard>

        {/* Absence date */}
        <SectionCard>
          <View style={[styles.field, styles.fieldNoBorder]}>
            <ThemedText style={styles.fieldLabel}>
              {TEXT.ABSENCE_LEAVE_DATE_LABEL}
            </ThemedText>
            <View style={styles.dateRow}>
              <DatePickerField
                label={TEXT.ABSENCE_START_DATE_LABEL}
                hideLabel
                value={startDate}
                maximumDate={maximumStartDate}
                holidays={holidays.holidaySet}
                onVisibleMonthChange={holidays.ensureMonth}
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
                label={TEXT.ABSENCE_END_DATE_LABEL}
                hideLabel
                value={endDate}
                minimumDate={minimumEndDate}
                maximumDate={maximumStartDate}
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
            {leaveDayCount !== null ? (
              <ThemedText
                type="defaultSemiBold"
                style={styles.leaveDaySummary}
              >
                {TEXT.ABSENCE_LEAVE_DAY_COUNT_LABEL}
                {leaveDayCount.toLocaleString("th-TH")} {TEXT.ABSENCE_DAY_UNIT}
              </ThemedText>
            ) : null}
          </View>

          {/* The field itself stays as it is — only the list moved. It opens the
              shared SelectSheet instead of expanding in place, so choosing a
              half-day works like every other choice in the app. `isOpen` is
              always false because the sheet, not the field, now shows options. */}
          <SelectField
            label={TEXT.ABSENCE_HALF_DAY_LABEL}
            placeholder={TEXT.ABSENCE_HALF_DAY_PLACEHOLDER}
            value={halfDay}
            options={halfDayChoices}
            isOpen={false}
            onToggle={() => setOpenSelect("halfDay")}
            onSelect={() => {}}
          />

          <SelectSheet
            visible={openSelect === "halfDay"}
            onClose={() => setOpenSelect(null)}
            title={TEXT.ABSENCE_HALF_DAY_LABEL}
            options={halfDayChoices.map((option) => ({
              id: option.value,
              label: option.label,
            }))}
            selectedId={halfDay}
            onSelect={(option) => setHalfDay(option.id)}
          />
        </SectionCard>

        {/* Contact and reason */}
        <SectionCard>
          <View style={styles.field}>
            <ThemedText style={styles.fieldLabel}>
              {TEXT.ABSENCE_REASON_LABEL}
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
              placeholder={TEXT.ABSENCE_REASON_PLACEHOLDER}
              placeholderTextColor="#9CA3AF"
              style={[
                styles.textArea,
                validationErrors.reason ? styles.inputError : undefined,
                webNoOutline,
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
              placeholderTextColor="#9CA3AF"
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

        {/* Medical file upload */}
        <SectionCard>
          <View style={[styles.field, styles.medicalField]}>
            <View style={styles.toggleRow}>
              <ThemedText style={styles.fieldLabel}>
                {TEXT.ABSENCE_MEDICAL_CERTIFICATE_TOGGLE}
              </ThemedText>
              <Toggle
                value={hasMedicalCert}
                onValueChange={(value) => {
                  setHasMedicalCert(value);
                  if (!value) setSelectedFile(null);
                }}
              />
            </View>

            {hasMedicalCert ? (
              <>
                {selectedFile ? (
                  <View style={styles.selectedFileCard}>
                    <Paperclip size={18} color={c.primary} />
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
                          <Eye size={20} color={c.textMuted} />
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
                    onPress={() => setIsSourceMenuOpen(true)}
                    style={styles.uploadZone}
                  >
                    <CloudUpload size={30} color={c.primary} />
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
        </SectionCard>

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
              {isSubmitting ? SUBMITTING_LABEL : TEXT.ABSENCE_SUBMIT_REQUEST}
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
                  style={[styles.secondaryButton, styles.confirmActionButton]}
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
                  style={[styles.secondaryButton, styles.confirmActionButton]}
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
              accessibilityLabel={TEXT.SHARED_CLOSE_THAI}
              onPress={() => setIsImageViewerVisible(false)}
              style={styles.imageViewerCloseButton}
            >
              <X size={22} color="#FFFFFF" />
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

      {/* Where a certificate comes from. A phone user photographing the slip they
          were just handed and a desktop user attaching a scanned PDF are both
          normal, so neither is buried behind the other. */}
      <Sheet
        visible={isSourceMenuOpen}
        onClose={() => setIsSourceMenuOpen(false)}
        title={TEXT.ABSENCE_MEDICAL_CERTIFICATE_MENU_TITLE}
        scroll={false}
        contentStyle={styles.sourceSheet}
        animation="pop"
      >
        <Pressable
          accessibilityRole="button"
          onPress={handleTakePhoto}
          style={({ pressed }) => [styles.sourceItem, pressed && styles.sourceItemPressed]}
        >
          <View style={styles.sourceIcon}>
            <Camera size={20} color={c.primary} />
          </View>
          <View style={styles.sourceTextWrap}>
            <ThemedText style={styles.sourceLabel}>
              {TEXT.ABSENCE_MEDICAL_CERTIFICATE_TAKE_PHOTO}
            </ThemedText>
            <ThemedText style={styles.sourceHint}>
              {TEXT.ABSENCE_MEDICAL_CERTIFICATE_TAKE_PHOTO_HINT}
            </ThemedText>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={handlePickFromLibrary}
          style={({ pressed }) => [styles.sourceItem, pressed && styles.sourceItemPressed]}
        >
          <View style={styles.sourceIcon}>
            <Images size={20} color={c.primary} />
          </View>
          <View style={styles.sourceTextWrap}>
            <ThemedText style={styles.sourceLabel}>
              {TEXT.ABSENCE_MEDICAL_CERTIFICATE_FROM_LIBRARY}
            </ThemedText>
            <ThemedText style={styles.sourceHint}>
              {TEXT.ABSENCE_MEDICAL_CERTIFICATE_FROM_LIBRARY_HINT}
            </ThemedText>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={handlePickFile}
          style={({ pressed }) => [styles.sourceItem, pressed && styles.sourceItemPressed]}
        >
          <View style={styles.sourceIcon}>
            <FileText size={20} color={c.primary} />
          </View>
          <View style={styles.sourceTextWrap}>
            <ThemedText style={styles.sourceLabel}>
              {TEXT.ABSENCE_MEDICAL_CERTIFICATE_FROM_FILE}
            </ThemedText>
            <ThemedText style={styles.sourceHint}>
              {TEXT.ABSENCE_MEDICAL_CERTIFICATE_FROM_FILE_HINT}
            </ThemedText>
          </View>
        </Pressable>
      </Sheet>

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
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },
  formCard: {},
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
    paddingHorizontal: 0,
    paddingVertical: 12,
    gap: 10,
  },
  fieldNoBorder: {
    borderBottomWidth: 0,
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
  textArea: {
    minHeight: 52,
    color: c.text,
    fontFamily: AppFonts.psuRegular,
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 0,
    paddingVertical: 8,
    textAlignVertical: "top",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.inputBorder,
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  hint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    color: c.textMuted,
  },
  leaveDaySummary: {
    fontSize: 13,
    lineHeight: 18,
    color: c.info,
  },
  errorText: {
    color: c.danger,
  },
  fieldError: {
    fontSize: 12,
    lineHeight: 17,
    color: c.danger,
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
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: "row-reverse",
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
    fontSize: 14,
    lineHeight: 20,
    fontFamily: AppFonts.psuRegular,
  },
  selectedOptionText: {
    color: c.primary,
    fontFamily: AppFonts.psuBold,
  },
  personAvatar: {
    backgroundColor: c.surfaceMuted,
  },
  selectPerson: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectPersonText: {
    flex: 1,
    gap: 2,
  },
  selectPersonTitle: {
    color: c.text,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: AppFonts.psuBold,
  },
  selectPersonSubtitle: {
    color: c.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: AppFonts.psuRegular,
  },
  optionPersonRow: {
    justifyContent: "flex-start",
  },
  optionPerson: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionPersonText: {
    flex: 1,
    gap: 2,
  },
  optionSubtitle: {
    color: c.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: AppFonts.psuRegular,
  },
  emptyOption: {
    color: c.textMuted,
    lineHeight: 20,
    paddingVertical: 16,
    textAlign: "center",
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  medicalField: {
    paddingTop: 24,
    paddingBottom: 24,
  },
  uploadZone: {
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: c.border,
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
    color: c.primary,
  },
  uploadZoneHint: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textFaint,
  },
  // Attachment-source sheet. Rows are 56pt+ tall so each is a comfortable target
  // one-handed, which is how a photo of a certificate usually gets taken.
  sourceSheet: {
    paddingBottom: 4,
  },
  sourceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },
  sourceItemPressed: {
    opacity: 0.6,
  },
  sourceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.primarySoft,
  },
  sourceTextWrap: {
    flex: 1,
    gap: 2,
  },
  sourceLabel: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
    color: c.text,
  },
  sourceHint: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textMuted,
  },
  selectedFileCard: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: c.dangerSoft,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.danger,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedFileName: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: c.text,
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
    marginBottom: 14,
  },
  bottomSpacer: {
    height: 100,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
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
    backgroundColor: c.pomegranate,
  },
  deleteButton: {
    minHeight: 52,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: c.danger,
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
    backgroundColor: c.danger,
  },
  confirmActionButton: {
    flex: 1,
    // Overrides secondaryButton's own minWidth (132) below — without this,
    // Cancel keeps that floor while Confirm has none, so on a narrow modal
    // the 50/50 flex split loses to Cancel's floor and Confirm renders
    // narrower than it. Matches the other three leave forms.
    minWidth: 0,
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
    borderColor: c.border,
    backgroundColor: c.surface,
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
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
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
