import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

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
      setToastMessage(result.message || 'Repair computer request submitted successfully.');
      setDetail('');
      setSupplyCode('');
      setPhone('');
      setTimeout(() => {
        router.replace('/repair-computer/current-job');
      }, 1200);
      return;
    }

    setToastType('error');
    setToastMessage(result.message || 'Unable to submit repair computer request.');
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title="Repair Computer" backHref="/repair-computer/current-job" />

      {isCheckingCanInform ? (
        <LoadingAnimate title="Checking request" desc="Please wait a moment" />
      ) : canInform ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="subtitle">Inform</ThemedText>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">Detail</ThemedText>
          <TextInput
            multiline
            numberOfLines={2}
            onChangeText={(value) => {
              setDetail(value);
              clearValidationError('detail');
            }}
            placeholder="Detail"
            placeholderTextColor="#8A969C"
            style={[styles.input, styles.textArea, validationErrors.detail ? styles.inputError : undefined]}
            textAlignVertical="top"
            value={detail}
          />
          {validationErrors.detail ? <ThemedText style={styles.fieldError}>{validationErrors.detail}</ThemedText> : null}
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">Supply Code</ThemedText>
          <TextInput
            onChangeText={setSupplyCode}
            placeholder="Supply Code"
            placeholderTextColor="#8A969C"
            style={styles.input}
            value={supplyCode}
          />
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">Phone</ThemedText>
          <TextInput
            keyboardType="phone-pad"
            onChangeText={(value) => {
              setPhone(value);
              clearValidationError('phone');
            }}
            placeholder="Phone"
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
          <ThemedView style={styles.messagePanel} lightColor="#F3F8FB" darkColor="#1F2B30">
            <ThemedText type="subtitle">Cannot inform job</ThemedText>
            <ThemedText style={styles.messageText}>
              {canInformMessage || 'You still have a repair computer job remain.'}
            </ThemedText>
          </ThemedView>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/repair-computer/current-job')}
            style={styles.secondaryButton}>
            <ThemedText lightColor="#0A6E8A" darkColor="#0A6E8A" type="defaultSemiBold">
              Back to Current Job
            </ThemedText>
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
    padding: 24,
  },
  field: {
    gap: 8,
  },
  messagePanel: {
    borderRadius: 8,
    padding: 20,
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
