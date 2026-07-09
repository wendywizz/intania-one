import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

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
  const params = useLocalSearchParams<{ detail?: string; status?: string }>();
  const detail = firstParam(params.detail);
  const status: "1" | "2" = firstParam(params.status) === "2" ? "2" : "1";
  const isApprove = status === "1";

  // Approve pre-fills "อนุมัติ"; reject starts empty so the approver must give a
  // reason. The field is required either way.
  const [reason, setReason] = useState(isApprove ? TEXT.ABSENCE_APPROVE_ACCEPT : "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "">("");

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (!reason.trim()) {
      setError(TEXT.ABSENCE_APPROVE_NOTE_REQUIRED);
      return;
    }

    setError("");
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
          onPress={handleSubmit}
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

      <AppToast message={toastMessage} type={toastType === "error" ? "error" : "success"} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FD",
  },
  scrollContent: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E8ECF0",
    padding: 16,
    gap: 8,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#000000",
  },
  textArea: {
    minHeight: 96,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#BFD2DA",
    color: "#191C1F",
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputError: {
    borderWidth: 1,
    borderColor: "#B42318",
  },
  fieldError: {
    fontSize: 12,
    lineHeight: 17,
    color: "#B42318",
  },
  bottomBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E8ECF0",
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
    backgroundColor: "#12805C",
  },
  rejectButton: {
    backgroundColor: "#B42318",
  },
  disabledButton: {
    opacity: 0.6,
  },
});
