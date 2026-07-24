import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { AppToast } from "@/components/app-toast";
import { SubmittingOverlay } from "@/components/submitting-overlay";
import { FloatingActionBar } from "@/components/floating-action-bar";
import { NavTopBar } from "@/components/nav-top-bar";
import { SectionCard } from "@/components/section-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button, ConfirmDialog } from "@/components/ui";
import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import { foremanRejectJob } from "@/services/repairComputerService";

// Remove the default focus outline on web so active inputs match the
// borderless underline style (RN Web only; no-op on native).
const webNoOutline: any = Platform.OS === "web" ? { outlineStyle: "none" } : null;

export default function RejectJobScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{
    backHref?: string | string[];
    id?: string | string[];
  }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const backHrefParam = Array.isArray(params.backHref)
    ? params.backHref[0]
    : params.backHref;
  const backHref = backHrefParam || "/repair-computer/foreman-new-job";
  const [rejectDetail, setRejectDetail] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "">("");

  const handleBackPress = () => {
    if (backHref === "/repair-computer/foreman-job-detail" && jobId) {
      router.replace({
        pathname: "/repair-computer/foreman-job-detail",
        params: {
          id: jobId,
          backHref: "/repair-computer/foreman-new-job",
        },
      } as Parameters<typeof router.replace>[0]);
      return;
    }

    router.replace(backHref as Parameters<typeof router.replace>[0]);
  };

  const handleConfirmPress = () => {
    if (!rejectDetail.trim()) {
      setRejectError(TEXT.REPAIR_COMPUTER_REJECT_REASON_REQUIRED);
      return;
    }
    setRejectError("");
    setIsConfirmOpen(true);
  };

  const handleReject = async () => {
    if (!jobId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setToastMessage("");
    setToastType("");

    try {
      const result = await foremanRejectJob(jobId);

      setToastType("success");
      setToastMessage(
        result.message || TEXT.REPAIR_COMPUTER_JOB_UPDATED_SUCCESS_MESSAGE,
      );
      setTimeout(() => {
        router.replace("/repair-computer/foreman-new-job");
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
        title={jobId ? `${TEXT.REPAIR_COMPUTER_JOB_NO_PREFIX}${jobId}` : TEXT.REPAIR_COMPUTER_TITLE}
        onBackPress={handleBackPress}
        showBackButton
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <SectionCard>
          <View style={styles.field}>
            <ThemedText style={styles.fieldLabel}>
              {TEXT.REPAIR_COMPUTER_REJECT_REASON}
              <ThemedText style={styles.requiredMark}> *</ThemedText>
            </ThemedText>
            <TextInput
              multiline
              numberOfLines={2}
              value={rejectDetail}
              onChangeText={(value) => {
                setRejectDetail(value);
                if (value.trim()) setRejectError("");
              }}
              placeholder={TEXT.REPAIR_COMPUTER_REJECT_REASON_PLACEHOLDER}
              placeholderTextColor={c.textFaint}
              style={[
                styles.input,
                styles.textArea,
                rejectError ? styles.inputError : undefined,
                webNoOutline,
              ]}
            />
            {rejectError ? (
              <ThemedText style={styles.fieldError}>{rejectError}</ThemedText>
            ) : null}
          </View>
        </SectionCard>
      </ScrollView>

      <FloatingActionBar disabled={isSubmitting}>
        <Button
          title={TEXT.REPAIR_COMPUTER_REJECT_JOB}
          variant="danger"
          fullWidth
          loading={isSubmitting}
          onPress={handleConfirmPress}
        />
      </FloatingActionBar>

      <ConfirmDialog
        visible={isConfirmOpen}
        title={TEXT.REPAIR_COMPUTER_REJECT_CONFIRM_TITLE}
        message={TEXT.REPAIR_COMPUTER_REJECT_CONFIRM_MESSAGE}
        confirmLabel={TEXT.REPAIR_COMPUTER_REJECT_JOB}
        cancelLabel={TEXT.CANCEL}
        destructive
        loading={isSubmitting}
        onConfirm={handleReject}
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
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 14,
  },
  field: {
    paddingHorizontal: 0,
    paddingVertical: 12,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 15,
    lineHeight: 20,
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  requiredMark: {
    color: c.danger,
    fontFamily: AppFonts.psuBold,
  },
  input: {
    minHeight: 40,
    color: c.text,
    fontFamily: AppFonts.psuRegular,
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 0,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  inputError: {
    borderBottomWidth: 1.5,
    borderBottomColor: c.danger,
  },
  fieldError: {
    fontSize: 12,
    lineHeight: 17,
    color: c.danger,
  },
});
