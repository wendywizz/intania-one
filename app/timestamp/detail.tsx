import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { X } from 'lucide-react-native';
import { router, useLocalSearchParams, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { AppToast } from "@/components/app-toast";
import { LoadingAnimate } from "@/components/loading-animate";
import { ModalSelectField } from "@/components/modal-select-field";
import { NavTopBar } from "@/components/nav-top-bar";
import { SectionCard } from "@/components/section-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { UserAvatar } from "@/components/user-avatar";
import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import {
  getTimestampInitData,
  getTimestampViewData,
  removeTimestamp,
  submitTimestamp,
  type Timestamp,
} from "@/services/timestampService";
import { formatFullDate } from "@/utils/date-format";

type Approver = {
  firstNameTH?: string;
  first_name_th?: string;
  lastNameTH?: string;
  last_name_th?: string;
  positionId?: string | number;
  position_id?: string | number;
  positionName?: string;
  position_name?: string;
  staffId?: string | number;
  staff_id?: string | number;
  uniStaffId?: string | number;
  uni_staff_id?: string | number;
};

type ApproverOption = {
  label: string;
  position: string;
  name: string;
  staffId: string;
  /** University staff id used for the personnel photo. */
  photoId: string;
  value: string;
};

type ValidationErrors = Partial<Record<"approver" | "time" | "reason", string>>;
const REDIRECT_DELAY_MS = 1500;

// Remove the browser focus outline on web so active inputs match the borderless
// underline style (RN Web only; no-op on native).
const webNoOutline: object | null = Platform.OS === "web" ? { outlineStyle: "none" } : null;

const stampTypeFields = new Set(["stampType", "stamp_type"]);
const dateFields = new Set([
  "date",
  "workDate",
  "work_date",
  "stampDate",
  "stamp_date",
  "timestampDate",
  "timestamp_date",
]);
const dateFieldList = Array.from(dateFields);
const forgetIdFields = ["id", "forgetId", "forget_id", "timestampId", "timestamp_id"];

function getFirstItemValue(item: Timestamp, fields: string[]) {
  for (const field of fields) {
    const value = item[field];

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
}

function getNestedList(item: Timestamp, fields: string[]) {
  for (const field of fields) {
    const value = item[field];

    if (Array.isArray(value)) {
      return value;
    }

    if (
      value &&
      typeof value === "object" &&
      Array.isArray((value as { item?: unknown }).item)
    ) {
      return (value as { item: unknown[] }).item;
    }
  }

  return [];
}

function getApproverParts(approver: Approver) {
  const firstName = String(
    approver.firstNameTH ?? approver.first_name_th ?? "",
  ).trim();
  const lastName = String(
    approver.lastNameTH ?? approver.last_name_th ?? "",
  ).trim();
  const name = `${firstName} ${lastName}`.trim();
  const position = String(
    approver.positionName ?? approver.position_name ?? "",
  ).trim();
  return { position, name };
}

function getApproverLabel(approver: Approver) {
  const { position, name } = getApproverParts(approver);
  return [position, name].filter(Boolean).join(" - ") ||
    String(approver.staffId ?? approver.staff_id ?? "");
}

function getApproverOptions(item: Timestamp): ApproverOption[] {
  return getNestedList(item, ["approverList", "approver_list"])
    .map((entry) => entry as Approver)
    .map((approver) => {
      const { position, name } = getApproverParts(approver);
      return {
        label: getApproverLabel(approver),
        position,
        name,
        staffId: String(approver.staffId ?? approver.staff_id ?? "").trim(),
        photoId: String(
          approver.uniStaffId ?? approver.uni_staff_id ?? approver.staffId ?? approver.staff_id ?? "",
        ).trim(),
        value: String(approver.positionId ?? approver.position_id ?? "").trim(),
      };
    })
    .filter((option) => option.label && option.value);
}

function getRequestUserLabel(item: Timestamp) {
  const firstName = getFirstItemValue(item, [
    "firstNameTH",
    "first_name_th",
    "firstName",
    "first_name",
  ]);
  const lastName = getFirstItemValue(item, [
    "lastNameTH",
    "last_name_th",
    "lastName",
    "last_name",
  ]);
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    fullName ||
    getFirstItemValue(item, [
      "requestUser",
      "request_user",
      "requestUserName",
      "request_user_name",
      "staffName",
      "staff_name",
      "name",
    ])
  );
}

function formatTime(date: Date | null) {
  if (!date) {
    return "";
  }

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function getDateWithTimeParts(hoursValue: string, minutesValue: string) {
  const hours = Number(hoursValue);
  const minutes = Number(minutesValue);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date;
}

function getDateWithTimeValue(value: string) {
  const [hoursValue = "", minutesValue = ""] = value.split(":");

  return getDateWithTimeParts(hoursValue, minutesValue);
}

const hourOptions = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0"),
);
const minuteOptions = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, "0"),
);

