import { TEXT } from "@/constants/text";
import { router, useLocalSearchParams } from "expo-router";
import { navPush } from "@/utils/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { AppToast } from "@/components/app-toast";
import { FloatingActionBar } from "@/components/floating-action-bar";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ConfirmDialog, IconSymbol } from "@/components/ui";
import {
    REPAIR_STATUS_APPROVAL_REJECTED,
    REPAIR_STATUS_FORWARD_FOREMAN,
    REPAIR_STATUS_NEW_JOB,
    REPAIR_STATUS_PROCESSING_EQUIPMENT,
    REPAIR_STATUS_WAIT_APPROVAL,
    REPAIR_STATUS_WAIT_FOREMAN,
    REPAIR_STATUS_WORKER_REJECT,
} from "@/constants/types";
import type { RepairComputer } from "@/models/types";
import { getPersonPhoto } from "@/services/personService";
import {
    foremanCloseJob,
    foremanForwardReject,
    getJobDetail,
} from "@/services/repairComputerService";
import { formatDateTime } from "@/utils/date-format";
import { getRepairStatusBadgeStyle } from "@/utils/repair-computer-status";

const TEXT_NONE = "-";
const TEXT_RC_NO_SUPPLYCODE = "No supply code";
// Shown when a person's photo can't be loaded (or there's no staff id).
const USER_PLACEHOLDER = require("../../assets/images/user-placeholder.jpg");
type ForemanCurrentJobAction = "closeJob" | "forwardReject";

const detailFields = ["detail", "description", "repairDetail", "repair_detail", "problem"];
const repairTypeNameFields = ["repairTypeName", "repair_type_name", "problemTypeName", "problem_type_name"];
const requesterNameFields = ["staffFullname", "staff_fullname", "staffullName", "requesterFullname", "requester_fullname"];
const requesterIdFields = [
  "staff_uni_id",
  "staffUniId",
  "staffUNIId",
  "STAFF_UNI_ID",
  "staffId",
  "staffID",
  "staff_id",
  "STAFF_ID",
  "STAFFID",
  "UNI_STAFF_ID",
  "uni_staff_id",
  "uniStaffId",
  "uniStaffID",
  "requesterId",
  "requester_id",
  "informStaffId",
  "inform_staff_id",
];
const workerNameFields = ["workerFullname", "worker_fullname", "workerName", "worker_name"];
const workerIdFields = [
  "worker_uni_id",
  "workerUniId",
  "workerUNIId",
  "WORKER_UNI_ID",
  "worker",
  "workerId",
  "workerID",
  "worker_id",
  "workerStaffId",
  "worker_staff_id",
];
const foremanNameFields = ["foremanFullname", "foreman_fullname", "foremanName", "foreman_name"];
const foremanIdFields = [
  "foreman_uni_id",
  "foremanUniId",
  "foremanUNIId",
  "FOREMAN_UNI_ID",
  "foreman",
  "foremanId",
  "foremanID",
  "foreman_id",
  "foremanStaffId",
  "foreman_staff_id",
];
const statusNameFields = ["statusName", "status_name", "statusLabel", "status_label"];

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
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.rowDetail}>
      <ThemedText style={styles.rowTitle}>
        {title}
      </ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.rowDescription}>
        {description}
      </ThemedText>
    </View>
  );
}

function normalizeStaffId(staffId: string) {
  return /^\d+$/.test(staffId) ? staffId.padStart(7, "0") : staffId;
}

function SectionCard({
  children,
  title,
  right,
}: {
  children: ReactNode;
  title: string;
  right?: ReactNode;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <ThemedView style={styles.sectionCard} lightColor="#FFFFFF" darkColor="#151718">
      <View style={styles.sectionHeader}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          {title}
        </ThemedText>
        {right ?? null}
      </View>
      {children}
    </ThemedView>
  );
}

