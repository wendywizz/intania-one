import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
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

import { AppToast } from "@/components/app-toast";
import { LoadingAnimate } from "@/components/loading-animate";
import { ModalSelectField } from "@/components/modal-select-field";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import {
  getForgotTimestampInitData,
  getForgotTimestampViewData,
  removeForgotTimestamp,
  submitForgotTimestamp,
  type ForgotTimestamp,
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
};

type ApproverOption = {
  label: string;
  staffId: string;
  value: string;
};

type ValidationErrors = Partial<Record<"approver" | "time" | "reason", string>>;
const REDIRECT_DELAY_MS = 1500;

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

function getFirstItemValue(item: ForgotTimestamp, fields: string[]) {
  for (const field of fields) {
    const value = item[field];

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
}

function getNestedList(item: ForgotTimestamp, fields: string[]) {
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

function getApproverLabel(approver: Approver) {
  const firstName = String(
    approver.firstNameTH ?? approver.first_name_th ?? "",
  ).trim();
  const lastName = String(
    approver.lastNameTH ?? approver.last_name_th ?? "",
  ).trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const positionName = String(
    approver.positionName ?? approver.position_name ?? "",
  ).trim();

  return [positionName, fullName].filter(Boolean).join(" - ") ||
    String(approver.staffId ?? approver.staff_id ?? "");
}

function getApproverOptions(item: ForgotTimestamp): ApproverOption[] {
  return getNestedList(item, ["approverList", "approver_list"])
    .map((entry) => entry as Approver)
    .map((approver) => ({
      label: getApproverLabel(approver),
      staffId: String(approver.staffId ?? approver.staff_id ?? "").trim(),
      value: String(approver.positionId ?? approver.position_id ?? "").trim(),
    }))
    .filter((option) => option.label && option.value);
}

function getRequestUserLabel(item: ForgotTimestamp) {
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

function getStampType(item: ForgotTimestamp) {
  return getFirstItemValue(item, Array.from(stampTypeFields)).toLowerCase();
}

function getTimestampHint(stampType: string) {
  if (stampType === "in") {
    return "Start timestamp 07:00 - 08:45";
  }

  if (stampType === "out") {
    return "End timestamp 16:30 - 20:30";
  }

  return "";
}

function getForgetTypeLabel(stampType: string) {
  if (stampType === "in") {
    return "Forget timestamp in";
  }

  if (stampType === "out") {
    return "Forget timestamp out";
  }

  return "";
}

function getTimestampItem(rawItem: unknown): ForgotTimestamp {
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

export default function ForgotTimestampDetailScreen() {
  const { user: authUser } = useAuth();
  const { item: rawItem } = useLocalSearchParams<{
    item?: string;
  }>();
  const initialItem = useMemo(() => getTimestampItem(rawItem), [rawItem]);
  const [item, setItem] = useState<ForgotTimestamp>(initialItem);
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
  const selectedApproverLabel =
    approverOptions.find((option) => option.value === approver)?.label ?? "";
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
    (detailItem: ForgotTimestamp) => {
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
        ? await getForgotTimestampViewData(forgetId)
        : await getForgotTimestampInitData(staffId, timestamp, type);
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
      nextErrors.approver = "Approver List is required";
    }

    if (!selectedTime) {
      nextErrors.time = "Time is required";
    }

    if (!reason.trim()) {
      nextErrors.reason = "Reason is required";
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
      const result = await submitForgotTimestamp({
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
      router.replace("/forgot-timestamp/index");
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
      const result = await removeForgotTimestamp(forgetId);

      setToastType("success");
      setToastMessage(result.message || TEXT.SHARED_DELETE_THAI);
      await new Promise((resolve) => setTimeout(resolve, REDIRECT_DELAY_MS));
      router.replace("/forgot-timestamp/index");
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

        <View style={styles.form}>
          {forgetTypeLabel ? (
            <ThemedText type="defaultSemiBold" style={styles.forgetTypeLabel}>
              {forgetTypeLabel}
            </ThemedText>
          ) : null}

          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Approver List</ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsApproverOpen(true)}
              style={[
                styles.inputButton,
                validationErrors.approver ? styles.inputError : undefined,
              ]}
            >
              <ThemedText
                style={[
                  styles.inputButtonText,
                  !selectedApproverLabel ? styles.placeholder : undefined,
                ]}
              >
                {selectedApproverLabel || "Select approver"}
              </ThemedText>
              <ThemedText style={styles.chevron}>⌄</ThemedText>
            </Pressable>
            {validationErrors.approver ? (
              <ThemedText style={styles.fieldError}>
                {validationErrors.approver}
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Request User</ThemedText>
            <ThemedText style={styles.requestUserText}>
              {requestUserLabel || "-"}
            </ThemedText>
          </View>

          <View style={styles.dateTimeRow}>
            <View style={[styles.field, styles.dateField]}>
              <ThemedText type="defaultSemiBold">Date</ThemedText>
              {displayTimestamp ? (
                <TextInput
                  editable={false}
                  style={[styles.textInput, styles.readOnlyDateInput]}
                  value={displayTimestamp}
                />
              ) : null}
            </View>
            <View style={[styles.field, styles.timeField]}>
              <ThemedText type="defaultSemiBold">Time</ThemedText>
              {Platform.OS === "web" ? (
                <View style={styles.webTimePicker}>
                  <ModalSelectField
                    hasError={Boolean(validationErrors.time)}
                    options={hourModalOptions}
                    placeholder="Hour"
                    title="Hour"
                    value={selectedTime ? formatTime(selectedTime).slice(0, 2) : ""}
                    width={72}
                    onSelect={(value) => setWebTimePart("hour", value)}
                  />
                  <ThemedText style={styles.webTimeSeparator}>:</ThemedText>
                  <ModalSelectField
                    hasError={Boolean(validationErrors.time)}
                    options={minuteModalOptions}
                    placeholder="Min"
                    title="Minute"
                    value={selectedTime ? formatTime(selectedTime).slice(3, 5) : ""}
                    width={72}
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
                    {formatTime(selectedTime) || "Select time"}
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
                    Done
                  </ThemedText>
                </Pressable>
              ) : null}
              {timestampHint ? (
                <ThemedText style={styles.fieldHint}>{timestampHint}</ThemedText>
              ) : null}
            </View>
          </View>

          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Reason</ThemedText>
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
              placeholder="Enter reason"
              placeholderTextColor="#8A969C"
              style={[
                styles.textInput,
                styles.reasonInput,
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
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.FORGOT_TIMESTAMP_TITLE}
        backHref="/forgot-timestamp/index"
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
            {isSubmitting ? "Submitting..." : "Submit"}
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
              {isRemoving ? "Removing..." : "Remove"}
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
                  Approver List
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsApproverOpen(false)}
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
                {approverOptions.length ? (
                  approverOptions.map((option) => (
                    <Pressable
                      key={`${option.value}-${option.staffId}`}
                      accessibilityRole="button"
                      onPress={() => handleSelectApprover(option)}
                      style={styles.option}
                    >
                      <ThemedText style={styles.optionText}>
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
              <ThemedText type="subtitle">Confirm submit</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                Do you want to submit this forgot timestamp request?
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => setIsConfirmVisible(false)}
                  style={styles.cancelButton}
                >
                  <ThemedText type="defaultSemiBold">NO</ThemedText>
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
                  {isSubmitting ? "Submitting..." : "YES"}
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
              <ThemedText type="subtitle">Confirm remove</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                Do you want to remove this forgot timestamp request?
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isRemoving}
                  onPress={() => setIsRemoveConfirmVisible(false)}
                  style={styles.cancelButton}
                >
                  <ThemedText type="defaultSemiBold">NO</ThemedText>
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
                    {isRemoving ? "Removing..." : "YES"}
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
    flexGrow: 1,
    padding: 16,
    paddingBottom: 96,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
  },
  rows: {
    gap: 10,
    marginTop: 16,
  },
  form: {
    gap: 25,
    marginTop: 24,
  },
  forgetTypeLabel: {
    fontSize: 16,
    lineHeight: 22,
  },
  field: {
    gap: 8,
  },
  inputButton: {
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
  inputError: {
    borderColor: "#B42318",
  },
  inputButtonText: {
    flex: 1,
    color: "#11181C",
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  dateField: {
    width: 170,
  },
  timeField: {
    width: 184,
  },
  nativeTimeButton: {
    minWidth: 0,
  },
  webTimePicker: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingTop: 2,
  },
  webTimeSeparator: {
    color: "#11181C",
    fontSize: 18,
    lineHeight: 24,
  },
  placeholder: {
    color: "#8A969C",
  },
  fieldHint: {
    color: "#687076",
    fontSize: 12,
    lineHeight: 18,
  },
  fieldError: {
    color: "#B42318",
    fontSize: 12,
    lineHeight: 18,
  },
  timeDoneButton: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0A6E8A",
  },
  chevron: {
    color: "#0A6E8A",
    fontSize: 16,
    lineHeight: 20,
    marginLeft: 8,
  },
  textInput: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#BFD2DA",
    backgroundColor: "#FFFFFF",
    color: "#11181C",
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  reasonInput: {
    minHeight: 72,
  },
  readOnlyDateInput: {
    color: "#687076",
    backgroundColor: "#F6F8F9",
  },
  requestUserText: {
    color: "#11181C",
    fontSize: 14,
    lineHeight: 20,
  },
  errorContent: {
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: "#B42318",
  },
  retryButton: {
    minHeight: 44,
    minWidth: 116,
    alignItems: "center",
    alignSelf: "flex-start",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0A6E8A",
    marginTop: 12,
    paddingHorizontal: 16,
  },
  bottomBar: {
    flexDirection: "row",
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#D7E6EC",
    backgroundColor: "#FFFFFF",
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
    borderColor: "#F0B4AE",
    backgroundColor: "#FFFFFF",
  },
  submitButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0A6E8A",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    width: 112,
    color: "#687076",
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
    color: "#687076",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    minHeight: 44,
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#BFD2DA",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
  },
  confirmButton: {
    minHeight: 44,
    minWidth: 96,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0A6E8A",
    paddingHorizontal: 16,
  },
  removeConfirmButton: {
    minHeight: 44,
    minWidth: 96,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#B42318",
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
    minHeight: 40,
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#E4F0F6",
    paddingHorizontal: 14,
  },
  optionScroll: {
    maxHeight: 420,
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
});
