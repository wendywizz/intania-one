import { TEXT } from '@/constants/text';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppToast } from '@/components/app-toast';
import { DatePickerField } from '@/components/date-picker-field';
import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PROCESS } from '@/constants/domain';
import { AppFonts } from '@/constants/fonts';
import { TYPE_ABSENT_SICK } from '@/constants/type-absent';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import type { Absent } from '@/models/types';
import { addAbsentData, initAbsentData } from '@/services/absentService';

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

type ValidationErrors = Partial<Record<'approver' | 'reason' | 'date' | 'contact', string>>;

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
    typeof approverList === 'object' &&
    Array.isArray((approverList as { item?: unknown }).item)
  ) {
    return (approverList as { item: Approver[] }).item;
  }

  return [];
}

function getApproverLabel(approver: Approver) {
  const fullName = `${approver.firstNameTH ?? ''} ${approver.lastNameTH ?? ''}`.trim();
  const positionName = approver.positionName?.trim();

  if (positionName && fullName) {
    return `${positionName} (${fullName})`;
  }

  return positionName || fullName || approver.staffId || '';
}

function getApproverPositionId(approver: Approver) {
  return String(approver.positionId ?? approver.position_id ?? '').trim();
}

function getApproverStaffId(approver: Approver) {
  return String(approver.staffId ?? approver.staff_id ?? '').trim();
}

const halfDayOptions: string[] = [
  TEXT.ABSENT_HALF_DAY_FIRST_MORNING,
  TEXT.ABSENT_HALF_DAY_FIRST_AFTERNOON,
  TEXT.ABSENT_HALF_DAY_LAST_MORNING,
  TEXT.ABSENT_HALF_DAY_FIRST_AFTERNOON_LAST_MORNING,
];

const FILE_PICKER_LABEL = 'Medical certificate';
const FILE_PICKER_PLACEHOLDER = 'No image selected';
const FILE_PICKER_ACTION = 'Choose image';
const FILE_PICKER_REMOVE = 'Remove image';
const IMAGE_PICKER_PERMISSION_TITLE = 'Permission required';
const IMAGE_PICKER_PERMISSION_MESSAGE = 'Permission to access your photo library is required.';
const SUBMITTING_LABEL = 'Submitting...';
const SUBMIT_SUCCESS_MESSAGE = 'Sick leave request submitted successfully.';
const SUBMIT_ERROR_MESSAGE = 'Unable to submit sick leave request.';

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
    typeof option === 'string' ? { label: option, value: option } : option,
  );
  const selectedOption = normalizedOptions.find((option) => option.value === value);
  const displayValue = selectedOption?.label || value;

  return (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
        style={[styles.selectButton, hasError ? styles.inputError : undefined]}>
        <ThemedText style={[styles.selectText, !displayValue && styles.placeholder]}>
          {displayValue || placeholder}
        </ThemedText>
        <ThemedText style={styles.chevron}>⌄</ThemedText>
      </Pressable>
      {errorMessage ? <ThemedText style={styles.fieldError}>{errorMessage}</ThemedText> : null}

      <Modal transparent visible={isOpen} animationType="fade" onRequestClose={onToggle}>
        <Pressable style={styles.backdrop} onPress={onToggle}>
          <Pressable>
            <ThemedView style={styles.selectModal} lightColor="#FFFFFF" darkColor="#151718">
              <View style={styles.selectModalHeader}>
                <ThemedText type="defaultSemiBold" style={styles.selectModalTitle}>
                  {label}
                </ThemedText>
                <Pressable accessibilityRole="button" onPress={onToggle} style={styles.closeButton}>
                  <ThemedText type="defaultSemiBold">{TEXT.SHARED_CLOSE_THAI}</ThemedText>
                </Pressable>
              </View>

              <ScrollView style={styles.optionScroll} contentContainerStyle={styles.optionScrollContent}>
                {normalizedOptions.length ? (
                  normalizedOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      onPress={() => onSelect(option.value, option)}
                      style={[styles.option, value === option.value ? styles.selectedOption : undefined]}>
                      <ThemedText
                        lightColor={value === option.value ? '#FFFFFF' : undefined}
                        darkColor={value === option.value ? '#FFFFFF' : undefined}
                        style={styles.optionText}>
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  ))
                ) : (
                  <ThemedText style={styles.emptyOption}>{TEXT.SHARED_EMPTY_DATA}</ThemedText>
                )}
              </ScrollView>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getLeaveDayCount(startDate: Date, endDate: Date, hasHalfDay: boolean) {
  const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  let fullDayCount = 0;

  for (const currentDay = new Date(startDay); currentDay <= endDay; currentDay.setDate(currentDay.getDate() + 1)) {
    const dayOfWeek = currentDay.getDay();

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      fullDayCount += 1;
    }
  }

  return fullDayCount + (hasHalfDay ? 0.5 : 0);
}

function formatDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getHalfDayValue(selectedHalfDay: string) {
  return selectedHalfDay ? String(halfDayOptions.indexOf(selectedHalfDay) + 1) : '';
}

function getImageFileName(asset: ImagePicker.ImagePickerAsset) {
  return asset.fileName || `medical-certificate.${asset.mimeType?.split('/')[1] || 'jpg'}`;
}

function createUploadFile(asset: ImagePicker.ImagePickerAsset): UploadableFile {
  if (Platform.OS === 'web' && asset.file) {
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
  const [initialAbsentData, setInitialAbsentData] = useState<Absent | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState('');
  const [absentTime, setAbsentTime] = useState('');
  const [absentStatus, setAbsentStatus] = useState('');
  const [approver, setApprover] = useState('');
  const [approverStaffId, setApproverStaffId] = useState('');
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [halfDay, setHalfDay] = useState('');
  const [contact, setContact] = useState('');  
  const [selectedFile, setSelectedFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [openSelect, setOpenSelect] = useState<'approver' | 'halfDay' | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | ''>('');
  const userId = authUser?.staffId || USER_ID;
  const maximumStartDate = useMemo(() => startOfDay(new Date()), []);

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
    setInitialError('');
    setInitialAbsentData(null);

    const result = await initAbsentData(userId, TYPE_ABSENT_SICK);

    if (!result.data || result.processType === 'error') {
      setInitialError(result.message || TEXT.ABSENT_INIT_LOAD_ERROR_MESSAGE);
      setIsInitialLoading(false);
      return;
    }

    setInitialAbsentData(result.data);
    setIsInitialLoading(false);
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
          value: getApproverPositionId(item),
          staffId: getApproverStaffId(item),
        }))
        .filter((item) => item.label && item.value),
    [initialAbsentData],
  );
  const startDateError =
    startDate && startOfDay(startDate) > maximumStartDate
      ? 'วันที่เริ่มต้นต้องไม่เกินวันนี้'
      : '';
  const dateError =
    startDate && endDate && startOfDay(endDate) < startOfDay(startDate)
      ? 'วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น'
      : endDate && startOfDay(endDate) > maximumStartDate
        ? 'วันที่สิ้นสุดต้องไม่เกินวันนี้'
      : '';
  const displayedDateError = startDateError || dateError || validationErrors.date || '';
  const leaveDayCount = useMemo(() => {
    if (!startDate || !endDate || startDateError || dateError) {
      return null;
    }

    return getLeaveDayCount(startDate, endDate, Boolean(halfDay));
  }, [dateError, endDate, halfDay, startDate, startDateError]);

  const handlePickFile = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(IMAGE_PICKER_PERMISSION_TITLE, IMAGE_PICKER_PERMISSION_MESSAGE);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
      mediaTypes: ['images'],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedFile(result.assets[0] ?? null);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    const nextErrors: ValidationErrors = {};

    if (!approver) {
      nextErrors.approver = 'กรุณาเลือกผู้อนุมัติ';
    }

    if (!reason.trim()) {
      nextErrors.reason = 'กรุณากรอกเหตุผล';
    }

    if (!startDate || !endDate) {
      nextErrors.date = 'กรุณาเลือกวันที่ลา';
    }

    if (!contact.trim()) {
      nextErrors.contact = 'กรุณากรอกช่องทางติดต่อ';
    }

    setValidationErrors(nextErrors);

    if (Object.keys(nextErrors).length || startDateError || dateError) {
      return;
    }

    if (!startDate || !endDate) {
      return;
    }

    setIsSubmitting(true);
    setToastMessage('');
    setToastType('');

    const result = await addAbsentData(
      {
        absence: TYPE_ABSENT_SICK,
        time: absentTime,
        staff_id: userId,
        approver_position: approver,
        approver: approverStaffId,
        reason: reason.trim(),
        contact: contact.trim(),
        start_date: formatDateParam(startDate),
        end_date: formatDateParam(endDate),        
        num_days: leaveDayCount,
        startpart: getHalfDayValue(halfDay),
      },
      TYPE_ABSENT_SICK,
      selectedFile ? { fileUpload: createUploadFile(selectedFile) } : undefined,
    );

    setIsSubmitting(false);

    if (result.processType === PROCESS.success && result.success !== false) {
      setToastType('success');
      setToastMessage(result.message || SUBMIT_SUCCESS_MESSAGE);
      setTimeout(() => {
        router.replace('/absent');
      }, 900);
      return;
    }

    setToastType('error');
    setToastMessage(result.message || SUBMIT_ERROR_MESSAGE);
  }, [
    absentTime,
    absentStatus,
    approver,
    approverStaffId,
    contact,
    dateError,
    endDate,
    halfDay,
    isSubmitting,
    leaveDayCount,
    reason,
    selectedFile,
    startDate,
    startDateError,
    userId,
  ]);

  if (isInitialLoading) {
    return (
      <ThemedView style={styles.container}>
        <NavTopBar title={TEXT.ABSENT_SICK_TITLE} backHref="/absent" />
        <LoadingAnimate title={TEXT.SHARED_LOADING_DATA_TITLE} desc={TEXT.SHARED_LOADING_DESCRIPTION} />
      </ThemedView>
    );
  }

  if (initialError) {
    return (
      <ThemedView style={styles.container}>
        <NavTopBar title={TEXT.ABSENT_SICK_TITLE} backHref="/absent" />
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">{TEXT.SHARED_ERROR_TITLE_THAI}</ThemedText>
          <ThemedText style={[styles.stateMessage, styles.errorText]}>{initialError}</ThemedText>
          <View style={styles.errorActions}>
            <Pressable accessibilityRole="button" onPress={loadInitialAbsentData} style={styles.secondaryButton}>
              <ThemedText type="defaultSemiBold">{TEXT.SHARED_RETRY_THAI}</ThemedText>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/absent')} style={styles.submitButton}>
              <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                {TEXT.SHARED_BACK_THAI}</ThemedText>
            </Pressable>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.ABSENT_SICK_TITLE} backHref="/absent" />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.panel} lightColor="#FFFFFF" darkColor="#1F2B30">
          <ThemedText type="subtitle">{TEXT.ABSENT_SICK_FORM_TITLE}</ThemedText>
          {initialAbsentData ? (
            <ThemedText style={styles.initialStatus}>{TEXT.ABSENT_INITIAL_DATA_LOADED}</ThemedText>
          ) : null}

          <View style={styles.form}>
            <SelectField
              label={TEXT.ABSENT_APPROVER_LABEL}
              placeholder={TEXT.ABSENT_APPROVER_PLACEHOLDER}
              value={approver}
              options={approverOptions}
              isOpen={openSelect === 'approver'}
              hasError={Boolean(validationErrors.approver)}
              errorMessage={validationErrors.approver}
              onToggle={() => setOpenSelect(openSelect === 'approver' ? null : 'approver')}
              onSelect={(value, option) => {
                setApprover(value);
                setApproverStaffId(option?.staffId ?? '');
                clearValidationError('approver');
                setOpenSelect(null);
              }}
            />

            <View style={styles.field}>
              <ThemedText type="defaultSemiBold">{TEXT.ABSENT_REASON_LABEL}</ThemedText>
              <TextInput
                multiline
                numberOfLines={2}
                onChangeText={(value) => {
                  setReason(value);
                  if (value.trim()) {
                    clearValidationError('reason');
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
                <ThemedText style={styles.fieldError}>{validationErrors.reason}</ThemedText>
              ) : null}
            </View>

            <View style={styles.field}>
              <ThemedText type="defaultSemiBold">{TEXT.ABSENT_LEAVE_DATE_LABEL}</ThemedText>
              <View style={styles.dateRow}>
                <DatePickerField
                  label={TEXT.ABSENT_START_DATE_LABEL}
                  value={startDate}
                  maximumDate={maximumStartDate}
                  onChange={(date) => {
                    setStartDate(date);
                    if (
                      endDate &&
                      (startOfDay(endDate) < startOfDay(date) || startOfDay(endDate) > maximumStartDate)
                    ) {
                      setEndDate(null);
                    } else if (endDate) {
                      clearValidationError('date');
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
                      clearValidationError('date');
                    }
                  }}
                />
              </View>
              <ThemedText style={[styles.hint, displayedDateError ? styles.errorText : undefined]}>
                {displayedDateError || 'เลือกวันที่เริ่มต้นและวันที่สิ้นสุด'}
              </ThemedText>
              {leaveDayCount !== null ? (
                <ThemedText type="defaultSemiBold" style={styles.leaveDaySummary}>
                  {TEXT.ABSENT_LEAVE_DAY_COUNT_LABEL}{leaveDayCount.toLocaleString('th-TH')} {TEXT.ABSENT_DAY_UNIT}</ThemedText>
              ) : null}
            </View>

            <SelectField
              label={TEXT.ABSENT_HALF_DAY_LABEL}
              placeholder={TEXT.ABSENT_HALF_DAY_PLACEHOLDER}
              value={halfDay}
              options={halfDayOptions}
              isOpen={openSelect === 'halfDay'}
              onToggle={() => setOpenSelect(openSelect === 'halfDay' ? null : 'halfDay')}
              onSelect={(value) => {
                setHalfDay(value);
                setOpenSelect(null);
              }}
            />

            <View style={styles.field}>
              <ThemedText type="defaultSemiBold">{TEXT.ABSENT_CONTACT_CHANNEL_LABEL}</ThemedText>
              <TextInput
                onChangeText={(value) => {
                  setContact(value);
                  if (value.trim()) {
                    clearValidationError('contact');
                  }
                }}
                placeholder={TEXT.ABSENT_CONTACT_CHANNEL_PLACEHOLDER}
                placeholderTextColor="#8A969C"
                style={[styles.input, validationErrors.contact ? styles.inputError : undefined]}
                value={contact}
              />
              {validationErrors.contact ? (
                <ThemedText style={styles.fieldError}>{validationErrors.contact}</ThemedText>
              ) : null}
            </View>

            <View style={styles.field}>
              <ThemedText type="defaultSemiBold">{FILE_PICKER_LABEL}</ThemedText>
              <View style={styles.filePickerRow}>
                <Pressable accessibilityRole="button" onPress={handlePickFile} style={styles.filePickerButton}>
                  <ThemedText lightColor="#0A6E8A" darkColor="#0A6E8A" type="defaultSemiBold">
                    {FILE_PICKER_ACTION}
                  </ThemedText>
                </Pressable>
                {selectedFile ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSelectedFile(null)}
                    style={styles.removeFileButton}>
                    <ThemedText lightColor="#B42318" darkColor="#B42318" type="defaultSemiBold">
                      {FILE_PICKER_REMOVE}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
              <ThemedText style={[styles.fileName, !selectedFile ? styles.placeholder : undefined]}>
                {selectedFile ? getImageFileName(selectedFile) : FILE_PICKER_PLACEHOLDER}
              </ThemedText>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={handleSubmit}
              style={[styles.submitButton, isSubmitting ? styles.disabledButton : undefined]}>
              {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
              <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                {isSubmitting ? SUBMITTING_LABEL : TEXT.ABSENT_SUBMIT_REQUEST}</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </ScrollView>
      <AppToast message={toastMessage} type={toastType === 'error' ? 'error' : 'success'} />
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
    justifyContent: 'center',
    padding: 24,
  },
  stateMessage: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  panel: {
    borderRadius: 8,
    padding: 0,
  },
  initialStatus: {
    marginTop: 8,
    color: '#687076',
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
    borderColor: '#BFD2DA',
    backgroundColor: '#FFFFFF',
    color: '#11181C',
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: '#B42318',
  },
  textArea: {
    minHeight: 72,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  hint: {
    color: '#687076',
    fontSize: 12,
    lineHeight: 18,
  },
  leaveDaySummary: {
    color: '#0A6E8A',
  },
  errorText: {
    color: '#B42318',
  },
  fieldError: {
    color: '#B42318',
    fontSize: 12,
    lineHeight: 18,
  },
  selectButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#BFD2DA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  selectText: {
    flex: 1,
    color: '#11181C',
  },
  placeholder: {
    color: '#8A969C',
  },
  chevron: {
    color: '#0A6E8A',
    fontSize: 16,
    lineHeight: 20,
    marginLeft: 8,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: 24,
  },
  selectModal: {
    width: '100%',
    maxWidth: 420,
    maxHeight: 460,
    borderRadius: 8,
    padding: 16,
  },
  selectModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  selectModalTitle: {
    flex: 1,
    fontSize: 16,
  },
  closeButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#E4F0F6',
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
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedOption: {
    borderColor: '#0A6E8A',
    backgroundColor: '#0A6E8A',
  },
  optionText: {
    color: '#11181C',
    lineHeight: 20,
  },
  emptyOption: {
    color: '#687076',
    lineHeight: 20,
    paddingVertical: 16,
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#BFD2DA',
    backgroundColor: '#FFFFFF',
  },
  filePickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filePickerButton: {
    minHeight: 46,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#0A6E8A',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  removeFileButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F0B4AE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  fileName: {
    color: '#11181C',
    fontSize: 13,
    lineHeight: 18,
  },
  submitButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0A6E8A',
    marginTop: 6,
  },
  disabledButton: {
    opacity: 0.65,
  },
});
