import { TEXT } from "@/constants/text";
import { router, useLocalSearchParams } from "expo-router";
import { navPush } from "@/utils/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { AppToast } from "@/components/app-toast";
import { FloatingActionBar } from "@/components/floating-action-bar";
import { PdfViewerModal } from "@/components/pdf-viewer-modal";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
    REPAIR_STATUS_APPROVAL_REJECTED,
    REPAIR_STATUS_PROCESSING_EQUIPMENT,
    REPAIR_STATUS_WAIT_APPROVAL,
    REPAIR_STATUS_WORKER_ACCEPT,
    REPAIR_STATUS_WORKING,
} from "@/constants/types";
import type { RepairComputer } from "@/models/types";
import { getPersonPhoto } from "@/services/personService";
import {
    getJobDetail,
    getRequisitionPdfUrl,
    workerReceiveJob,
    workerSendForeman,
} from "@/services/repairComputerService";
import { formatDateTime } from "@/utils/date-format";
import { getRepairStatusBadgeStyle } from "@/utils/repair-computer-status";

const TEXT_NONE = "-";
const TEXT_RC_NO_SUPPLYCODE = "No supply code";
// Shown when a person's photo can't be loaded (or there's no staff id).
const USER_PLACEHOLDER = require("../../assets/images/user-placeholder.jpg");

const detailFields = ["detail", "description", "repairDetail", "repair_detail", "problem"];
const repairTypeNameFields = ["repairTypeName", "repair_type_name", "problemTypeName", "problem_type_name"];
const requesterNameFields = ["staffFullname", "staff_fullname", "staffullName", "requesterFullname", "requester_fullname"];
const requesterIdFields = [
  "staff_uni_id", "staffUniId", "staffUNIId", "STAFF_UNI_ID",
  "staffId", "staffID", "staff_id", "STAFF_ID", "STAFFID",
  "UNI_STAFF_ID", "uni_staff_id", "uniStaffId", "uniStaffID",
  "requesterId", "requester_id", "informStaffId", "inform_staff_id",
];
const foremanNameFields = ["foremanFullname", "foreman_fullname", "foremanName", "foreman_name"];
const foremanIdFields = [
  "foreman_uni_id", "foremanUniId", "foremanUNIId", "FOREMAN_UNI_ID",
  "foreman", "foremanId", "foremanID", "foreman_id", "foremanStaffId", "foreman_staff_id",
];
const statusNameFields = ["statusName", "status_name", "statusLabel", "status_label"];
const statusIdFields = ["status", "state", "statusId", "status_id"];

function getJobText(job: RepairComputer | null, fields: string[]) {
  if (!job) return "";
  for (const field of fields) {
    const value = job[field];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function normalizeStaffId(staffId: string) {
  return /^\d+$/.test(staffId) ? staffId.padStart(7, "0") : staffId;
}

function RowDetail({ description, title }: { description: string; title: string }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.rowDetail}>
      <ThemedText style={styles.rowTitle}>{title}</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.rowDescription}>
        {description}
      </ThemedText>
    </View>
  );
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
          <ThemedText style={styles.personRole} numberOfLines={1}>{role}</ThemedText>
        ) : null}
        {meta ? (
          <ThemedText style={styles.personMeta} numberOfLines={2}>{meta}</ThemedText>
        ) : null}
      </View>
    </View>
  );
}

