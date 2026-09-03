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

import { AgentSelectField } from "@/components/agent-select-field";
import { AppToast } from "@/components/app-toast";
import { DatePickerField } from "@/components/date-picker-field";
import { TipAlert } from "@/components/ui/tip-alert";
import { useHolidays } from "@/hooks/use-holidays";
import { ErrorState } from "@/components/error-state";
import { LoadingAnimate } from "@/components/loading-animate";
import { ScreenHeader } from "@/components/screen-header";
import { SectionCard } from "@/components/section-card";
import { SelectSheet } from "@/components/ui/select-sheet";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { UserAvatar } from "@/components/user-avatar";
import { AppFonts } from "@/constants/fonts";
import { TYPE_ABSENCE_BUSINESS } from "@/constants/types";
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
  formatDateTimeParam,
  getabsenceTextValue,
  getHalfDayValue,
  getWeekdayLeaveDayCount,
  isRetryableInitialError,
  startOfDay,
} from "@/utils/absence-form";
import {
  getStaffDisplayLabel,
  getStaffNameLabel,
  getStaffPositionLabel,
} from "@/utils/staff-label";

// Remove the default focus outline on web so active inputs match the
// borderless underline style (RN Web only; no-op on native).
const webNoOutline: any = Platform.OS === "web" ? { outlineStyle: "none" } : null;

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
  photoId?: string;
  // Staff options render as two lines (position over a bold name) instead of
  // the flat `label`, which stays as the collapsed value and search text.
  position?: string;
  name?: string;
};

function getApproverList(data: absence | null): Approver[] {
  return Array.isArray(data?.approverList)
    ? (data.approverList as Approver[])
    : [];
}

function getAgentList(data: absence | null): Agent[] {
  return Array.isArray(data?.agentList) ? (data.agentList as Agent[]) : [];
}

function getStaffLabel(staff: Approver | Agent) {
  return getStaffDisplayLabel(staff);
}

function getStaffId(staff: Approver | Agent) {
  return getabsenceTextValue(staff as absence, ["staffId", "staff_id", "STAFF_ID", "id"]);
}

// Staff photos are keyed on the university staff id (UNI_STAFF_ID). Fall back to
// the internal staffId so an avatar still resolves if only that is present.
function getStaffPhotoId(staff: Approver | Agent) {
  return (
    getabsenceTextValue(staff as absence, [
      "uniStaffId",
      "uni_staff_id",
      "UNI_STAFF_ID",
    ]) || getStaffId(staff)
  );
}

// True when the staff entry is the signed-in user. authUser.staffId can be the
// internal staff_id OR the uni_staff_id depending on the auth source, so compare
// against both id fields.
function isAuthUser(staff: Approver | Agent, userId: string) {
  const uid = String(userId ?? "").trim();
  if (!uid) return false;
  const staffId = getStaffId(staff);
  const uniStaffId = getabsenceTextValue(staff as absence, [
    "uniStaffId",
    "uni_staff_id",
    "UNI_STAFF_ID",
  ]);
  return uid === String(staffId).trim() || uid === String(uniStaffId).trim();
}

function getStaffDept(staff: Approver | Agent) {
  return getabsenceTextValue(staff as absence, [
    "deptName",
    "dept_name",
    "DEPT_NAME",
    "DEPT_NAME_TH",
    "deptNameTH",
    "department",
    "departmentName",
    "faculty",
  ]);
}

