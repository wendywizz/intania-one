import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppToast } from '@/components/app-toast';
import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PROCESS } from '@/constants/domain';
import { AppFonts } from '@/constants/fonts';
import type { RepairComputer } from '@/models/types';
import { getJobDetail, update } from '@/services/repairComputerService';

const detailFields = ['detail', 'description', 'repairDetail', 'repair_detail', 'problem'];
const supplyFields = ['supplyCode', 'supply_code', 'assetCode', 'asset_code', 'code'];
const phoneFields = ['phone', 'tel', 'telephone'];
const statusFields = ['status', 'state', 'statusId', 'status_id'];

function getJobText(job: RepairComputer, fields: string[]) {
  for (const field of fields) {
    const value = job[field];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number') {
      return String(value);
    }
  }

  return '';
}

export default function RepairComputerEditJobScreen() {
  const params = useLocalSearchParams<{ backHref?: string | string[]; id?: string | string[]; readonly?: string | string[] }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const readOnlyParam = Array.isArray(params.readonly) ? params.readonly[0] : params.readonly;
  const backHrefParam = Array.isArray(params.backHref) ? params.backHref[0] : params.backHref;
  const isReadOnly = readOnlyParam === 'true';
  const backHref = backHrefParam || '/repair-computer/current-job';
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState('');
  const [supplyCode, setSupplyCode] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | ''>('');

  const loadDetail = useCallback(async () => {
    if (!jobId) {
      setError('Unable to load job detail.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');
    setToastMessage('');
    setToastType('');

    const result = await getJobDetail(jobId);

    if (result.processType === PROCESS.error || !result.data) {
      setError(result.message || 'Unable to load job detail.');
      setIsLoading(false);
      return;
    }

    setDetail(getJobText(result.data, detailFields));
    setSupplyCode(getJobText(result.data, supplyFields));
    setPhone(getJobText(result.data, phoneFields));
    setStatus(getJobText(result.data, statusFields));
    setIsLoading(false);
  }, [jobId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleUpdate = async () => {
    if (!jobId || isUpdating) {
      return;
    }

    setIsUpdating(true);
    setToastMessage('');
    setToastType('');

    const result = await update('inform', jobId, {
      phone: phone.trim(),
      supply_code: supplyCode.trim(),
      detail: detail.trim(),
    });

    setIsUpdating(false);

    if (result.processType === PROCESS.success && result.success !== false) {
      setToastType('success');
      setToastMessage(result.message || 'Repair computer job updated successfully.');
      return;
    }

    setToastType('error');
    setToastMessage(result.message || 'Unable to update repair computer job.');
  };

  const renderContent = () => {
    if (isLoading) {
      return <LoadingAnimate title="Loading detail" desc="Please wait a moment" />;
    }

    if (error) {
      return (
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">Something went wrong</ThemedText>
          <ThemedText style={[styles.stateMessage, styles.errorText]}>{error}</ThemedText>
          <Pressable accessibilityRole="button" onPress={loadDetail} style={styles.retryButton}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              Retry
            </ThemedText>
          </Pressable>
        </View>
      );
    }

    const canUpdate = !isReadOnly && status === '0';

    return (
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">Detail</ThemedText>
          {isReadOnly ? (
            <ThemedText style={styles.readOnlyValue}>{detail || '-'}</ThemedText>
          ) : (
            <TextInput
              multiline
              numberOfLines={2}
              onChangeText={setDetail}
              placeholder="Detail"
              placeholderTextColor="#8A969C"
              style={[styles.input, styles.textArea]}
              textAlignVertical="top"
              value={detail}
            />
          )}
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">Supply Code</ThemedText>
          {isReadOnly ? (
            <ThemedText style={styles.readOnlyValue}>{supplyCode || '-'}</ThemedText>
          ) : (
            <TextInput
              onChangeText={setSupplyCode}
              placeholder="Supply Code"
              placeholderTextColor="#8A969C"
              style={styles.input}
              value={supplyCode}
            />
          )}
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">Phone</ThemedText>
          {isReadOnly ? (
            <ThemedText style={styles.readOnlyValue}>{phone || '-'}</ThemedText>
          ) : (
            <TextInput
              keyboardType="phone-pad"
              onChangeText={setPhone}
              placeholder="Phone"
              placeholderTextColor="#8A969C"
              style={styles.input}
              value={phone}
            />
          )}
        </View>

        {canUpdate ? (
          <Pressable
            accessibilityRole="button"
            disabled={isUpdating}
            onPress={handleUpdate}
            style={[styles.updateButton, isUpdating ? styles.disabledButton : undefined]}>
            {isUpdating ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              {isUpdating ? 'Updating...' : 'Update'}
            </ThemedText>
          </Pressable>
        ) : null}
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title="Repair Computer"
        backHref={backHref as Parameters<typeof NavTopBar>[0]['backHref']}
        showBackButton
      />

      <View style={styles.content}>
        <ThemedView style={styles.panel} lightColor="#F3F8FB" darkColor="#1F2B30">
          <ThemedText type="subtitle">{isReadOnly ? 'Job Detail' : 'Edit Job'}</ThemedText>
          {renderContent()}
        </ThemedView>
      </View>

      <AppToast message={toastMessage} type={toastType === 'error' ? 'error' : 'success'} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  panel: {
    flex: 1,
    borderRadius: 8,
    padding: 20,
  },
  form: {
    gap: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  field: {
    gap: 8,
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
  readOnlyValue: {
    minHeight: 34,
    color: '#11181C',
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 6,
  },
  stateContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  stateMessage: {
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  errorText: {
    color: '#B42318',
  },
  retryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0A6E8A',
    marginTop: 24,
  },
  updateButton: {
    minHeight: 48,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0A6E8A',
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.65,
  },
});