function toModalOptions(options: string[]) {
  return options.map((option) => ({ label: option, value: option }));
}

function getHourOptions(stampType: string) {
  if (stampType === "in") {
    return ["06", "07", "08"];
  }

  if (stampType === "out") {
    return ["16", "17", "18", "19", "20"];
  }

  return hourOptions;
}

function getStampType(item: Timestamp) {
  return getFirstItemValue(item, Array.from(stampTypeFields)).toLowerCase();
}

function getTimestampHint(stampType: string) {
  if (stampType === "in") {
    return TEXT.TIMESTAMP_IN_HINT;
  }

  if (stampType === "out") {
    return TEXT.TIMESTAMP_OUT_HINT;
  }

  return "";
}

function getForgetTypeLabel(stampType: string) {
  if (stampType === "in") {
    return TEXT.TIMESTAMP_STAMP_IN;
  }

  if (stampType === "out") {
    return TEXT.TIMESTAMP_STAMP_OUT;
  }

  return "";
}

function getTimestampItem(rawItem: unknown): Timestamp {
  if (typeof rawItem !== "string") {
    return {};
  }

  try {
    const parsed = JSON.parse(rawItem);

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export default function TimestampDetailScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user: authUser } = useAuth();
  const { item: rawItem } = useLocalSearchParams<{
    item?: string;
  }>();
  const initialItem = useMemo(() => getTimestampItem(rawItem), [rawItem]);
  const [item, setItem] = useState<Timestamp>(initialItem);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [approver, setApprover] = useState("");
  const [isApproverOpen, setIsApproverOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [reason, setReason] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isRemoveConfirmVisible, setIsRemoveConfirmVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "">("");
  const approverOptions = useMemo(() => getApproverOptions(item), [item]);
  const requestUserLabel = getRequestUserLabel(item);
  const requesterPhotoId = getFirstItemValue(item, [
    "uniStaffId", "uni_staff_id", "staffId", "staff_id",
  ]);
  const selectedApprover = approverOptions.find((option) => option.value === approver);
  const selectedApproverLabel = selectedApprover?.label ?? "";
  const staffId = authUser?.staffId || USER_ID;
  const forgetId = getFirstItemValue(initialItem, forgetIdFields);
  const isEditMode = Boolean(forgetId);
  const timestamp = getFirstItemValue(initialItem, dateFieldList);
  const type = getStampType(initialItem);
  const timestampHint = getTimestampHint(type);
  const forgetTypeLabel = getForgetTypeLabel(type);
  const availableHourOptions = useMemo(() => getHourOptions(type), [type]);
  const hourModalOptions = useMemo(
    () => toModalOptions(availableHourOptions),
    [availableHourOptions],
  );
  const minuteModalOptions = useMemo(() => toModalOptions(minuteOptions), []);
  const displayTimestamp = timestamp ? formatFullDate(timestamp) : "";

  const fillEditableFields = useCallback(
    (detailItem: Timestamp) => {
      const nextApprover = getFirstItemValue(detailItem, [
        "approverPosition",
        "approver_position",
        "approver_id",
      ]);
      const nextReason = getFirstItemValue(detailItem, [
        "reason",
        "detail",
        "description",
      ]);
      const nextTime = getFirstItemValue(
        detailItem,
        type === "out"
          ? ["outTime", "out_time", "timestampTime", "timestamp_time", "time"]
          : ["inTime", "in_time", "timestampTime", "timestamp_time", "time"],
      );

      if (nextApprover) {
        setApprover(nextApprover);
      }

      if (nextReason) {
        setReason(nextReason);
      }

      if (nextTime) {
        const nextDate = getDateWithTimeValue(nextTime);

        if (nextDate) {
          setSelectedTime(nextDate);
        }
      }
    },
    [type],
  );

  const loadDetail = useCallback(async () => {
    if (!forgetId && (!staffId || !timestamp || !type)) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = forgetId
        ? await getTimestampViewData(forgetId)
        : await getTimestampInitData(staffId, timestamp, type);
      const nextItem = Object.keys(result.data).length
        ? { ...initialItem, ...result.data }
        : initialItem;

      setItem(nextItem);
      fillEditableFields(nextItem);
    } catch (error) {
      setItem(initialItem);
      setError(
        error instanceof Error ? error.message : TEXT.SHARED_SOMETHING_WENT_WRONG,
      );
    } finally {
      setIsLoading(false);
    }
  }, [fillEditableFields, forgetId, initialItem, staffId, timestamp, type]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!selectedTime) {
      return;
    }

    const selectedHour = formatTime(selectedTime).slice(0, 2);

    if (!availableHourOptions.includes(selectedHour)) {
      setSelectedTime(null);
    }
  }, [availableHourOptions, selectedTime]);

  const handleSelectApprover = (option: ApproverOption) => {
    setApprover(option.value);
    setValidationErrors((currentErrors) => ({
      ...currentErrors,
      approver: undefined,
    }));
    setIsApproverOpen(false);
  };

  const handleTimeChange = (
    event: DateTimePickerEvent,
    nextDate?: Date,
  ) => {
    if (Platform.OS !== "ios") {
      setIsTimePickerVisible(false);
    }

    if (event.type === "set" && nextDate) {
      setSelectedTime(nextDate);
      setValidationErrors((currentErrors) => ({
        ...currentErrors,
        time: undefined,
      }));
    }
  };

  const showTimePicker = () => {
    if (Platform.OS === "web") {
      return;
    }

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: selectedTime ?? new Date(),
        mode: "time",
        is24Hour: true,
        display: "default",
        onChange: handleTimeChange,
      });
      return;
    }

    setIsTimePickerVisible(true);
  };

  const setWebTimePart = (part: "hour" | "minute", value: string) => {
    const [currentHour = "00", currentMinute = "00"] =
      formatTime(selectedTime).split(":");
    const nextDate = getDateWithTimeParts(
      part === "hour" ? value : currentHour,
      part === "minute" ? value : currentMinute,
    );

    if (nextDate) {
      setSelectedTime(nextDate);
      setValidationErrors((currentErrors) => ({
        ...currentErrors,
        time: undefined,
      }));
    }
  };

  const handleSubmit = () => {
    if (isSubmitting || isRemoving) {
      return;
    }

    const nextErrors: ValidationErrors = {};

    if (!approver) {
      nextErrors.approver = TEXT.TIMESTAMP_APPROVER_REQUIRED;
    }

    if (!selectedTime) {
      nextErrors.time = TEXT.TIMESTAMP_TIME_REQUIRED;
    }

    if (!reason.trim()) {
      nextErrors.reason = TEXT.TIMESTAMP_REASON_REQUIRED;
    }

    setValidationErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setToastMessage("");
    setToastType("");
    setIsConfirmVisible(true);
  };

  const handleConfirmSubmit = async () => {
    if (!selectedTime || isSubmitting || isRemoving) {
      return;
    }

    setIsSubmitting(true);
    setToastMessage("");
    setToastType("");

    try {
      const time = formatTime(selectedTime);
      const result = await submitTimestamp({
        id: forgetId || undefined,
        staff_id: staffId,
        timestamp,
        type,
        approver_position: approver,
        reason: reason.trim(),
        in_time: type === "in" ? time : "",
        out_time: type === "out" ? time : "",
      }, forgetId ? "PUT" : "POST");

      setIsConfirmVisible(false);
      setToastType("success");
      setToastMessage(result.message || TEXT.SHARED_SUCCESS);
      await new Promise((resolve) => setTimeout(resolve, REDIRECT_DELAY_MS));
      router.replace("/timestamp/forgot-timestamp" as Parameters<typeof router.replace>[0]);
    } catch (error) {
      setToastType("error");
      setToastMessage(
        error instanceof Error ? error.message : TEXT.SHARED_SOMETHING_WENT_WRONG,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = () => {
    if (!forgetId || isSubmitting || isRemoving) {
      return;
    }

    setIsRemoveConfirmVisible(true);
  };

  const handleConfirmRemove = async () => {
    if (!forgetId || isSubmitting || isRemoving) {
      return;
    }

    setIsRemoveConfirmVisible(false);
    setIsRemoving(true);
    setToastMessage("");
    setToastType("");

    try {
      const result = await removeTimestamp(forgetId);

      setToastType("success");
      setToastMessage(result.message || TEXT.SHARED_DELETE_THAI);
      await new Promise((resolve) => setTimeout(resolve, REDIRECT_DELAY_MS));
      router.replace("/timestamp/forgot-timestamp" as Parameters<typeof router.replace>[0]);
    } catch (error) {
      setToastType("error");
      setToastMessage(
        error instanceof Error ? error.message : TEXT.SHARED_SOMETHING_WENT_WRONG,
      );
    } finally {
      setIsRemoving(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <LoadingAnimate
          title={TEXT.SHARED_LOADING_DATA_TITLE}
          desc={TEXT.SHARED_LOADING_DESCRIPTION}
        />
      );
    }

    return (
      <View>
        {error ? (
          <View style={styles.errorContent}>
            <ThemedText style={[styles.errorText, styles.errorMessage]}>
              {error}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={loadDetail}
              style={styles.retryButton}
            >
              <ThemedText
                lightColor="#FFFFFF"
                darkColor="#FFFFFF"
                type="defaultSemiBold"
              >
                {TEXT.SHARED_RETRY_THAI}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {/* Approver section */}
        <SectionCard style={styles.sectionCard}>
          <View style={styles.field}>
            <ThemedText style={styles.fieldLabel}>{TEXT.TIMESTAMP_FIELD_APPROVER}</ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsApproverOpen(true)}
              style={[
                styles.inputButton,
                webNoOutline,
                validationErrors.approver ? styles.inputError : undefined,
              ]}
            >
              {selectedApprover?.photoId ? (
                <UserAvatar staffId={selectedApprover.photoId} size={36} />
              ) : null}
              {selectedApprover ? (
                <View style={styles.selectValueCol}>
                  <ThemedText style={styles.selectPosition} numberOfLines={1}>
                    {selectedApprover.position || selectedApprover.label}
                  </ThemedText>
                  {selectedApprover.name ? (
                    <ThemedText style={styles.selectName} numberOfLines={1}>
                      {selectedApprover.name}
                    </ThemedText>
                  ) : null}
                </View>
              ) : (
                <ThemedText style={[styles.inputButtonText, styles.placeholder]}>
                  {TEXT.TIMESTAMP_SELECT_APPROVER}
                </ThemedText>
              )}
              <ThemedText style={styles.chevron}>⌄</ThemedText>
            </Pressable>
            {validationErrors.approver ? (
              <ThemedText style={styles.fieldError}>
                {validationErrors.approver}
              </ThemedText>
            ) : null}
          </View>
        </SectionCard>

        {/* Time section (includes the forgot-timestamp type name) */}
        <SectionCard style={styles.sectionCard}>
          {forgetTypeLabel ? (
            <ThemedText type="defaultSemiBold" style={styles.forgetTypeLabel}>
              {forgetTypeLabel}
            </ThemedText>
          ) : null}
          <View style={styles.dateTimeRow}>
            <View style={[styles.field, styles.dateField]}>
              <ThemedText style={styles.fieldLabel}>{TEXT.TIMESTAMP_FIELD_ORIGINAL_DATE}</ThemedText>
              {displayTimestamp ? (
                <TextInput
                  editable={false}
                  style={[styles.textInput, styles.readOnlyDateInput, webNoOutline]}
                  value={displayTimestamp}
                />
              ) : null}
            </View>
            <View style={[styles.field, styles.timeField]}>
              <ThemedText style={styles.fieldLabel}>{TEXT.TIMESTAMP_FIELD_CORRECTED_TIME}</ThemedText>
              {Platform.OS === "web" ? (
                <View style={styles.webTimePicker}>
                  <ModalSelectField
                    hasError={Boolean(validationErrors.time)}
                    options={hourModalOptions}
                    placeholder={TEXT.TIMESTAMP_HOUR}
                    title={TEXT.TIMESTAMP_HOUR}
                    value={selectedTime ? formatTime(selectedTime).slice(0, 2) : ""}
                    width={56}
                    buttonStyle={[styles.timeSelectButton, webNoOutline]}
                    onSelect={(value) => setWebTimePart("hour", value)}
                  />
                  <ThemedText style={styles.webTimeSeparator}>:</ThemedText>
                  <ModalSelectField
                    hasError={Boolean(validationErrors.time)}
                    options={minuteModalOptions}
                    placeholder={TEXT.TIMESTAMP_MINUTE}
                    title={TEXT.TIMESTAMP_MINUTE}
                    value={selectedTime ? formatTime(selectedTime).slice(3, 5) : ""}
                    width={56}
                    buttonStyle={[styles.timeSelectButton, webNoOutline]}
                    onSelect={(value) => setWebTimePart("minute", value)}
                  />
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={showTimePicker}
                  style={[
                    styles.inputButton,
                    styles.nativeTimeButton,
                    validationErrors.time ? styles.inputError : undefined,
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.inputButtonText,
                      !selectedTime ? styles.placeholder : undefined,
                    ]}
                  >
                    {formatTime(selectedTime) || TEXT.TIMESTAMP_SELECT_TIME}
                  </ThemedText>
                </Pressable>
              )}
              {validationErrors.time ? (
                <ThemedText style={styles.fieldError}>
                  {validationErrors.time}
                </ThemedText>
              ) : null}
              {isTimePickerVisible ? (
                <DateTimePicker
                  value={selectedTime ?? new Date()}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  is24Hour
                  onChange={handleTimeChange}
                />
              ) : null}
              {isTimePickerVisible && Platform.OS === "ios" ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsTimePickerVisible(false)}
                  style={styles.timeDoneButton}
                >
                  <ThemedText
                    lightColor="#FFFFFF"
                    darkColor="#FFFFFF"
                    type="defaultSemiBold"
                  >
                    {TEXT.TIMESTAMP_DONE}
                  </ThemedText>
                </Pressable>
              ) : null}
              {timestampHint ? (
                <ThemedText style={styles.fieldHint}>{timestampHint}</ThemedText>
              ) : null}
            </View>
          </View>
        </SectionCard>

        {/* Reason section */}
        <SectionCard style={styles.sectionCard}>
          <View style={styles.field}>
            <ThemedText style={styles.fieldLabel}>{TEXT.TIMESTAMP_REASON_LABEL}</ThemedText>
            <TextInput
              multiline
              numberOfLines={2}
              onChangeText={(value) => {
                setReason(value);
                setValidationErrors((currentErrors) => ({
                  ...currentErrors,
                  reason: undefined,
                }));
              }}
              placeholder={TEXT.TIMESTAMP_REASON_PLACEHOLDER}
              placeholderTextColor="#8A969C"
              style={[
                styles.textInput,
                styles.reasonInput,
                webNoOutline,
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
        </SectionCard>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar
        title={TEXT.TIMESTAMP_TITLE}
        backHref={"/timestamp/forgot-timestamp" as Href}
        tone="primary"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {renderContent()}
      </ScrollView>
      <View style={styles.bottomBar}>
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting || isRemoving}
          onPress={handleSubmit}
          style={[
            styles.submitButton,
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
              ? TEXT.TIMESTAMP_SUBMITTING
              : isEditMode
                ? TEXT.TIMESTAMP_UPDATE
                : TEXT.TIMESTAMP_SUBMIT}
          </ThemedText>
        </Pressable>
        {isEditMode ? (
          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting || isRemoving}
            onPress={handleRemove}
            style={[
              styles.removeButton,
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
              {isRemoving ? TEXT.TIMESTAMP_REMOVING : TEXT.SHARED_DELETE_THAI}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
      <Modal
        transparent
        visible={isApproverOpen}
        animationType="fade"
        onRequestClose={() => setIsApproverOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setIsApproverOpen(false)}
        >
          <Pressable style={styles.modalContent}>
            <ThemedView
              style={styles.selectModal}
              lightColor="#FFFFFF"
              darkColor="#151718"
            >
              <View style={styles.selectModalHeader}>
                <ThemedText type="defaultSemiBold" style={styles.selectModalTitle}>
                  {TEXT.TIMESTAMP_APPROVER_LIST_TITLE}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={TEXT.SHARED_CLOSE_THAI}
                  onPress={() => setIsApproverOpen(false)}
                  style={styles.closeButton}
                >
                  <X size={20} color={c.text} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.optionScroll}
                contentContainerStyle={styles.optionScrollContent}
              >
                {approverOptions.length ? (
                  approverOptions.map((option) => (
                    <Pressable
                      key={`${option.value}-${option.staffId}`}
                      accessibilityRole="button"
                      onPress={() => handleSelectApprover(option)}
                      style={styles.option}
                    >
                      <UserAvatar staffId={option.photoId} size={36} />
                      <View style={styles.optionTextCol}>
                        <ThemedText style={styles.optionPosition} numberOfLines={2}>
                          {option.position || option.label}
                        </ThemedText>
                        {option.name ? (
                          <ThemedText style={styles.optionName} numberOfLines={1}>
                            {option.name}
                          </ThemedText>
                        ) : null}
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
      <Modal
        transparent
        visible={isConfirmVisible}
        animationType="fade"
        onRequestClose={() => {
          if (!isSubmitting) {
            setIsConfirmVisible(false);
          }
        }}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            if (!isSubmitting) {
              setIsConfirmVisible(false);
            }
          }}
        >
          <Pressable style={styles.modalContent}>
            <ThemedView
              style={styles.confirmModal}
              lightColor="#FFFFFF"
              darkColor="#151718"
            >
              <ThemedText type="subtitle">{TEXT.TIMESTAMP_CONFIRM_SUBMIT_TITLE}</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                {TEXT.TIMESTAMP_CONFIRM_SUBMIT_MESSAGE}
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => setIsConfirmVisible(false)}
                  style={styles.cancelButton}
                >
                  <ThemedText type="defaultSemiBold">{TEXT.CANCEL}</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={handleConfirmSubmit}
                  style={[
                    styles.confirmButton,
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
                  {isSubmitting ? TEXT.TIMESTAMP_SUBMITTING : TEXT.ABSENCE_CONFIRM_SUBMIT_ACTION}
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
        onRequestClose={() => {
          if (!isRemoving) {
            setIsRemoveConfirmVisible(false);
          }
        }}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            if (!isRemoving) {
              setIsRemoveConfirmVisible(false);
            }
          }}
        >
          <Pressable style={styles.modalContent}>
            <ThemedView
              style={styles.confirmModal}
              lightColor="#FFFFFF"
              darkColor="#151718"
            >
              <ThemedText type="subtitle">{TEXT.TIMESTAMP_CONFIRM_REMOVE_TITLE}</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                {TEXT.TIMESTAMP_CONFIRM_REMOVE_MESSAGE}
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isRemoving}
                  onPress={() => setIsRemoveConfirmVisible(false)}
                  style={styles.cancelButton}
                >
                  <ThemedText type="defaultSemiBold">{TEXT.CANCEL}</ThemedText>
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
                    {isRemoving ? TEXT.TIMESTAMP_REMOVING : TEXT.SHARED_DELETE_THAI}
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
    flexGrow: 1,
    padding: 16,
    paddingBottom: 96,
    gap: 0,
  },
  contextCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(223,191,189,0.3)",
    padding: 14,
    marginBottom: 16,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  contextIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(179,57,57,0.1)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  contextText: {
    flex: 1,
    gap: 3,
    paddingTop: 2,
  },
  contextTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
    color: c.primary,
    fontFamily: AppFonts.psuBold,
  },
  contextDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  fieldLabel: {
    fontSize: 15,
    lineHeight: 20,
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  guidanceNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(231,232,236,0.4)",
    borderLeftWidth: 4,
    borderLeftColor: "rgba(146,33,36,0.4)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  guidanceNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
  },
  rows: {
    gap: 10,
    marginTop: 16,
  },
  formCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionCard: {
    marginBottom: 12,
  },
  form: {
    gap: 25,
    marginTop: 8,
  },
  forgetTypeLabel: {
    fontSize: 16,
    lineHeight: 22,
  },
  field: {
    gap: 8,
  },
  inputButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.inputBorder,
  },
  inputError: {
    borderBottomWidth: 1.5,
    borderBottomColor: c.danger,
  },
  inputButtonText: {
    flex: 1,
    color: c.text,
    fontSize: 16,
    fontFamily: AppFonts.psuRegular,
  },
  selectValueCol: {
    flex: 1,
    gap: 2,
  },
  selectPosition: {
    fontSize: 15,
    lineHeight: 20,
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  selectName: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  dateField: {
    flex: 1,
    minWidth: 0,
  },
  timeField: {
    width: 150,
    flexShrink: 0,
  },
  nativeTimeButton: {
    minWidth: 0,
  },
  webTimePicker: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
  },
  // Underline look for the hour/minute selects — matches the approver dropdown.
  timeSelectButton: {
    minHeight: 40,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.inputBorder,
    paddingHorizontal: 0,
  },
  webTimeSeparator: {
    color: c.text,
    fontSize: 18,
    lineHeight: 24,
  },
  placeholder: {
    color: c.textFaint,
  },
  fieldHint: {
    color: c.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  fieldError: {
    color: c.danger,
    fontSize: 12,
    lineHeight: 18,
  },
  timeDoneButton: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.info,
  },
  chevron: {
    color: c.textMuted,
    fontSize: 18,
    lineHeight: 24,
    marginLeft: 8,
  },
  textInput: {
    color: c.text,
    fontFamily: AppFonts.psuRegular,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.inputBorder,
  },
  reasonInput: {
    minHeight: 52,
    textAlignVertical: "top",
  },
  readOnlyDateInput: {
    minHeight: 40,
    color: c.textMuted,
  },
  requestUserText: {
    flex: 1,
    color: c.text,
    fontSize: 14,
    lineHeight: 20,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inlineAvatar: {
    marginRight: 8,
  },
  errorContent: {
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: c.danger,
  },
  retryButton: {
    minHeight: 44,
    minWidth: 116,
    alignItems: "center",
    alignSelf: "flex-start",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.pomegranate,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  bottomBar: {
    flexDirection: "row",
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  removeButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  submitButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: c.pomegranate,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    width: 112,
    color: c.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  value: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "right",
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
  confirmModal: {
    width: "100%",
    borderRadius: 8,
    padding: 18,
  },
  confirmMessage: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  confirmActions: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    flex: 1,
    minHeight: 44,
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: 16,
  },
  confirmButton: {
    flex: 1,
    minHeight: 44,
    minWidth: 96,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.info,
    paddingHorizontal: 16,
  },
  removeConfirmButton: {
    flex: 1,
    minHeight: 44,
    minWidth: 96,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.danger,
    paddingHorizontal: 16,
  },
  disabledButton: {
    opacity: 0.6,
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
    maxHeight: 420,
  },
  optionScrollContent: {
    gap: 8,
  },
  option: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionText: {
    flex: 1,
    color: c.text,
    lineHeight: 20,
  },
  optionTextCol: {
    flex: 1,
    gap: 2,
  },
  optionPosition: {
    color: c.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: AppFonts.psuBold,
  },
  optionName: {
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppFonts.psuRegular,
  },
  emptyOption: {
    color: c.textMuted,
    lineHeight: 20,
    paddingVertical: 16,
    textAlign: "center",
  },
});
