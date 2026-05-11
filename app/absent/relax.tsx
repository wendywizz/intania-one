import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { DatePickerField } from '@/components/date-picker-field';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TYPE_ABSENT_RELAX } from '@/constants/absent-type';
import { AppFonts } from '@/constants/fonts';
import type { Absent } from '@/models/types';
import { initAbsentData } from '@/services/absentService';

type Approver = {
  staffId?: string;
  prefixNameTH?: string;
  firstNameTH?: string;
  lastNameTH?: string;
  positionName?: string;
};

type ValidationErrors = Partial<Record<'approver' | 'reason' | 'date' | 'contact', string>>;

function getApproverList(data: Absent | null): Approver[] {
  return Array.isArray(data?.approverList) ? (data.approverList as Approver[]) : [];
}

function getApproverLabel(approver: Approver) {
  const fullName = `${approver.firstNameTH ?? ''} ${approver.lastNameTH ?? ''}`.trim();
  const positionName = approver.positionName?.trim();

  if (positionName && fullName) {
    return `${positionName} (${fullName})`;
  }

  return positionName || fullName || approver.staffId || '';
}

const halfDayOptions = [
  'วันแรกครึ่งวันเช้า',
  'วันแรกครึ่งวันบ่าย',
  'วันสุดท้ายครึ่งวันเช้า',
  'วันแรกครึ่งวันบ่าย - วันสุดท้ายครึ่งวันเช้า',
];

type SelectFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  isOpen: boolean;
  hasError?: boolean;
  errorMessage?: string;
  onToggle: () => void;
  onSelect: (value: string) => void;
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
  return (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
        style={[styles.selectButton, hasError ? styles.inputError : undefined]}>
        <ThemedText style={[styles.selectText, !value && styles.placeholder]}>
          {value || placeholder}
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
                  <ThemedText type="defaultSemiBold">ปิด</ThemedText>
                </Pressable>
              </View>

              <ScrollView style={styles.optionScroll} contentContainerStyle={styles.optionScrollContent}>
                {options.length ? (
                  options.map((option) => (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      onPress={() => onSelect(option)}
                      style={[styles.option, value === option ? styles.selectedOption : undefined]}>
                      <ThemedText
                        lightColor={value === option ? '#FFFFFF' : undefined}
                        darkColor={value === option ? '#FFFFFF' : undefined}
                        style={styles.optionText}>
                        {option}
                      </ThemedText>
                    </Pressable>
                  ))
                ) : (
                  <ThemedText style={styles.emptyOption}>ไม่มีข้อมูล</ThemedText>
                )}
              </ScrollView>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getLeaveDayCount(startDate: Date, endDate: Date, hasHalfDay: boolean) {
  const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const oneDayMilliseconds = 1000 * 60 * 60 * 24;
  const fullDayCount = Math.floor((endDay.getTime() - startDay.getTime()) / oneDayMilliseconds) + 1;

  return fullDayCount + (hasHalfDay ? 0.5 : 0);
}

export default function RelaxScreen() {
  const [initialAbsentData, setInitialAbsentData] = useState<Absent | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState('');
  const [approver, setApprover] = useState('');
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [halfDay, setHalfDay] = useState('');
  const [contact, setContact] = useState('');
  const [openSelect, setOpenSelect] = useState<'approver' | 'halfDay' | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

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

    const result = await initAbsentData('0024028', TYPE_ABSENT_RELAX);

    if (!result.data || result.processType === 'error') {
      setInitialError(result.message || 'ไม่สามารถโหลดข้อมูลตั้งต้นได้');
      setIsInitialLoading(false);
      return;
    }

    setInitialAbsentData(result.data);
    setIsInitialLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadInitialAbsentData();
    }, [loadInitialAbsentData]),
  );

  const minimumEndDate = useMemo(
    () => (startDate ? addDays(startDate, 1) : undefined),
    [startDate],
  );
  const approverOptions = useMemo(
    () => getApproverList(initialAbsentData).map(getApproverLabel).filter(Boolean),
    [initialAbsentData],
  );
  const dateError =
    startDate && endDate && endDate <= startDate
      ? 'วันที่สิ้นสุดต้องมากกว่าวันที่เริ่มต้น'
      : '';
  const displayedDateError = dateError || validationErrors.date || '';
  const leaveDayCount = useMemo(() => {
    if (!startDate || !endDate || dateError) {
      return null;
    }

    return getLeaveDayCount(startDate, endDate, Boolean(halfDay));
  }, [dateError, endDate, halfDay, startDate]);

  const handleSubmit = useCallback(() => {
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

    if (Object.keys(nextErrors).length || dateError) {
      return;
    }
  }, [approver, contact, dateError, endDate, reason, startDate]);

  if (isInitialLoading) {
    return (
      <ThemedView style={styles.container}>
        <NavTopBar title="ลาพักผ่อน" backHref="/absent" />
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">กำลังโหลดข้อมูล</ThemedText>
          <ThemedText style={styles.stateMessage}>กรุณารอสักครู่</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (initialError) {
    return (
      <ThemedView style={styles.container}>
        <NavTopBar title="ลาพักผ่อน" backHref="/absent" />
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">เกิดข้อผิดพลาด</ThemedText>
          <ThemedText style={[styles.stateMessage, styles.errorText]}>{initialError}</ThemedText>
          <View style={styles.errorActions}>
            <Pressable accessibilityRole="button" onPress={loadInitialAbsentData} style={styles.secondaryButton}>
              <ThemedText type="defaultSemiBold">ลองใหม่</ThemedText>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/absent')} style={styles.submitButton}>
              <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                ย้อนกลับ
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title="ลาพักผ่อน" backHref="/absent" />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.panel} lightColor="#F3F8FB" darkColor="#1F2B30">
          <ThemedText type="subtitle">แบบฟอร์มลาพักผ่อน</ThemedText>
          {initialAbsentData ? (
            <ThemedText style={styles.initialStatus}>โหลดข้อมูลตั้งต้นเรียบร้อยแล้ว</ThemedText>
          ) : null}

          <View style={styles.form}>
            <SelectField
              label="ผู้อนุมัติ"
              placeholder="เลือกผู้อนุมัติ"
              value={approver}
              options={approverOptions}
              isOpen={openSelect === 'approver'}
              hasError={Boolean(validationErrors.approver)}
              errorMessage={validationErrors.approver}
              onToggle={() => setOpenSelect(openSelect === 'approver' ? null : 'approver')}
              onSelect={(value) => {
                setApprover(value);
                clearValidationError('approver');
                setOpenSelect(null);
              }}
            />

            <View style={styles.field}>
              <ThemedText type="defaultSemiBold">เหตุผล</ThemedText>
              <TextInput
                multiline
                numberOfLines={2}
                onChangeText={(value) => {
                  setReason(value);
                  if (value.trim()) {
                    clearValidationError('reason');
                  }
                }}
                placeholder="กรอกเหตุผล"
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
              <ThemedText type="defaultSemiBold">วันที่ลา</ThemedText>
              <View style={styles.dateRow}>
                <DatePickerField
                  label="วันที่เริ่มต้น"
                  value={startDate}
                  onChange={(date) => {
                    setStartDate(date);
                    if (endDate && endDate <= date) {
                      setEndDate(null);
                    } else if (endDate) {
                      clearValidationError('date');
                    }
                  }}
                  hasError={Boolean(displayedDateError)}
                />
                <DatePickerField
                  label="วันที่สิ้นสุด"
                  value={endDate}
                  minimumDate={minimumEndDate}
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
              {leaveDayCount ? (
                <ThemedText type="defaultSemiBold" style={styles.leaveDaySummary}>
                  จำนวนวันลา {leaveDayCount.toLocaleString('th-TH')} วัน
                </ThemedText>
              ) : null}
            </View>

            <SelectField
              label="ลาครึ่งวัน"
              placeholder="เลือกตัวเลือกลาครึ่งวัน"
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
              <ThemedText type="defaultSemiBold">ช่องทางติดต่อ</ThemedText>
              <TextInput
                onChangeText={(value) => {
                  setContact(value);
                  if (value.trim()) {
                    clearValidationError('contact');
                  }
                }}
                placeholder="กรอกช่องทางติดต่อ"
                placeholderTextColor="#8A969C"
                style={[styles.input, validationErrors.contact ? styles.inputError : undefined]}
                value={contact}
              />
              {validationErrors.contact ? (
                <ThemedText style={styles.fieldError}>{validationErrors.contact}</ThemedText>
              ) : null}
            </View>

            <Pressable accessibilityRole="button" onPress={handleSubmit} style={styles.submitButton}>
              <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                ส่งคำขอ
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
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
    padding: 20,
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
  submitButton: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0A6E8A',
    marginTop: 6,
  },
});