function getPositionId(staff: Approver | Agent) {
  return getabsenceTextValue(staff as absence, ["positionId", "position_id", "POSITION_ID"]);
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

function getItemStringList(item: absence, fields: string[]) {
  for (const field of fields) {
    const value = item[field];

    if (Array.isArray(value)) {
      return value
        .map((itemValue) => {
          if (itemValue && typeof itemValue === "object") {
            return (
              getabsenceTextValue(itemValue as absence, [
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

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

const halfDayOptions: SelectOption[] = [
  { label: TEXT.ABSENCE_HALF_DAY_NONE, value: "0" },
  { label: TEXT.ABSENCE_HALF_DAY_FIRST_MORNING, value: "1" },
  { label: TEXT.ABSENCE_HALF_DAY_FIRST_AFTERNOON, value: "2" },
  { label: TEXT.ABSENCE_HALF_DAY_LAST_MORNING, value: "3" },
  { label: TEXT.ABSENCE_HALF_DAY_FIRST_AFTERNOON_LAST_MORNING, value: "4" },
];

/** Everything except "none" — the forms only ever offer real half-days. */
const halfDayChoices = halfDayOptions.filter((option) => option.value !== "0");

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
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
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
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={handleToggle}
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
                  accessibilityLabel={TEXT.SHARED_CLOSE_THAI}
                  onPress={handleToggle}
                  style={styles.closeButton}
                >
                  <X size={20} color={c.text} />
                </Pressable>
              </View>

              {searchable ? (
                <TextInput
                  onChangeText={setSearchText}
                  placeholder={TEXT.SHARED_SEARCH_NAME_PLACEHOLDER}
                  placeholderTextColor="#9CA3AF"
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
                        styles.optionWithAction,
                        value === option.value ? styles.selectedOption : undefined,
                      ]}
                    >
                      <View style={styles.optionRow}>
                        {option.photoId ? (
                          <UserAvatar staffId={option.photoId} size={38} />
                        ) : null}
                        <ThemedText
                          style={[
                            styles.optionText,
                            value === option.value ? styles.selectedOptionText : undefined,
                          ]}
                        >
                          {option.label}
                        </ThemedText>
                      </View>
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
  const routeEditId =
    getItemText(routeEditItem, [
      "id",
      "absenceId",
      "ABSENCE_id",
      "requestId",
      "request_id",
    ]) || (Array.isArray(params.id) ? params.id[0] : params.id ?? "");
  const isEditMode =
    (Array.isArray(params.mode) ? params.mode[0] : params.mode) === "edit" ||
    Boolean(routeEditId);
  const [initialabsenceData, setInitialabsenceData] = useState<absence | null>(
    null,
  );
  const [loadedEditItem, setLoadedEditItem] = useState<absence | null>(null);
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
  const [absenceTime, setabsenceTime] = useState("");
  const [absenceStatus, setabsenceStatus] = useState("");
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
  const holidays = useHolidays(userId);
  const editItem = loadedEditItem ?? routeEditItem;
  const editId =
    getItemText(editItem, [
      "id",
      "absenceId",
      "ABSENCE_id",
      "requestId",
      "request_id",
    ]) || routeEditId;
  const backHref = isEditMode ? "/absence/pending" : "/absence";

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
    setWriteDate("");

    try {
      const data = await initabsenceData(userId, TYPE_ABSENCE_BUSINESS);
      setInitialabsenceData(data);
      setDeptId(getabsenceTextValue(data, ["deptId", "dept_id", "departmentId", "department_id"]));
      setStep(getabsenceTextValue(data, ["step"]));
      setabsenceStatus(getabsenceTextValue(data, ["absenceStatus", "ABSENCE_status", "status"]));
      setabsenceTime(getabsenceTextValue(data, ["absentTime", "absenceTime", "ABSENCE_time", "times", "time"]));
      setWriteDate(getabsenceTextValue(data, ["writeDate", "write_date"]));
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
          const previousData = await getabsenceData(routeEditId, TYPE_ABSENCE_BUSINESS);

          setLoadedEditItem(previousData);
          setInitialabsenceData((currentData) => ({
            ...(currentData ?? {}),
            ...previousData,
            approverList: currentData?.approverList ?? previousData.approverList,
            agentList: currentData?.agentList ?? previousData.agentList,
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
          label: getStaffLabel(item),
          value: getPositionId(item),
          staffId: getStaffId(item),
          photoId: getStaffPhotoId(item),
          position: getStaffPositionLabel(item),
          name: getStaffNameLabel(item),
        }))
        .filter((item) => item.label && item.value),
    [initialabsenceData],
  );
  // Map each agent display label to its photo id (uni_staff_id) and department
  // so the agent dropdown and chips can render the staff avatar + dept line.
  const agentPhotoByLabel = useMemo(() => {
    const map: Record<string, string> = {};
    getAgentList(initialabsenceData).forEach((item) => {
      const label = getStaffLabel(item);
      if (label) {
        map[label] = getStaffPhotoId(item);
      }
    });
    return map;
  }, [initialabsenceData]);
  const agentDeptByLabel = useMemo(() => {
    const map: Record<string, string> = {};
    getAgentList(initialabsenceData).forEach((item) => {
      const label = getStaffLabel(item);
      if (label) {
        map[label] = getStaffDept(item);
      }
    });
    return map;
  }, [initialabsenceData]);
  const agentOptions = useMemo(
    () =>
      uniqueValues(
        getAgentList(initialabsenceData)
          // The requester can't delegate to themselves — drop the auth user.
          // authUser.staffId may be either the internal staff_id or the
          // uni_staff_id, so match against both id fields on each agent.
          .filter((item) => !isAuthUser(item, userId))
          .map(getStaffLabel)
          .filter(Boolean),
      ),
    [initialabsenceData, userId],
  );
  const availableAgentOptions = useMemo(
    () => agentOptions.filter((option) => !selectedAgents.includes(option)),
    [agentOptions, selectedAgents],
  );
  const selectedAgentIds = useMemo(
    () =>
      selectedAgents
        .map((selectedAgent) => {
          const matchedAgent = getAgentList(initialabsenceData).find(
            (item) => getStaffLabel(item) === selectedAgent,
          );

          return getStaffId(matchedAgent ?? {}) || selectedAgent;
        })
        .filter(Boolean),
    [initialabsenceData, selectedAgents],
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
      getAgentSelectionLabels(nextSelectedAgents, getAgentList(initialabsenceData)),
    );
  }, [editId, editItem, initialabsenceData, isEditMode]);

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

    return getWeekdayLeaveDayCount(startDate, endDate, Number(halfDay) > 0, holidays.isHoliday);
  }, [dateError, endDate, halfDay, startDate, holidays.isHoliday]);

  const handleSubmit = useCallback(() => {
    if (isSubmitting || isRemoving) {
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

    if (!selectedAgents.length) {
      nextErrors.agent = TEXT.ABSENCE_VALIDATION_AGENT_REQUIRED;
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
          status: absenceStatus,
          times: absenceTime,
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
          ? await updateabsenceData(editId, payload, TYPE_ABSENCE_BUSINESS)
          : await addabsenceData(payload, TYPE_ABSENCE_BUSINESS);

      setToastType("success");
      setToastMessage(result.message || TEXT.ABSENCE_BUSINESS_SUBMIT_SUCCESS_MESSAGE);
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
    approver,
    approverStaffId,
    absenceStatus,
    absenceTime,
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
      const result = await removeData(editId, TYPE_ABSENCE_BUSINESS);
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
        <ScreenHeader title={TEXT.ABSENCE_BUSINESS_TITLE} backHref={backHref} showHomeButton={false} titleInNavBar tone="primary" />
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
        <ScreenHeader title={TEXT.ABSENCE_BUSINESS_TITLE} backHref={backHref} showHomeButton={false} titleInNavBar tone="primary" />
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
      <ScreenHeader title={TEXT.ABSENCE_BUSINESS_TITLE} backHref={backHref} showHomeButton={false} titleInNavBar tone="primary" />

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
              overline: option.position,
              label: option.name || option.label,
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
          <View style={styles.field}>
            <ThemedText style={styles.fieldLabel}>
              {TEXT.ABSENCE_LEAVE_DATE_LABEL}
            </ThemedText>
            <View style={styles.dateRow}>
              <DatePickerField
                label={TEXT.ABSENCE_START_DATE_LABEL}
                hideLabel
                value={startDate}
                minimumDate={minimumStartDate}
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

        {/* Agent */}
        <SectionCard>
          <AgentSelectField
            options={availableAgentOptions}
            selectedAgents={selectedAgents}
            photoIdForOption={(option) => agentPhotoByLabel[option]}
            subtitleForOption={(option) => agentDeptByLabel[option]}
            isOpen={openSelect === "agent"}
            hasError={Boolean(validationErrors.agent)}
            errorMessage={validationErrors.agent}
            onToggle={() =>
              setOpenSelect(openSelect === "agent" ? null : "agent")
            }
            onSelect={handleSelectAgent}
            onRemove={handleRemoveAgent}
          />
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
                {isEditMode ? TEXT.SHARED_UPDATE : TEXT.ABSENCE_SUBMIT_REQUEST}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
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
              {TEXT.ABSENCE_SUBMIT_REQUEST}
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
          <Pressable style={styles.modalContent}>
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
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },
  policyCard: {
    marginBottom: 14,
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
  wideSelectModal: {
    width: "95%",
    height: 520,
    maxHeight: "85%",
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
  searchInput: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.background,
    color: c.text,
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
    paddingHorizontal: 0,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  optionWithAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectedOption: {},
  optionText: {
    flex: 1,
    color: c.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: AppFonts.psuRegular,
  },
  selectedOptionText: {
    color: c.primary,
    fontFamily: AppFonts.psuBold,
  },
  optionActionText: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyOption: {
    color: c.textMuted,
    lineHeight: 20,
    paddingVertical: 16,
    textAlign: "center",
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
});
