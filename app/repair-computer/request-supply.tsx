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
import { requestSupply } from "@/services/repairComputerService";

export default function RequestSupplyScreen() {
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

  const [detail, setDetail] = useState("");
  const [validationError, setValidationError] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "">("");

  const handleBackPress = () => {
    if (jobId) {
      router.replace({
        pathname: "/repair-computer/worker-job-detail",
        params: { id: jobId, readonly: "true", backHref },
      } as Parameters<typeof router.replace>[0]);
      return;
    }

    router.replace(backHref as Parameters<typeof router.replace>[0]);
  };

  const handleOpenConfirm = () => {
    if (isSubmitting) {
      return;
    }

    setToastMessage("");
    setToastType("");

    if (!detail.trim()) {
      setValidationError("Supply request detail is required");
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!jobId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setToastMessage("");
    setToastType("");

    try {
      const result = await requestSupply(jobId, detail.trim());

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
            <ThemedText type="subtitle">Request Supply</ThemedText>
            <ThemedText style={styles.titleDescription}>
              Describe the parts or equipment you need. The request is sent to the
              foreman for approval.
            </ThemedText>
          </View>

          <TextField
            label="Supply request detail"
            required
            multiline
            numberOfLines={3}
            value={detail}
            onChangeText={(value) => {
              setDetail(value);
              if (validationError) {
                setValidationError("");
              }
            }}
            placeholder="Supply request detail"
            error={validationError}
          />
        </Card>
      </View>

      <FloatingActionBar disabled={isSubmitting}>
        <Button title="Submit" fullWidth onPress={handleOpenConfirm} />
      </FloatingActionBar>

      <ConfirmDialog
        visible={isConfirmOpen}
        title="Confirm Request Supply"
        message="Do you want to send this supply request to the foreman?"
        confirmLabel="Yes"
        cancelLabel="No"
        loading={isSubmitting}
        onConfirm={handleConfirm}
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
  },
  titleDescription: {
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
