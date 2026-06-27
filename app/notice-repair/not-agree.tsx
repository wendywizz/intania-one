import { ConfirmModal } from '@/components/notice-repair/confirm-modal';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';
import { useAuth } from '@/context/AuthContext';
import { notAgreeRepair } from '@/services/noticeRepairService';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';

export default function NoticeRepairNotAgreeScreen() {
  const { repair_id, staff_id: paramStaff } = useLocalSearchParams<{ repair_id: string; staff_id: string }>();
  const { user } = useAuth();
  const staffId = paramStaff ?? user?.staffId ?? '';

  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showError, setShowError] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const onChangeReason = useCallback((text: string) => {
    setReason(text);
    if (showError && text.trim()) setShowError(false);
  }, [showError]);

  // Validate first, then ask for confirmation before sending.
  const onPressSubmit = useCallback(() => {
    if (!reason.trim()) {
      setShowError(true);
      return;
    }
    setConfirmOpen(true);
  }, [reason]);

  const doSubmit = useCallback(async () => {
    const trimmed = reason.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await notAgreeRepair(repair_id, staffId, trimmed);
      setConfirmOpen(false);
      Alert.alert(TEXT.PR_ACTION_SUCCESS, undefined, [
        {
          text: TEXT.PR_ACTION_CONFIRM,
          onPress: () => {
            // Pop the not-agree screen + the detail to land back on the list,
            // which reloads on focus and drops the rejected job.
            if (router.canDismiss()) router.dismiss(2);
            else router.back();
          },
        },
      ]);
    } catch (e) {
      setConfirmOpen(false);
      Alert.alert(TEXT.PR_ACTION_FAILED, e instanceof Error ? e.message : undefined);
    } finally {
      setSubmitting(false);
    }
  }, [reason, submitting, repair_id, staffId]);

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.PR_ACTION_NOT_AGREE} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ThemedText style={styles.label}>{TEXT.PR_ACTION_NOT_AGREE_REASON_LABEL}</ThemedText>
          <TextInput
            value={reason}
            onChangeText={onChangeReason}
            placeholder={TEXT.PR_ACTION_NOT_AGREE_REASON_PLACEHOLDER}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={2}
            style={[styles.input, showError && styles.inputError]}
            editable={!submitting}
          />
          {showError && (
            <ThemedText style={styles.errorText}>{TEXT.PR_ACTION_REASON_REQUIRED}</ThemedText>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={onPressSubmit}
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}>
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <ThemedText style={styles.submitBtnText}>{TEXT.PR_ACTION_SUBMIT}</ThemedText>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={confirmOpen}
        title={TEXT.PR_ACTION_NOT_AGREE}
        message={TEXT.PR_ACTION_NOT_AGREE_CONFIRM}
        confirmLabel={TEXT.PR_ACTION_NOT_AGREE}
        destructive
        loading={submitting}
        onConfirm={doSubmit}
        onCancel={() => { if (!submitting) setConfirmOpen(false); }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: '#922124' },
  input: {
    minHeight: 64,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
    padding: 12,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  inputError: { borderColor: '#DC2626', borderWidth: 1 },
  errorText: { fontSize: 13, color: '#DC2626' },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  submitBtn: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