export default function WorkerJobDetailScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{
    backHref?: string | string[];
    id?: string | string[];
  }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const backHrefParam = Array.isArray(params.backHref) ? params.backHref[0] : params.backHref;
  const backHref = backHrefParam || "/repair-computer/worker-new-job";

  const [data, setData] = useState<RepairComputer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAcceptConfirmOpen, setIsAcceptConfirmOpen] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
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
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
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

  const handleAccept = async () => {
    if (!jobId || isSubmitting) return;
    setIsSubmitting(true);
    setToastMessage("");
    setToastType("");
    try {
      const result = await workerReceiveJob(jobId, true);
      setToastType("success");
      setToastMessage(
        result.message || TEXT.REPAIR_COMPUTER_JOB_UPDATED_SUCCESS_MESSAGE,
      );
      setTimeout(() => {
        router.replace("/repair-computer/worker-current-job");
      }, 1500);
    } catch (err) {
      setToastType("error");
      setToastMessage(
        err instanceof Error
          ? err.message
          : TEXT.REPAIR_COMPUTER_UNABLE_TO_UPDATE_JOB,
      );
    } finally {
      setIsSubmitting(false);
      setIsAcceptConfirmOpen(false);
    }
  };

  const handleReject = () => {
    if (!jobId) return;
    navPush({
      pathname: "/repair-computer/worker-reject-job",
      params: { id: jobId },
    } as Parameters<typeof navPush>[0]);
  };

  const handleOperate = () => {
    if (!jobId) return;
    navPush({
      pathname: "/repair-computer/operate-job",
      params: { id: jobId, backHref },
    } as Parameters<typeof navPush>[0]);
  };

  const handleRequestSupply = () => {
    if (!jobId) return;
    navPush({
      pathname: "/repair-computer/request-supply",
      params: { id: jobId, backHref },
    } as Parameters<typeof navPush>[0]);
  };

  const handleSupplyResult = () => {
    if (!jobId) return;
    navPush({
      pathname: "/repair-computer/supply-result",
      params: { id: jobId, backHref },
    } as Parameters<typeof navPush>[0]);
  };

  const handlePrintRequisition = () => {
    if (!jobId) return;
    // Show the requisition PDF in an in-app viewer.
    setIsPdfOpen(true);
  };

  const handleCloseJob = async () => {
    if (!jobId || isSubmitting) return;
    setIsSubmitting(true);
    setToastMessage("");
    setToastType("");
    try {
      const result = await workerSendForeman(jobId);
      setToastType("success");
      setToastMessage(
        result.message || TEXT.REPAIR_COMPUTER_JOB_UPDATED_SUCCESS_MESSAGE,
      );
      setTimeout(() => {
        router.replace("/repair-computer/worker-current-job");
      }, 1500);
    } catch (err) {
      setToastType("error");
      setToastMessage(
        err instanceof Error
          ? err.message
          : TEXT.REPAIR_COMPUTER_UNABLE_TO_UPDATE_JOB,
      );
    } finally {
      setIsSubmitting(false);
      setIsCloseConfirmOpen(false);
    }
  };

  const handleBackPress = () => {
    router.replace(backHref as Parameters<typeof router.replace>[0]);
  };

  const statusId = getJobText(data, statusIdFields);
  const statusName = getJobText(data, statusNameFields) || statusId || TEXT_NONE;
  const repairTypeName = getJobText(data, repairTypeNameFields);
  const detail = getJobText(data, detailFields);
  const informDateTime = getJobText(data, [
    "informDateTime", "inform_date_time", "informDate", "inform_date",
  ]);
  const supplyCode = getJobText(data, ["supplyCode", "supply_code"]);
  const phone = getJobText(data, ["phone", "tel", "telephone"]);
  const deptName = getJobText(data, ["deptName", "dept_name", "department"]);
  const requesterName = getJobText(data, requesterNameFields);
  const requesterId = getJobText(data, requesterIdFields);
  const foremanName = getJobText(data, foremanNameFields);
  const foremanId = getJobText(data, foremanIdFields);
  const badgeStyle = getRepairStatusBadgeStyle(statusId);

  // Supply-request / approval detail (surfaces on the wait-approval flow).
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
  const isWaitApproval = statusId === REPAIR_STATUS_WAIT_APPROVAL;
  const isApproved = statusId === REPAIR_STATUS_PROCESSING_EQUIPMENT;
  const isApprovalRejected = statusId === REPAIR_STATUS_APPROVAL_REJECTED;
  const isSupplyFlow = isWaitApproval || isApproved || isApprovalRejected;
  // Approval result is only settled once the foreman has responded (7.1 / 7.2).
  const hasApprovalResult = isApproved || isApprovalRejected;
  // A supply request already exists for this job (equipment flag set upstream, or
  // a request detail is present) → the worker can't request supply again.
  const hasRequestedSupply =
    Boolean(data?.needEquipment) ||
    Boolean(data?.need_equipment) ||
    Boolean(requestSupplyDetail);

  const isFromNewJob = backHref === "/repair-computer/worker-new-job";
  const isFromCurrentJob = backHref === "/repair-computer/worker-current-job";
  const showAcceptReject = isFromNewJob && Boolean(jobId);
  // Worker has accepted (status 3) but not yet started → allow "Operate" (start job).
  const showOperate = isFromCurrentJob && statusId === REPAIR_STATUS_WORKER_ACCEPT;
  const showCloseJob = isFromCurrentJob && statusId === REPAIR_STATUS_WORKING;
  // Supply request approved (7.1) → worker reports the procurement result and resumes work.
  const showSupplyResult = isFromCurrentJob && isApproved;

  const pageTitle = isFromNewJob
    ? TEXT.REPAIR_COMPUTER_NEW_JOB
    : TEXT.REPAIR_COMPUTER_CURRENT_JOB;

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
          <ThemedText type="subtitle">{TEXT.SHARED_SOMETHING_WENT_WRONG}</ThemedText>
          <ThemedText style={[styles.stateMessage, styles.errorText]}>{error}</ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={loadDetail}
            style={styles.retryButton}
          >
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
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

          {informDateTime ? (
            <View style={styles.summaryMetaGrid}>
              <View style={styles.summaryMetaItem}>
                <IconSymbol name="calendar" size={15} color={c.textMuted} />
                <ThemedText style={styles.summaryMetaText} numberOfLines={2}>
                  {formatDateTime(informDateTime)}
                </ThemedText>
              </View>
            </View>
          ) : null}
        </ThemedView>

        <SectionCard title="User Inform">
          <PersonSummaryCard
            fallbackTitle="User"
            id={requesterId}
            meta={deptName ? `${TEXT.SHARED_DEPARTMENT_LABEL} ${deptName}` : undefined}
            name={requesterName}
          />
          <View style={styles.detailGrid}>
            <RowDetail
              title={TEXT.REPAIR_COMPUTER_PHONE_LABEL}
              description={phone || TEXT_NONE}
            />
            {informDateTime ? (
              <RowDetail
                title={TEXT.REPAIR_COMPUTER_INFORM_DATE_LABEL}
                description={formatDateTime(informDateTime)}
              />
            ) : null}
          </View>
        </SectionCard>

        <SectionCard title={TEXT.REPAIR_COMPUTER_DETAIL}>
          <RowDetail title="Job Type" description={repairTypeName || TEXT_NONE} />
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
                title={TEXT.REPAIR_COMPUTER_INFORM_DATE_LABEL}
                description={formatDateTime(requestSupplyDate)}
              />
            ) : null}
            <View style={styles.descriptionBox}>
              <ThemedText style={styles.rowTitle}>
                {TEXT.REPAIR_COMPUTER_DETAIL_LABEL}
              </ThemedText>
              <ThemedText style={styles.longDescription}>
                {requestSupplyDetail || TEXT_NONE}
              </ThemedText>
            </View>
          </SectionCard>
        ) : null}

        {(foremanName || foremanId) ? (
          <SectionCard title={TEXT.REPAIR_COMPUTER_ASSIGN_CONFIRM}>
            <PersonSummaryCard
              fallbackTitle={TEXT.REPAIR_COMPUTER_FOREMAN}
              id={foremanId}
              name={foremanName}
              role={TEXT.REPAIR_COMPUTER_FOREMAN}
            />
          </SectionCard>
        ) : null}
      </ScrollView>
    );
  };

  const renderFooterActions = () => {
    if (isLoading || error) {
      return null;
    }

    if (showAcceptReject) {
      return (
        <FloatingActionBar disabled={isSubmitting}>
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => setIsAcceptConfirmOpen(true)}
              style={[styles.acceptButton, isSubmitting ? styles.disabledButton : undefined]}
            >
              {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
              <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                Accept
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={handleReject}
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

    if (showOperate) {
      return (
        <FloatingActionBar disabled={isSubmitting}>
          <Pressable
            accessibilityRole="button"
            onPress={handleOperate}
            style={styles.operateButton}
          >
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              Operate
            </ThemedText>
          </Pressable>
        </FloatingActionBar>
      );
    }

    if (showSupplyResult) {
      return (
        <FloatingActionBar disabled={isSubmitting}>
          <Pressable
            accessibilityRole="button"
            onPress={handleSupplyResult}
            style={styles.operateButton}
          >
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              ผลการจัดหา
            </ThemedText>
          </Pressable>
        </FloatingActionBar>
      );
    }

    if (showCloseJob) {
      return (
        <FloatingActionBar disabled={isSubmitting}>
          {hasRequestedSupply ? (
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={handlePrintRequisition}
              style={[styles.printPdfButton, isSubmitting ? styles.disabledButton : undefined]}
            >
              <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                พิมพ์ใบเบิก
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={handleRequestSupply}
              style={[styles.requestSupplyButton, isSubmitting ? styles.disabledButton : undefined]}
            >
              <ThemedText lightColor="#b33939" darkColor="#f0a5a5" type="defaultSemiBold">
                Request Supply
              </ThemedText>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={() => setIsCloseConfirmOpen(true)}
            style={[styles.closeButton, isSubmitting ? styles.disabledButton : undefined]}
          >
            {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              Close Job
            </ThemedText>
          </Pressable>
        </FloatingActionBar>
      );
    }

    return null;
  };

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

      <Modal
        transparent
        visible={isAcceptConfirmOpen}
        animationType="fade"
        onRequestClose={() => setIsAcceptConfirmOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setIsAcceptConfirmOpen(false)}
        >
          <Pressable>
            <ThemedView style={styles.confirmModal} lightColor="#FFFFFF" darkColor="#151718">
              <ThemedText type="subtitle">Confirm Accept</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                Do you want to accept this repair computer job?
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => setIsAcceptConfirmOpen(false)}
                  style={styles.cancelButton}
                >
                  <ThemedText type="defaultSemiBold">No</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={handleAccept}
                  style={[styles.confirmButton, isSubmitting ? styles.disabledButton : undefined]}
                >
                  {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                  <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                    Yes
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={isCloseConfirmOpen}
        animationType="fade"
        onRequestClose={() => setIsCloseConfirmOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setIsCloseConfirmOpen(false)}
        >
          <Pressable>
            <ThemedView style={styles.confirmModal} lightColor="#FFFFFF" darkColor="#151718">
              <ThemedText type="subtitle">Confirm Close Job</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                Do you want to close this repair computer job?
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => setIsCloseConfirmOpen(false)}
                  style={styles.cancelButton}
                >
                  <ThemedText type="defaultSemiBold">No</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={handleCloseJob}
                  style={[styles.confirmButton, isSubmitting ? styles.disabledButton : undefined]}
                >
                  {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                  <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                    Yes
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>

      {isPdfOpen && jobId ? (
        <PdfViewerModal
          url={getRequisitionPdfUrl(jobId)}
          title="ใบเบิก"
          showPrint={false}
          onClose={() => setIsPdfOpen(false)}
        />
      ) : null}
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
  panelHeader: {
    paddingBottom: 12,
  },
  panel: {
    flex: 1,
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
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.primary,
  },
  rejectButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.primary,
  },
  operateButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.primary,
  },
  requestSupplyButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.primary,
    backgroundColor: c.surface,
  },
  printPdfButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.info,
  },
  closeButton: {
    minHeight: 48,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.text,
  },
  disabledButton: {
    opacity: 0.65,
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
});
