import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { AppToast } from "@/components/app-toast";
import { FloatingActionBar } from "@/components/floating-action-bar";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import { workerOperateJob } from "@/services/repairComputerService";

type ValidationErrors = Partial<Record<"jobAudit" | "solveMethod", string>>;

export default function OperateJobScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{
    id?: string | string[];
    backHref?: string | string[];
  }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const backHrefParam = Array.isArray(params.backHref)
    ? params.backHref[0]
    : params.backHref;
  const backHref = backHrefParam || "/repair-computer/worker-current-job";
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;
  const [jobAudit, setJobAudit] = useState("");
  const [solveMethod, setSolveMethod] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "">("");

  const handleBackPress = () => {
    if (jobId) {
      router.replace({
        pathname: "/repair-computer/worker-job-detail",
        params: {
          id: jobId,
          readonly: "true",
          backHref,
        },
      } as Parameters<typeof router.replace>[0]);
      return;
    }

    router.replace(backHref as Parameters<typeof router.replace>[0]);
  };

  const clearValidationError = (field: keyof ValidationErrors) => {
    setValidationErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const validateForm = () => {
    const nextErrors: ValidationErrors = {};

    if (!jobAudit.trim()) {
      nextErrors.jobAudit = "Problem detail is required";
    }

    if (!solveMethod.trim()) {
      nextErrors.solveMethod = "Solve method is required";
    }

    setValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleOpenConfirm = () => {
    setToastMessage("");
    setToastType("");

    if (validateForm()) {
      setIsConfirmOpen(true);
    }
  };

  const handleSubmit = async () => {
    if (!jobId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setToastMessage("");
    setToastType("");

    try {
      const result = await workerOperateJob(
        jobId,
        jobAudit.trim(),
        solveMethod.trim(),
        staffId,
      );

      setToastType("success");
      setToastMessage(
        result.message || TEXT.REPAIR_COMPUTER_JOB_UPDATED_SUCCESS_MESSAGE,
      );
      setTimeout(() => {
        router.replace(backHref as Parameters<typeof router.replace>[0]);
      }, 1500);
    } catch (error) {
      setToastType("error");
      setToastMessage(
        error instanceof Error
          ? error.message
          : TEXT.REPAIR_COMPUTER_UNABLE_TO_UPDATE_JOB,
      );
    } finally {
      setIsSubmitting(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.REPAIR_COMPUTER_TITLE}
        onBackPress={handleBackPress}
        showBackButton
      />

      <View style={styles.content}>
        <ThemedView
          style={styles.panel}
          lightColor="#FFFFFF"
          darkColor="#1F2B30"
        >
          <View style={styles.titleBlock}>
            <ThemedText type="subtitle">Operate Job</ThemedText>
            <ThemedText style={styles.titleDescription}>
              Record the problem you found and how you resolved it, then submit to
              start working on this job.
            </ThemedText>
          </View>

          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Problem detail</ThemedText>
            <TextInput
              multiline
              numberOfLines={3}
              onChangeText={(value) => {
                setJobAudit(value);
                clearValidationError("jobAudit");
              }}
              placeholder="Problem detail"
              placeholderTextColor="#8A969C"
              style={[
                styles.textArea,
                validationErrors.jobAudit ? styles.inputError : undefined,
              ]}
              textAlignVertical="top"
              value={jobAudit}
            />
            {validationErrors.jobAudit ? (
              <ThemedText style={styles.fieldError}>
                {validationErrors.jobAudit}
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Solve method</ThemedText>
            <TextInput
              multiline
              numberOfLines={3}
              onChangeText={(value) => {
                setSolveMethod(value);
                clearValidationError("solveMethod");
              }}
              placeholder="Solve method"
              placeholderTextColor="#8A969C"
              style={[
                styles.textArea,
                validationErrors.solveMethod ? styles.inputError : undefined,
              ]}
              textAlignVertical="top"
              value={solveMethod}
            />
            {validationErrors.solveMethod ? (
              <ThemedText style={styles.fieldError}>
                {validationErrors.solveMethod}
              </ThemedText>
            ) : null}
          </View>
        </ThemedView>
      </View>

      <FloatingActionBar disabled={isSubmitting}>
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={handleOpenConfirm}
          style={[
            styles.submitButton,
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
            Submit
          </ThemedText>
        </Pressable>
      </FloatingActionBar>

      <Modal
        transparent
        visible={isConfirmOpen}
        animationType="fade"
        onRequestClose={() => setIsConfirmOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setIsConfirmOpen(false)}
        >
          <Pressable>
            <ThemedView
              style={styles.confirmModal}
              lightColor="#FFFFFF"
              darkColor="#151718"
            >
              <ThemedText type="subtitle">Confirm Operate Job</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                Do you want to submit this repair computer job operation?
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => setIsConfirmOpen(false)}
                  style={styles.cancelButton}
                >
                  <ThemedText type="defaultSemiBold">No</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={handleSubmit}
                  style={[
                    styles.confirmButton,
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
                    Yes
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
  content: {
    flex: 1,
    padding: 16,
  },
  panel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    gap: 18,
    padding: 16,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  titleBlock: {
    gap: 10,
    marginBottom: 10,
  },
  titleDescription: {
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  field: {
    gap: 8,
  },
  textArea: {
    minHeight: 96,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.surface,
    color: c.text,
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputError: {
    borderColor: c.primary,
  },
  fieldError: {
    color: c.primary,
    fontSize: 13,
    lineHeight: 18,
  },
  submitButton: {
    minHeight: 48,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.primary,
    paddingHorizontal: 18,
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
    borderRadius: 8,
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
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.primary,
  },
  disabledButton: {
    opacity: 0.65,
  },
});
