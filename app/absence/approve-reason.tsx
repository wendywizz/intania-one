import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { AppToast } from "@/components/app-toast";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import { approveSaveData } from "@/services/absenceService";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default function ApproveReasonScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ detail?: string; status?: string }>();
  const detail = firstParam(params.detail);
  const status: "1" | "2" = firstParam(params.status) === "2" ? "2" : "1";
  const isApprove = status === "1";

  // Approve pre-fills "อนุมัติ"; reject starts empty so the approver must give a
  // reason. The field is required either way.
  const [reason, setReason] = useState(isApprove ? TEXT.ABSENCE_APPROVE_ACCEPT : "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "">("");

  // Validate first, then ask for confirmation before actually submitting.
  const handleSubmitPress = () => {
    if (isSubmitting) {
      return;
    }

    if (!reason.trim()) {
      setError(TEXT.ABSENCE_APPROVE_NOTE_REQUIRED);
      return;
    }

    setError("");
    setShowConfirm(true);
  };

  const submitDecision = async () => {
    setShowConfirm(false);
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setToastMessage("");
    setToastType("");

    try {
      const result = await approveSaveData(detail, status, reason.trim());
      setToastType("success");
      setToastMessage(result.message || TEXT.ABSENCE_APPROVE_SUBMIT_SUCCESS);
      setTimeout(() => {
        router.replace("/absence/pending");
      }, 1200);
    } catch (submitError) {
      setToastType("error");
      setToastMessage(
        submitError instanceof Error
          ? submitError.message
          : TEXT.ABSENCE_APPROVE_SUBMIT_ERROR,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.ABSENCE_TITLE}
        subtitle={isApprove ? TEXT.ABSENCE_APPROVE_ACCEPT : TEXT.ABSENCE_APPROVE_REJECT}
        moduleIcon="calendar-clock"
        backHref="/absence/pending"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <ThemedText style={styles.label}>{TEXT.ABSENCE_APPROVE_NOTE_LABEL}</ThemedText>
          <TextInput
            multiline
            numberOfLines={3}
            value={reason}
            onChangeText={(value) => {
              setReason(value);
              if (value.trim()) {
                setError("");
              }
            }}
            placeholder={TEXT.ABSENCE_APPROVE_NOTE_PLACEHOLDER}
            placeholderTextColor="#9CA3AF"
            style={[styles.textArea, error ? styles.inputError : undefined]}
            textAlignVertical="top"
          />
          {error ? <ThemedText style={styles.fieldError}>{error}</ThemedText> : null}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={handleSubmitPress}
          style={[
            styles.submitButton,
            isApprove ? styles.acceptButton : styles.rejectButton,
            isSubmitting ? styles.disabledButton : undefined,
          ]}
        >
          {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
          <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
            {TEXT.ABSENCE_APPROVE_SUBMIT}
          </ThemedText>
        </Pressable>
      </View>

      <Modal
        transparent
        visible={showConfirm}
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setShowConfirm(false)}>
          <Pressable>
            <ThemedView style={styles.confirmModal} lightColor="#FFFFFF" darkColor="#151718">
              <ThemedText type="subtitle">{TEXT.ABSENCE_APPROVE_CONFIRM_TITLE}</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                {TEXT.ABSENCE_APPROVE_CONFIRM_MESSAGE}
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowConfirm(false)}
                  style={styles.cancelButton}
                >
                  <ThemedText type="defaultSemiBold">{TEXT.CANCEL}</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={submitDecision}
                  style={[styles.confirmButton, isApprove ? styles.acceptButton : styles.rejectButton]}
                >
                  <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                    {TEXT.ABSENCE_APPROVE_CONFIRM_ACTION}
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>

      <AppToast message={toastMessage} type={toastType === "error" ? "error" : "success"} />
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 16,
    gap: 8,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: c.text,
  },
  textArea: {
    minHeight: 96,
    backgroundColor: c.surface,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    color: c.text,
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputError: {
    borderWidth: 1,
    borderColor: c.danger,
  },
  fieldError: {
    fontSize: 12,
    lineHeight: 17,
    color: c.danger,
  },
  bottomBar: {
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  submitButton: {
    minHeight: 52,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  acceptButton: {
    backgroundColor: c.success,
  },
  rejectButton: {
    backgroundColor: c.danger,
  },
  disabledButton: {
    opacity: 0.6,
  },
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17, 24, 28, 0.45)",
    padding: 24,
  },
  confirmModal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 12,
    padding: 18,
  },
  confirmMessage: {
    color: c.textMuted,
    lineHeight: 20,
    marginTop: 10,
  },
  confirmActions: {
    flexDirection: "row-reverse",
    gap: 12,
    marginTop: 18,
  },
  cancelButton: {
    minHeight: 46,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  confirmButton: {
    minHeight: 46,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
});
