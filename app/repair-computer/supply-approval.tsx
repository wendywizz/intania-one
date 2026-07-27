import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { type AppColors, useThemedStyles } from '@/constants/theme';

import { AppToast } from "@/components/app-toast";
import { SubmittingOverlay } from "@/components/submitting-overlay";
import { FloatingActionBar } from "@/components/floating-action-bar";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button, Card, ConfirmDialog, TextField } from "@/components/ui";
import { TEXT } from "@/constants/text";
import {
    foremanApproveSupply,
    foremanUnapproveSupply,
} from "@/services/repairComputerService";

const APPROVE_DEFAULT_DETAIL = "อนุมัติการเบิก/ซื้อครุภัณฑ์/ส่งซ่อม";
const REJECT_DEFAULT_DETAIL = "ไม่อนุมัติการเบิก/ซื้อครุภัณฑ์";

export default function SupplyApprovalScreen() {
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{
    id?: string | string[];
    action?: string | string[];
    backHref?: string | string[];
  }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const actionParam = Array.isArray(params.action)
    ? params.action[0]
    : params.action;
  const isReject = actionParam === "reject";
  const backHrefParam = Array.isArray(params.backHref)
    ? params.backHref[0]
    : params.backHref;
  const backHref = backHrefParam || "/repair-computer/manage-job";

  const [detail, setDetail] = useState(
    isReject ? REJECT_DEFAULT_DETAIL : APPROVE_DEFAULT_DETAIL,
  );
  const [validationError, setValidationError] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "">("");

  const handleBackPress = () => {
    if (jobId) {
      router.replace({
        pathname: "/repair-computer/foreman-job-detail",
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
      setValidationError("Reason is required");
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
      const result = isReject
        ? await foremanUnapproveSupply(jobId, detail.trim())
        : await foremanApproveSupply(jobId, detail.trim());

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
        tone="primary"
      />

      <View style={styles.content}>
        <Card style={styles.panel}>
          <View style={styles.titleBlock}>
            <ThemedText type="subtitle">
              {isReject ? "Reject Supply Request" : "Approve Supply Request"}
            </ThemedText>
            <ThemedText style={styles.titleDescription}>
              {isReject
                ? TEXT.REPAIR_COMPUTER_REJECT_SUPPLY_HINT
                : TEXT.REPAIR_COMPUTER_APPROVE_SUPPLY_HINT}
            </ThemedText>
          </View>

          <TextField
            label={TEXT.REPAIR_COMPUTER_REASON}
            required
            multiline
            numberOfLines={2}
            style={{ minHeight: 60 }}
            value={detail}
            onChangeText={(value) => {
              setDetail(value);
              if (validationError) {
                setValidationError("");
              }
            }}
            placeholder={TEXT.REPAIR_COMPUTER_REASON}
            error={validationError}
          />
        </Card>
      </View>

      <FloatingActionBar disabled={isSubmitting}>
        <Button
          title={TEXT.REPAIR_COMPUTER_SUBMIT}
          variant={isReject ? "danger" : "primary"}
          fullWidth
          onPress={handleOpenConfirm}
        />
      </FloatingActionBar>

      <ConfirmDialog
        visible={isConfirmOpen}
        title={isReject ? TEXT.REPAIR_COMPUTER_REJECT_SUPPLY_CONFIRM_TITLE : TEXT.REPAIR_COMPUTER_APPROVE_SUPPLY_CONFIRM_TITLE}
        message={
          isReject
            ? TEXT.REPAIR_COMPUTER_REJECT_SUPPLY_CONFIRM_MESSAGE
            : TEXT.REPAIR_COMPUTER_APPROVE_SUPPLY_CONFIRM_MESSAGE
        }
        confirmLabel={TEXT.SHARED_YES}
        cancelLabel={TEXT.SHARED_NO}
        destructive={isReject}
        loading={isSubmitting}
        onConfirm={handleConfirm}
        onCancel={() => setIsConfirmOpen(false)}
      />

      <AppToast
        message={toastMessage}
        type={toastType === "error" ? "error" : "success"}
      />
      <SubmittingOverlay visible={isSubmitting} />
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
