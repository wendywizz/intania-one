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

import { AppToast } from "@/components/app-toast";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import { foremanRejectJob } from "@/services/repairComputerService";

const DEFAULT_REJECT_DETAIL = "Reject job because not our duty";

export default function RejectJobScreen() {
  const params = useLocalSearchParams<{
    backHref?: string | string[];
    id?: string | string[];
  }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const backHrefParam = Array.isArray(params.backHref)
    ? params.backHref[0]
    : params.backHref;
  const backHref = backHrefParam || "/repair-computer/foreman-new-job";
  const [rejectDetail, setRejectDetail] = useState(DEFAULT_REJECT_DETAIL);
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
          <ThemedText type="subtitle">Reject Job</ThemedText>
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">
              {TEXT.REPAIR_COMPUTER_REJECT_DETAIL_LABEL}
            </ThemedText>
            <TextInput
              multiline
              numberOfLines={2}
              onChangeText={setRejectDetail}
              placeholder={TEXT.REPAIR_COMPUTER_REJECT_DETAIL_LABEL}
              placeholderTextColor="#8A969C"
              style={styles.textArea}
              textAlignVertical="top"
              value={rejectDetail}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => setIsConfirmOpen(true)}
            style={styles.rejectButton}
          >
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              type="defaultSemiBold"
            >
              Submit
            </ThemedText>
          </Pressable>
        </ThemedView>
      </View>

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
              <ThemedText type="subtitle">Confirm Reject</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                Do you want to reject this repair computer job?
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
                  onPress={handleReject}
                  style={[
                    styles.confirmRejectButton,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  panel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E2E6',
    padding: 16,
    gap: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  field: {
    gap: 8,
  },
  textArea: {
    minHeight: 76,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#BFD2DA",
    backgroundColor: "#FFFFFF",
    color: "#11181C",
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rejectButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#C44D58",
    paddingHorizontal: 18,
  },
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    padding: 24,
  },
  confirmModal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 8,
    padding: 18,
  },
  confirmMessage: {
    color: "#687076",
    lineHeight: 20,
    marginTop: 10,
  },
  confirmActions: {
    flexDirection: "row",
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
    borderColor: "#BFD2DA",
    backgroundColor: "#FFFFFF",
  },
  confirmRejectButton: {
    minHeight: 46,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#C44D58",
  },
  disabledButton: {
    opacity: 0.65,
  },
});
