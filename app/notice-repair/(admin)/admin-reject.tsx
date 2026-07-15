import { ConfirmModal } from '@/components/notice-repair/confirm-modal';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast-provider';
import { TEXT } from '@/constants/text';
import { useAuth } from '@/context/AuthContext';
import { adminRejectRepair } from '@/services/noticeRepairService';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

export default function NoticeRepairAdminRejectScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { repair_id, staff_id: paramStaff } = useLocalSearchParams<{ repair_id: string; staff_id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
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
      await adminRejectRepair(repair_id, staffId, trimmed);
      setConfirmOpen(false);
      showToast(TEXT.NOTICE_REPAIR_ACTION_SUCCESS, 'success');
      // Pop the reject screen + the detail to land back on the list,
      // which reloads on focus and drops the rejected job.
      if (router.canDismiss()) router.dismiss(2);
      else router.back();
    } catch (e) {
      setConfirmOpen(false);
      showToast(e instanceof Error ? e.message : TEXT.NOTICE_REPAIR_ACTION_FAILED, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [reason, submitting, repair_id, staffId, showToast]);

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.NOTICE_REPAIR_ACTION_ADMIN_REJECT} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ThemedText style={styles.label}>{TEXT.NOTICE_REPAIR_ACTION_ADMIN_REJECT_REASON_LABEL}</ThemedText>
          <TextInput
            value={reason}
            onChangeText={onChangeReason}
            placeholder={TEXT.NOTICE_REPAIR_ACTION_NOT_AGREE_REASON_PLACEHOLDER}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={2}
            style={[styles.input, showError && styles.inputError]}
            editable={!submitting}
          />
          {showError && (
            <ThemedText style={styles.errorText}>{TEXT.NOTICE_REPAIR_ACTION_REASON_REQUIRED}</ThemedText>
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
              : <ThemedText style={styles.submitBtnText}>{TEXT.NOTICE_REPAIR_ACTION_SUBMIT}</ThemedText>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={confirmOpen}
        title={TEXT.NOTICE_REPAIR_ACTION_ADMIN_REJECT}
        message={TEXT.NOTICE_REPAIR_ACTION_ADMIN_REJECT_CONFIRM}
        confirmLabel={TEXT.NOTICE_REPAIR_ACTION_ADMIN_REJECT}
        destructive
        loading={submitting}
        onConfirm={doSubmit}
        onCancel={() => { if (!submitting) setConfirmOpen(false); }}
      />
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: c.primary },
  input: {
    minHeight: 64,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 12,
    fontSize: 14,
    color: c.text,
    textAlignVertical: 'top',
    backgroundColor: c.surface,
  },
  inputError: { borderColor: c.danger, borderWidth: 1 },
  errorText: { fontSize: 13, color: c.danger },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.surface,
  },
  submitBtn: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.danger,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: c.textOnPrimary },
});