function PersonSummaryCard({
  fallbackTitle,
  id,
  meta,
  name,
  role,
}: {
  fallbackTitle: string;
  id: string;
  meta?: string;
  name: string;
  role?: string;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const staffId = normalizeStaffId(id);
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(staffId) && !photoFailed;
  const fallbackInitial = (name || fallbackTitle).trim().charAt(0).toUpperCase();

  return (
    <View style={styles.personCard}>
      {showPhoto ? (
        <Image
          onError={() => setPhotoFailed(true)}
          source={{ uri: getPersonPhoto({ staffId }) }}
          style={styles.personPhoto}
        />
      ) : (
        <Image source={USER_PLACEHOLDER} style={styles.personPhoto} />
      )}
      <View style={styles.personText}>
        <ThemedText type="defaultSemiBold" style={styles.personName} numberOfLines={2}>
          {name || fallbackTitle}
        </ThemedText>
        {role ? (
          <ThemedText style={styles.personRole} numberOfLines={1}>
            {role}
          </ThemedText>
        ) : null}
        {meta ? (
          <ThemedText style={styles.personMeta} numberOfLines={2}>
            {meta}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

export default function ForemanJobDetailScreen() {
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
  const showForwardForemanActionButtons =
    status === REPAIR_STATUS_FORWARD_FOREMAN && Boolean(jobId);
  const showAssignedWorker = true;
  const isWaitApproval = status === REPAIR_STATUS_WAIT_APPROVAL;
  const isApproved = status === REPAIR_STATUS_PROCESSING_EQUIPMENT;
  const isApprovalRejected = status === REPAIR_STATUS_APPROVAL_REJECTED;
  const isSupplyFlow = isWaitApproval || isApproved || isApprovalRejected;
  const hasApprovalResult = isApproved || isApprovalRejected;
  const requestSupplyDetail = getJobText(data, [
    "equipmentRequestDetail",
    "equipment_request_detail",
    "requestDetail",
    "request_appv_detail",
  ]);
  const requestSupplyDate = getJobText(data, [
    "equipmentRequestDateTime",
    "equipment_request_date_time",
    "requestDate",
    "request_appv_date",
  ]);
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
  const repairTypeName = getJobText(data, repairTypeNameFields);
  const requesterName = getJobText(data, requesterNameFields);
  const requesterId = getJobText(data, requesterIdFields);
  const deptName = getJobText(data, ["deptName", "dept_name", "department"]);
  const supplyCode = getJobText(data, ["supplyCode", "supply_code"]);
  const phone = getJobText(data, ["phone", "tel", "telephone"]);
  const detail = getJobText(data, detailFields);
  const statusName = getJobText(data, statusNameFields) || status || TEXT_NONE;
  const badgeStyle = getRepairStatusBadgeStyle(status);
  const workerName = getJobText(data, workerNameFields);
  const workerId = getJobText(data, workerIdFields);
  const foremanName = getJobText(data, foremanNameFields);
  const foremanId = getJobText(data, foremanIdFields);
  const pageTitle =
    backHref === "/repair-computer/manage-job"
      ? TEXT.REPAIR_COMPUTER_MANAGE_JOB
      : TEXT.REPAIR_COMPUTER_JOB_DETAIL;

  const handleBackPress = () => {
    router.replace(backHref as Parameters<typeof router.replace>[0]);
  };

  const getConfirmContent = (action: ForemanCurrentJobAction) => {
    if (action === "forwardReject") {
      return {
        title: "Confirm Reject Job",
        message: "Do you want to reject this forwarded job?",
        submit: () => foremanForwardReject(jobId || ""),
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
      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.summaryCard} lightColor="#FFFFFF" darkColor="#151718">
          <View style={styles.summaryHeader}>
            <View style={styles.summaryTitleBlock}>
              <ThemedText style={styles.summaryKicker}>
                {TEXT.REPAIR_COMPUTER_JOB_DETAIL}
              </ThemedText>
              <ThemedText type="subtitle" style={styles.summaryTitle}>
                {repairTypeName || detail || TEXT.REPAIR_COMPUTER_JOB_DETAIL}
              </ThemedText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: badgeStyle.background }]}>
              <ThemedText
                style={[styles.statusBadgeText, { color: badgeStyle.text }]}
                numberOfLines={1}
              >
                {statusName}
              </ThemedText>
            </View>
          </View>

          <View style={styles.summaryMetaGrid}>
            <View style={styles.summaryMetaItem}>
              <IconSymbol name="calendar" size={15} color={c.textMuted} />
              <ThemedText style={styles.summaryMetaText} numberOfLines={2}>
                {informDateTime ? formatDateTime(informDateTime) : TEXT_NONE}
              </ThemedText>
            </View>
          </View>
        </ThemedView>

        <SectionCard title="User Inform">
          <PersonSummaryCard
            fallbackTitle="User"
            id={requesterId}
            meta={`${TEXT.SHARED_DEPARTMENT_LABEL} ${deptName || TEXT_NONE}`}
            name={requesterName}
          />
          <View style={styles.detailGrid}>
            <RowDetail title={TEXT.REPAIR_COMPUTER_PHONE_LABEL} description={phone || TEXT_NONE} />
            <RowDetail
              title={TEXT.REPAIR_COMPUTER_INFORM_DATE_LABEL}
              description={informDateTime ? formatDateTime(informDateTime) : TEXT_NONE}
            />
          </View>
        </SectionCard>

        <SectionCard title={TEXT.REPAIR_COMPUTER_DETAIL}>
          <RowDetail
            title="Job Type"
            description={repairTypeName || TEXT_NONE}
          />
          <RowDetail
            title={TEXT.REPAIR_COMPUTER_SUPPLY_CODE_LABEL}
            description={supplyCode || TEXT_RC_NO_SUPPLYCODE}
          />
          <View style={styles.descriptionBox}>
            <ThemedText style={styles.rowTitle}>
              {TEXT.REPAIR_COMPUTER_DETAIL_LABEL}
            </ThemedText>
            <ThemedText style={styles.longDescription}>
              {detail || TEXT_NONE}
            </ThemedText>
          </View>
        </SectionCard>

        {status !== REPAIR_STATUS_NEW_JOB && showAssignedWorker ? (
          <SectionCard title={TEXT.REPAIR_COMPUTER_ASSIGN_CONFIRM}>
            {/* A forwarded job (4.3) shows only the foreman who forwarded it. */}
            {status !== REPAIR_STATUS_FORWARD_FOREMAN && (workerName || workerId) ? (
              <PersonSummaryCard
                fallbackTitle="Worker"
                id={workerId}
                name={workerName}
                role="Worker"
              />
            ) : null}
            {foremanName || foremanId ? (
              <PersonSummaryCard
                fallbackTitle={TEXT.REPAIR_COMPUTER_FOREMAN}
                id={foremanId}
                name={foremanName}
                role={
                  status === REPAIR_STATUS_FORWARD_FOREMAN
                    ? "ผู้ส่งต่องาน"
                    : TEXT.REPAIR_COMPUTER_FOREMAN
                }
              />
            ) : null}
            {status === REPAIR_STATUS_WORKER_REJECT ? (
              <RowDetail
                title={TEXT.REPAIR_COMPUTER_REJECT_DETAIL_LABEL}
                description={rejectDetail || TEXT_NONE}
              />
            ) : null}
          </SectionCard>
        ) : null}

        {isSupplyFlow ? (
          <SectionCard
            title="Request Supply"
            right={
              hasApprovalResult ? (
                <View
                  style={[
                    styles.approvalBadge,
                    isApproved ? styles.approvalBadgeApproved : styles.approvalBadgeRejected,
                  ]}
                >
                  <ThemedText
                    lightColor="#FFFFFF"
                    darkColor="#FFFFFF"
                    style={styles.approvalBadgeText}
                  >
                    {isApproved ? "เห็นชอบ" : "ไม่เห็นชอบ"}
                  </ThemedText>
                </View>
              ) : (
                <View style={[styles.approvalBadge, styles.approvalBadgePending]}>
                  <ThemedText style={styles.approvalBadgePendingText}>
                    รอการอนุมัติ
                  </ThemedText>
                </View>
              )
            }
          >
            {requestSupplyDate ? (
              <RowDetail
                title="Request date"
                description={formatDateTime(requestSupplyDate)}
              />
            ) : null}
            <View style={styles.descriptionBox}>
              <ThemedText style={styles.rowTitle}>Request detail</ThemedText>
              <ThemedText style={styles.longDescription}>
                {requestSupplyDetail || TEXT_NONE}
              </ThemedText>
            </View>
          </SectionCard>
        ) : null}

      </ScrollView>
    );
  };

  const renderFooterActions = () => {
    if (isLoading || error) {
      return null;
    }

    if (showActionButtons) {
      return (
        <FloatingActionBar disabled={isSubmitting}>
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                navPush({
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
                navPush({
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
        </FloatingActionBar>
      );
    }

    if (isWaitApproval) {
      return (
        <FloatingActionBar disabled={isSubmitting}>
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() =>
                navPush({
                  pathname: "/repair-computer/supply-approval",
                  params: { id: jobId, action: "approve", backHref },
                })
              }
              style={[styles.approveButton, isSubmitting ? styles.disabledButton : undefined]}
            >
              <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                Accept
              </ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() =>
                navPush({
                  pathname: "/repair-computer/supply-approval",
                  params: { id: jobId, action: "reject", backHref },
                })
              }
              style={[styles.rejectButton, isSubmitting ? styles.disabledButton : undefined]}
            >
              <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                Reject
              </ThemedText>
            </Pressable>
          </View>
        </FloatingActionBar>
      );
    }

    if (showWaitForemanActionButtons) {
      return (
        <FloatingActionBar disabled={isSubmitting}>
          <View style={styles.actionStack}>
            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={() =>
                  navPush({
                    pathname: "/repair-computer/assign-job",
                    params: {
                      id: jobId,
                      backHref: "/repair-computer/foreman-job-detail",
                    },
                  })
                }
                style={[
                  styles.forwardButton,
                  isSubmitting ? styles.disabledButton : undefined,
                ]}
              >
                <ThemedText
                  lightColor="#FFFFFF"
                  darkColor="#FFFFFF"
                  type="defaultSemiBold"
                  style={styles.actionButtonText}
                >
                  Fwd Worker
                </ThemedText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={() =>
                  navPush({
                    pathname: "/repair-computer/select-foreman",
                    params: { id: jobId, backHref },
                  })
                }
                style={[
                  styles.forwardButton,
                  isSubmitting ? styles.disabledButton : undefined,
                ]}
              >
                <ThemedText
                  lightColor="#FFFFFF"
                  darkColor="#FFFFFF"
                  type="defaultSemiBold"
                  style={styles.actionButtonText}
                >
                  Fwd Foreman
                </ThemedText>
              </Pressable>
            </View>

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
                style={styles.actionButtonText}
              >
                Close Job
              </ThemedText>
            </Pressable>
          </View>
        </FloatingActionBar>
      );
    }

    if (showForwardForemanActionButtons) {
      return (
        <FloatingActionBar disabled={isSubmitting}>
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() =>
                navPush({
                  pathname: "/repair-computer/assign-job",
                  params: {
                    id: jobId,
                    backHref: "/repair-computer/foreman-job-detail",
                  },
                })
              }
              style={[styles.acceptButton, isSubmitting ? styles.disabledButton : undefined]}
            >
              <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                Assign Job
              </ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => setConfirmAction("forwardReject")}
              style={[styles.rejectButton, isSubmitting ? styles.disabledButton : undefined]}
            >
              <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                Reject Job
              </ThemedText>
            </Pressable>
          </View>
        </FloatingActionBar>
      );
    }

    return null;
  };

  const confirmContent = confirmAction
    ? getConfirmContent(confirmAction)
    : null;

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.REPAIR_COMPUTER_TITLE}
        subtitle={jobId ? `${TEXT.REPAIR_COMPUTER_JOB_ID_LABEL} ${jobId}` : undefined}
        moduleIcon="laptop"
        onBackPress={handleBackPress}
        showBackButton
      />

      <View style={styles.content}>
        <View style={styles.panelHeader}>
          <ThemedText type="subtitle" numberOfLines={1}>
            {pageTitle}
          </ThemedText>
        </View>
        <View style={styles.panel}>
          {renderContent()}
        </View>
      </View>

      {renderFooterActions()}

      <AppToast
        message={toastMessage}
        type={toastType === "error" ? "error" : "success"}
      />

      <ConfirmDialog
        visible={Boolean(confirmContent)}
        title={confirmContent?.title ?? ""}
        message={confirmContent?.message}
        confirmLabel="Yes"
        cancelLabel="No"
        destructive={confirmAction === "forwardReject"}
        loading={isSubmitting}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
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
    flex: 1,
  },
  panelHeader: {
    paddingBottom: 12,
    gap: 4,
  },
  form: {
    gap: 14,
    paddingBottom: 10,
  },
  summaryCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 14,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  summaryTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  summaryKicker: {
    color: c.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  summaryTitle: {
    marginTop: 3,
    lineHeight: 24,
  },
  statusBadge: {
    maxWidth: 132,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  summaryMetaGrid: {
    gap: 8,
  },
  summaryMetaItem: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    backgroundColor: c.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  summaryMetaText: {
    flex: 1,
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  approvalBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  approvalBadgeApproved: {
    backgroundColor: c.success,
  },
  approvalBadgeRejected: {
    backgroundColor: c.primary,
  },
  approvalBadgePending: {
    backgroundColor: c.warningSoft,
  },
  approvalBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  approvalBadgePendingText: {
    color: c.warning,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  detailGrid: {
    gap: 12,
  },
  rowDetail: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    paddingBottom: 10,
  },
  rowTitle: {
    color: c.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  rowDescription: {
    color: c.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  descriptionBox: {
    gap: 12,
  },
  longDescription: {
    color: c.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  personCard: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    backgroundColor: c.surfaceMuted,
    padding: 12,
  },
  personPhoto: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: c.surfaceMuted,
  },
  personPhotoPlaceholder: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.surfaceMuted,
  },
  personPhotoInitial: {
    color: c.primary,
    fontSize: 20,
    lineHeight: 26,
  },
  personText: {
    flex: 1,
    minWidth: 0,
  },
  personName: {
    fontSize: 15,
    lineHeight: 21,
  },
  personRole: {
    color: c.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  personMeta: {
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  stateContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  stateMessage: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: "center",
  },
  errorText: {
    color: c.primary,
  },
  retryButton: {
    minHeight: 48,
    minWidth: 132,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.primary,
    marginTop: 24,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  actionStack: {
    gap: 12,
    marginTop: 4,
  },
  actionButtonText: {
    fontSize: 13,
  },
  acceptButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.primary,
  },
  approveButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.success,
  },
  closeJobButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 8,
    backgroundColor: c.text,
  },
  forwardButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 8,
    backgroundColor: c.primary,
  },
  rejectButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.primary,
  },
  disabledButton: {
    opacity: 0.65,
  },
});
