import { TEXT } from "@/constants/text";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";

import { AppToast } from "@/components/app-toast";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
    REPAIR_STATUS_NEW_JOB,
    REPAIR_STATUS_WAIT_FOREMAN,
    REPAIR_STATUS_WORKER_REJECT,
} from "@/constants/type-repair-computer";
import type { RepairComputer } from "@/models/types";
import {
    foremanCloseJob,
    foremanForwardForeman,
    foremanForwardWorker,
    getJobDetail,
} from "@/services/repairComputerService";
import { formatDateTime } from "@/utils/date-format";

const TEXT_NONE = "-";
const TEXT_RC_NO_SUPPLYCODE = "No supply code";
type ForemanCurrentJobAction = "forwardWorker" | "forwardForeman" | "closeJob";

function getJobText(job: RepairComputer | null, fields: string[]) {
  if (!job) {
    return "";
  }

  for (const field of fields) {
    const value = job[field];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

type RowDetailProps = {
  description: string;
  title: string;
};

function RowDetail({ description, title }: RowDetailProps) {
  return (
    <View style={styles.rowDetail}>
      <ThemedText type="defaultSemiBold" style={styles.rowTitle}>
        {title}
      </ThemedText>
      <ThemedText style={styles.rowDescription}>{description}</ThemedText>
    </View>
  );
}

export default function ForemanJobDetailScreen() {
  const params = useLocalSearchParams<{
    backHref?: string | string[];
    id?: string | string[];
  }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const backHrefParam = Array.isArray(params.backHref)
    ? params.backHref[0]
    : params.backHref;
  const backHref = backHrefParam || "/repair-computer/foreman-new-job";
  const [data, setData] = useState<RepairComputer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] =
    useState<ForemanCurrentJobAction | null>(null);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "">("");

  const loadDetail = useCallback(async () => {
    if (!jobId) {
      setError(TEXT.REPAIR_COMPUTER_UNABLE_TO_LOAD_JOB_DETAIL);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    setToastMessage("");
    setToastType("");

    try {
      const result = await getJobDetail(jobId);
      setData(result);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : TEXT.REPAIR_COMPUTER_UNABLE_TO_LOAD_JOB_DETAIL,
      );
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const status = getJobText(data, ["status", "state", "statusId", "status_id"]);
  const showActionButtons = status === REPAIR_STATUS_NEW_JOB && Boolean(jobId);
  const showWaitForemanActionButtons =
    status === REPAIR_STATUS_WAIT_FOREMAN && Boolean(jobId);
  const showAssignedWorker = true;
  const informDateTime = getJobText(data, [
    "informDateTime",
    "inform_date_time",
    "informDate",
    "inform_date",
  ]);
  const rejectDetail = getJobText(data, [
    "rejectDetail",
    "reject_detail",
    "rejectReason",
    "reject_reason",
    "reason",
  ]);

  const handleBackPress = () => {
    router.replace(backHref as Parameters<typeof router.replace>[0]);
  };

  const getConfirmContent = (action: ForemanCurrentJobAction) => {
    if (action === "forwardWorker") {
      return {
        title: "Confirm Forward Worker",
        message: "Do you want to forward this job back to worker?",
        submit: () => foremanForwardWorker(jobId || ""),
      };
    }

    if (action === "forwardForeman") {
      return {
        title: "Confirm Forward Foreman",
        message: "Do you want to forward this job to foreman?",
        submit: () => foremanForwardForeman(jobId || ""),
      };
    }

    return {
      title: "Confirm Close Job",
      message: "Do you want to close this repair computer job?",
      submit: () => foremanCloseJob(jobId || ""),
    };
  };

  const handleConfirmAction = async () => {
    if (!jobId || !confirmAction || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setToastMessage("");
    setToastType("");

    try {
      const result = await getConfirmContent(confirmAction).submit();

      setToastType("success");
      setToastMessage(
        result.message || TEXT.REPAIR_COMPUTER_JOB_UPDATED_SUCCESS_MESSAGE,
      );
      setTimeout(() => {
        router.replace(backHref as Parameters<typeof router.replace>[0]);
      }, 900);
    } catch (error) {
      setToastType("error");
      setToastMessage(
        error instanceof Error
          ? error.message
          : TEXT.REPAIR_COMPUTER_UNABLE_TO_UPDATE_JOB,
      );
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <LoadingAnimate
          title={TEXT.REPAIR_COMPUTER_LOADING_JOB_DETAIL}
          desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT}
        />
      );
    }

    if (error) {
      return (
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">
            {TEXT.SHARED_SOMETHING_WENT_WRONG}
          </ThemedText>
          <ThemedText style={[styles.stateMessage, styles.errorText]}>
            {error}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={loadDetail}
            style={styles.retryButton}
          >
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              type="defaultSemiBold"
            >
              {TEXT.SHARED_RETRY}
            </ThemedText>
          </Pressable>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.form}>
        <RowDetail
          title={TEXT.REPAIR_COMPUTER_USER_LABEL}
          description={
            getJobText(data, ["staffFullname", "staff_fullname"]) || TEXT_NONE
          }
        />
        <RowDetail
          title={TEXT.SHARED_DEPARTMENT_LABEL}
          description={getJobText(data, ["deptName", "dept_name"]) || TEXT_NONE}
        />
        <RowDetail
          title={TEXT.REPAIR_COMPUTER_INFORM_DATE_LABEL}
          description={
            informDateTime ? formatDateTime(informDateTime) : TEXT_NONE
          }
        />
        <RowDetail
          title={TEXT.REPAIR_COMPUTER_SUPPLY_CODE_LABEL}
          description={
            getJobText(data, ["supplyCode", "supply_code"]) ||
            TEXT_RC_NO_SUPPLYCODE
          }
        />
        <RowDetail
          title={TEXT.REPAIR_COMPUTER_PHONE_LABEL}
          description={getJobText(data, ["phone"]) || TEXT_NONE}
        />
        <RowDetail
          title={TEXT.REPAIR_COMPUTER_DETAIL_LABEL}
          description={getJobText(data, ["detail"]) || TEXT_NONE}
        />

        {status !== REPAIR_STATUS_NEW_JOB && showAssignedWorker ? (
          <View style={styles.assignedSection}>
            <ThemedText type="subtitle">
              {TEXT.REPAIR_COMPUTER_ASSIGN_CONFIRM}
            </ThemedText>
            <RowDetail
              title={TEXT.REPAIR_COMPUTER_WORKER_LABEL}
              description={
                getJobText(data, ["workerFullname", "worker_fullname"]) ||
                TEXT_NONE
              }
            />
            <RowDetail
              title={TEXT.REPAIR_COMPUTER_STATUS_LABEL}
              description={
                getJobText(data, ["statusName", "status_name"]) || TEXT_NONE
              }
            />
            {status === REPAIR_STATUS_WORKER_REJECT ? (
              <RowDetail
                title={TEXT.REPAIR_COMPUTER_REJECT_DETAIL_LABEL}
                description={rejectDetail || TEXT_NONE}
              />
            ) : null}
          </View>
        ) : null}

        {showActionButtons ? (
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                router.push({
                  pathname: "/repair-computer/assign-job",
                  params: {
                    id: jobId,
                    backHref: "/repair-computer/foreman-job-detail",
                  },
                });
              }}
              style={styles.acceptButton}
            >
              <ThemedText
                lightColor="#FFFFFF"
                darkColor="#FFFFFF"
                type="defaultSemiBold"
              >
                Accept
              </ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                router.push({
                  pathname: "/repair-computer/reject-job",
                  params: {
                    id: jobId,
                    backHref: "/repair-computer/foreman-job-detail",
                  },
                });
              }}
              style={styles.rejectButton}
            >
              <ThemedText
                lightColor="#FFFFFF"
                darkColor="#FFFFFF"
                type="defaultSemiBold"
              >
                Reject
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {showWaitForemanActionButtons ? (
          <View style={styles.actionStack}>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => setConfirmAction("forwardWorker")}
              style={[
                styles.forwardButton,
                isSubmitting ? styles.disabledButton : undefined,
              ]}
            >
              <ThemedText
                lightColor="#FFFFFF"
                darkColor="#FFFFFF"
                type="defaultSemiBold"
              >
                Forward Worker
              </ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => setConfirmAction("forwardForeman")}
              style={[
                styles.forwardButton,
                isSubmitting ? styles.disabledButton : undefined,
              ]}
            >
              <ThemedText
                lightColor="#FFFFFF"
                darkColor="#FFFFFF"
                type="defaultSemiBold"
              >
                Forward Foreman
              </ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => setConfirmAction("closeJob")}
              style={[
                styles.closeJobButton,
                isSubmitting ? styles.disabledButton : undefined,
              ]}
            >
              <ThemedText
                lightColor="#FFFFFF"
                darkColor="#FFFFFF"
                type="defaultSemiBold"
              >
                Close Job
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    );
  };

  const confirmContent = confirmAction
    ? getConfirmContent(confirmAction)
    : null;

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
          <ThemedText type="subtitle">
            {TEXT.REPAIR_COMPUTER_JOB_DETAIL}
          </ThemedText>
          {renderContent()}
        </ThemedView>
      </View>

      <AppToast
        message={toastMessage}
        type={toastType === "error" ? "error" : "success"}
      />

      <Modal
        transparent
        visible={Boolean(confirmContent)}
        animationType="fade"
        onRequestClose={() => setConfirmAction(null)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setConfirmAction(null)}
        >
          <Pressable>
            <ThemedView
              style={styles.confirmModal}
              lightColor="#FFFFFF"
              darkColor="#151718"
            >
              <ThemedText type="subtitle">{confirmContent?.title}</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                {confirmContent?.message}
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => setConfirmAction(null)}
                  style={styles.cancelButton}
                >
                  <ThemedText type="defaultSemiBold">No</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={handleConfirmAction}
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  panel: {
    flex: 1,
    borderRadius: 8,
    padding: 0,
  },
  form: {
    gap: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  rowDetail: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D7E6EC",
    paddingBottom: 12,
  },
  rowTitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  rowDescription: {
    color: "#687076",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  assignedSection: {
    gap: 12,
    marginTop: 28,
  },
  stateContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  stateMessage: {
    color: "#687076",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: "center",
  },
  errorText: {
    color: "#B42318",
  },
  retryButton: {
    minHeight: 48,
    minWidth: 132,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0A6E8A",
    marginTop: 24,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  actionStack: {
    gap: 12,
    marginTop: 20,
  },
  acceptButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0A6E8A",
  },
  closeJobButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#11181C",
  },
  forwardButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0A6E8A",
  },
  rejectButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#C44D58",
  },
  disabledButton: {
    opacity: 0.65,
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
  confirmButton: {
    minHeight: 46,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0A6E8A",
  },
});
