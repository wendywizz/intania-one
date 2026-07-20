import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { type AppColors, useThemedStyles } from '@/constants/theme';

import { AppToast } from "@/components/app-toast";
import { FloatingActionBar } from "@/components/floating-action-bar";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button, Card, ConfirmDialog, TextField } from "@/components/ui";
import { TEXT } from "@/constants/text";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import { workerOperateJob } from "@/services/repairComputerService";

type ValidationErrors = Partial<Record<"jobAudit" | "solveMethod", string>>;

export default function OperateJobScreen() {
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
        <Card style={styles.panel}>
          <View style={styles.titleBlock}>
            <ThemedText type="subtitle">Operate Job</ThemedText>
            <ThemedText style={styles.titleDescription}>
              Record the problem you found and how you resolved it, then submit to
              start working on this job.
            </ThemedText>
          </View>

          <TextField
            label="Problem detail"
            required
            multiline
            numberOfLines={3}
            value={jobAudit}
            onChangeText={(value) => {
              setJobAudit(value);
              clearValidationError("jobAudit");
            }}
            placeholder="Problem detail"
            error={validationErrors.jobAudit}
          />

          <TextField
            label="Solve method"
            required
            multiline
            numberOfLines={3}
            value={solveMethod}
            onChangeText={(value) => {
              setSolveMethod(value);
              clearValidationError("solveMethod");
            }}
            placeholder="Solve method"
            error={validationErrors.solveMethod}
          />
        </Card>
      </View>

      <FloatingActionBar disabled={isSubmitting}>
        <Button title="Submit" fullWidth onPress={handleOpenConfirm} />
      </FloatingActionBar>

      <ConfirmDialog
        visible={isConfirmOpen}
        title="Confirm Operate Job"
        message="Do you want to submit this repair computer job operation?"
        confirmLabel="Yes"
        cancelLabel="No"
        loading={isSubmitting}
        onConfirm={handleSubmit}
        onCancel={() => setIsConfirmOpen(false)}
      />

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
    gap: 18,
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
});
