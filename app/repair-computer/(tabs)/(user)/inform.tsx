import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { TEXT } from '@/constants/text';

import { AppToast } from '@/components/app-toast';
import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PROCESS } from '@/constants/domain';
import { AppFonts } from '@/constants/fonts';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import { addRepairComputerJob, checkCanInform } from '@/services/repairComputerService';
import type { Result } from '@/models/types';

type ValidationErrors = Partial<Record<'detail' | 'phone', string>>;

function getCanInform(result: Result) {
  if (result.processType !== PROCESS.success) {
    return false;
  }

  if (typeof result.success === 'boolean') {
    return result.success;
  }

  if (typeof result.data === 'boolean') {
    return result.data;
  }

  if (result.data && typeof result.data === 'object') {
    const data = result.data as Record<string, unknown>;
    const canInform = data.canInform ?? data.can_inform ?? data.can;

    if (typeof canInform === 'boolean') {
      return canInform;
    }
  }

  return true;
}

export default function RepairComputerInformScreen() {
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;
  const [detail, setDetail] = useState('');
  const [supplyCode, setSupplyCode] = useState('');
  const [phone, setPhone] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | ''>('');
  const [isCheckingCanInform, setIsCheckingCanInform] = useState(true);
  const [canInform, setCanInform] = useState(false);
  const [canInformMessage, setCanInformMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadCanInform() {
        setIsCheckingCanInform(true);
        setToastMessage('');
        setToastType('');

        const result = await checkCanInform(staffId);

        if (!isActive) {
          return;
        }

        const isAllowed = getCanInform(result);
        setCanInform(isAllowed);
        setCanInformMessage(
          isAllowed
            ? ''
            : result.message || 'You still have a repair computer job remain.',
        );
        setIsCheckingCanInform(false);
      }

      loadCanInform();

      return () => {
        isActive = false;
      };
    }, [staffId]),
  );

  const clearValidationError = (field: keyof ValidationErrors) => {
    setValidationErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    const nextErrors: ValidationErrors = {};

    if (!detail.trim()) {
      nextErrors.detail = 'Detail is required';
    }

    if (!phone.trim()) {
      nextErrors.phone = 'Phone is required';
    }

    setValidationErrors(nextErrors);
    setToastMessage('');
    setToastType('');

    if (Object.keys(nextErrors).length) {
      return;
    }

    setIsSubmitting(true);

    const result = await addRepairComputerJob({
      staff_id: staffId,
      phone: phone.trim(),
      supply_code: supplyCode.trim(),
      detail: detail.trim(),
    });

    setIsSubmitting(false);

    if (result.processType === PROCESS.success && result.success !== false) {
      setToastType('success');
      setToastMessage(result.message || TEXT.REPAIR_COMPUTER_REQUEST_SUBMITTED_SUCCESS_MESSAGE);
      setDetail('');
      setSupplyCode('');
      setPhone('');
      setTimeout(() => {
        router.replace('/repair-computer/current-job');
      }, 1200);
      return;
    }

    setToastType('error');
    setToastMessage(result.message || TEXT.REPAIR_COMPUTER_UNABLE_TO_SUBMIT_REQUEST);
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.REPAIR_COMPUTER_TITLE} backHref="/repair-computer/current-job" />

      {isCheckingCanInform ? (
        <LoadingAnimate title={TEXT.REPAIR_COMPUTER_CHECKING_REQUEST} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
      ) : canInform ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="subtitle">{TEXT.REPAIR_COMPUTER_INFORM}</ThemedText>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">{TEXT.REPAIR_COMPUTER_DETAIL}</ThemedText>
          <TextInput
            multiline
            numberOfLines={2}
            onChangeText={(value) => {
              setDetail(value);
              clearValidationError('detail');
            }}
            placeholder={TEXT.REPAIR_COMPUTER_DETAIL}
            placeholderTextColor="#8A969C"
            style={[styles.input, styles.textArea, validationErrors.detail ? styles.inputError : undefined]}
            textAlignVertical="top"
            value={detail}
          />
          {validationErrors.detail ? <ThemedText style={styles.fieldError}>{validationErrors.detail}</ThemedText> : null}
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">{TEXT.REPAIR_COMPUTER_SUPPLY_CODE}</ThemedText>
          <TextInput
            onChangeText={setSupplyCode}
            placeholder={TEXT.REPAIR_COMPUTER_SUPPLY_CODE}
            placeholderTextColor="#8A969C"
            style={styles.input}
            value={supplyCode}
          />
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">{TEXT.REPAIR_COMPUTER_PHONE}</ThemedText>
          <TextInput
            keyboardType="phone-pad"
            onChangeText={(value) => {
              setPhone(value);
              clearValidationError('phone');
            }}
            placeholder={TEXT.REPAIR_COMPUTER_PHONE}
            placeholderTextColor="#8A969C"
            style={[styles.input, validationErrors.phone ? styles.inputError : undefined]}
            value={phone}
          />
          {validationErrors.phone ? <ThemedText style={styles.fieldError}>{validationErrors.phone}</ThemedText> : null}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={handleSubmit}
          style={[styles.submitButton, isSubmitting ? styles.disabledButton : undefined]}>
          {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
          <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </ThemedText>
        </Pressable>
        </ScrollView>
      ) : (
        <View style={styles.content}>
          <ThemedView style={styles.messagePanel} lightColor="#FFFFFF" darkColor="#1F2B30">
            <ThemedText type="subtitle">{TEXT.REPAIR_COMPUTER_CANNOT_INFORM_JOB}</ThemedText>
            <ThemedText style={styles.messageText}>
              {canInformMessage || 'You still have a repair computer job remain.'}
            </ThemedText>
          </ThemedView>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/repair-computer/current-job')}
            style={styles.secondaryButton}>
            <ThemedText lightColor="#0A6E8A" darkColor="#0A6E8A" type="defaultSemiBold">
              {TEXT.REPAIR_COMPUTER_BACK_TO_CURRENT_JOB}</ThemedText>
          </Pressable>
        </View>
      )}

      <AppToast message={toastMessage} type={toastType === 'error' ? 'error' : 'success'} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: 18,
    padding: 16,
  },
  field: {
    gap: 8,
  },
  messagePanel: {
    borderRadius: 8,
    padding: 16,
  },
  messageText: {
    color: '#687076',
    lineHeight: 20,
    marginTop: 10,
  },
  input: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#BFD2DA',
    backgroundColor: '#FFFFFF',
    color: '#11181C',
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 76,
  },
  inputError: {
    borderColor: '#C44D58',
  },
  fieldError: {
    color: '#C44D58',
    fontSize: 13,
    lineHeight: 18,
  },
  submitButton: {
    minHeight: 48,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0A6E8A',
    paddingHorizontal: 18,
  },
  disabledButton: {
    opacity: 0.65,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#0A6E8A',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
  },
});
