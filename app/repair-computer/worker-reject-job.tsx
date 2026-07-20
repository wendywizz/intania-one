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
import { acceptRejectedFromWorker } from "@/services/repairComputerService";

const DEFAULT_REJECT_REASON = "Reject job";

export default function WorkerRejectJobScreen() {
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [reason, setReason] = useState(DEFAULT_REJECT_REASON);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "">("");

  const handleBackPress = () => {
    if (jobId) {
      router.replace({
        pathname: "/repair-computer/edit-job",
        params: {
          id: jobId,
          readonly: "true",
          backHref: "/repair-computer/worker-new-job",
        },
      } as Parameters<typeof router.replace>[0]);
      return;
    }

    router.replace("/repair-computer/worker-new-job");
  };

  const handleSubmit = async () => {
    if (!jobId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setToastMessage("");
    setToastType("");

    try {
      const result = await acceptRejectedFromWorker(jobId);

      setToastType("success");
      setToastMessage(
        result.message || TEXT.REPAIR_COMPUTER_JOB_UPDATED_SUCCESS_MESSAGE,
      );
      setTimeout(() => {
        router.replace("/repair-computer/worker-new-job");
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
          <ThemedText type="subtitle">Reject Reason</ThemedText>
          <TextField
            label={TEXT.REPAIR_COMPUTER_REJECT_DETAIL_LABEL}
            multiline
            numberOfLines={2}
            value={reason}
            onChangeText={setReason}
            placeholder={TEXT.REPAIR_COMPUTER_REJECT_DETAIL_LABEL}
          />
        </Card>
      </View>

      <FloatingActionBar disabled={isSubmitting}>
        <Button
          title="Confirm"
          variant="danger"
          fullWidth
          onPress={() => setIsConfirmOpen(true)}
        />
      </FloatingActionBar>

      <ConfirmDialog
        visible={isConfirmOpen}
        title="Confirm Reject"
        message="Do you want to reject this repair computer job?"
        confirmLabel="Yes"
        cancelLabel="No"
        destructive
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
});
