import { TEXT } from "@/constants/text";
import { router, useLocalSearchParams } from "expo-router";
import { navPush } from "@/utils/navigation";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
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
import { ConfirmDialog, IconSymbol, TextField } from "@/components/ui";
import {
    REPAIR_STATUS_WAIT_WORKER,
    REPAIR_STATUS_WORKING,
} from "@/constants/types";
import type { RepairComputer } from "@/models/types";
import { getPersonPhoto } from "@/services/personService";
import {
    getJobDetail,
    submitJob,
    update,
    workerReceiveJob,
} from "@/services/repairComputerService";
import { formatDateTime } from "@/utils/date-format";

const detailFields = [
  "detail",
  "description",
  "repairDetail",
  "repair_detail",
  "problem",
];
const supplyFields = [
  "supplyCode",
  "supply_code",
  "assetCode",
  "asset_code",
  "code",
];
const phoneFields = ["phone", "tel", "telephone"];
// Shown when a person's photo can't be loaded (or there's no staff id).
const USER_PLACEHOLDER = require("../../assets/images/user-placeholder.jpg");
const statusFields = ["status", "state", "statusId", "status_id"];
const informDateFields = [
  "informDateTime",
  "inform_date_time",
  "informDate",
  "inform_date",
  "createdAt",
  "created_at",
  "createDate",
  "create_date",
  "date",
];
const requesterNameFields = [
  "staffullName",
  "staffFullname",
  "staff_fullname",
  "requesterFullname",
  "requester_fullname",
];
const requesterIdFields = [
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
const foremanNameFields = [
  "foremanFullname",
  "foreman_fullname",
  "foremanName",
  "foreman_name",
];
const foremanIdFields = [
  "foreman",
  "FOREMAN",
  "foremanId",
  "foremanID",
  "foreman_id",
  "foremanStaffId",
  "foreman_staff_id",
  "foreman_uni_staff_id",
  "foremanUniStaffId",
];
const repairTypeNameFields = ["repairTypeName", "repair_type_name"];
const statusNameFields = ["statusName", "status_name"];

function getJobText(job: RepairComputer, fields: string[]) {
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

function normalizeStaffId(staffId: string) {
  return /^\d+$/.test(staffId) ? staffId.padStart(7, "0") : staffId;
}

function PersonDetailCard({
  fallbackTitle,
  id,
  meta,
  name,
}: {
  fallbackTitle: string;
  id: string;
  meta?: string;
  name: string;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const staffId = normalizeStaffId(id);
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(staffId) && !photoFailed;
  const fallbackInitial = (name || fallbackTitle)
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <ThemedView
      style={styles.personCard}
      lightColor="#FFFFFF"
      darkColor="#151718"
    >
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
        <ThemedText type="defaultSemiBold" style={styles.personName}>
          {name || fallbackTitle}
        </ThemedText>
        {meta ? (
          <ThemedText style={styles.personMeta}>{meta}</ThemedText>
        ) : null}
      </View>
    </ThemedView>
  );
}

export default function RepairComputerEditJobScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{
    backHref?: string | string[];
    id?: string | string[];
    readonly?: string | string[];
  }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const readOnlyParam = Array.isArray(params.readonly)
    ? params.readonly[0]
    : params.readonly;
  const backHrefParam = Array.isArray(params.backHref)
    ? params.backHref[0]
    : params.backHref;
  const isReadOnly = readOnlyParam === "true";
  const backHref = backHrefParam || "/repair-computer/current-job";
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState("");
  const [jobData, setJobData] = useState<RepairComputer | null>(null);
  const [supplyCode, setSupplyCode] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isWorkerActionSubmitting, setIsWorkerActionSubmitting] =
    useState(false);
  const [isWorkerAcceptConfirmOpen, setIsWorkerAcceptConfirmOpen] =
    useState(false);
  const [isWorkerCloseConfirmOpen, setIsWorkerCloseConfirmOpen] =
    useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "">("");

  const handleBackPress = () => {
    router.replace(backHref as Parameters<typeof router.replace>[0]);
  };

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
      setJobData(result);
      setDetail(getJobText(result, detailFields));
      setSupplyCode(getJobText(result, supplyFields));
      setPhone(getJobText(result, phoneFields));
      setStatus(getJobText(result, statusFields));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : TEXT.REPAIR_COMPUTER_UNABLE_TO_LOAD_JOB_DETAIL,
      );
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleUpdate = async () => {
    if (!jobId || isUpdating) {
      return;
    }

    setIsUpdating(true);
    setToastMessage("");
    setToastType("");

    try {
      const result = await update("inform", jobId, {
        phone: phone.trim(),
        supply_code: supplyCode.trim(),
        detail: detail.trim(),
      });

      setToastType("success");
      setToastMessage(
        result.message || TEXT.REPAIR_COMPUTER_JOB_UPDATED_SUCCESS_MESSAGE,
      );
    } catch (error) {
      setToastType("error");
      setToastMessage(
        error instanceof Error
          ? error.message
          : TEXT.REPAIR_COMPUTER_UNABLE_TO_UPDATE_JOB,
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleWorkerAccept = async () => {
    if (!jobId || isWorkerActionSubmitting) {
      return;
    }

    setIsWorkerActionSubmitting(true);
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
    } catch (error) {
      setToastType("error");
      setToastMessage(
        error instanceof Error
          ? error.message
          : TEXT.REPAIR_COMPUTER_UNABLE_TO_UPDATE_JOB,
      );
    } finally {
      setIsWorkerActionSubmitting(false);
      setIsWorkerAcceptConfirmOpen(false);
    }
  };

  const handleWorkerReject = () => {
    if (!jobId || isWorkerActionSubmitting) {
      return;
    }

    navPush({
      pathname: "/repair-computer/worker-reject-job",
      params: { id: jobId },
    } as Parameters<typeof navPush>[0]);
  };

  const handleWorkerCloseJob = async () => {
    if (!jobId || isWorkerActionSubmitting) {
      return;
    }

    setIsWorkerActionSubmitting(true);
    setToastMessage("");
    setToastType("");

    try {
      const result = await submitJob(jobId);

      setToastType("success");
      setToastMessage(
        result.message || TEXT.REPAIR_COMPUTER_JOB_UPDATED_SUCCESS_MESSAGE,
      );
      setTimeout(() => {
        router.replace("/repair-computer/worker-current-job");
      }, 1500);
    } catch (error) {
      setToastType("error");
      setToastMessage(
        error instanceof Error
          ? error.message
          : TEXT.REPAIR_COMPUTER_UNABLE_TO_UPDATE_JOB,
      );
    } finally {
      setIsWorkerActionSubmitting(false);
      setIsWorkerCloseConfirmOpen(false);
    }
  };

  const repairTypeName = jobData ? getJobText(jobData, repairTypeNameFields) : '';
  const informDate = jobData ? formatDateTime(getJobText(jobData, informDateFields)) : '';

  const canUpdate = !isReadOnly && status === "0";
  const showWorkerNewJobActions = backHref === "/repair-computer/worker-new-job";
  const showWorkerCurrentJobActions = backHref === "/repair-computer/worker-current-job";
  const showWorkerOperateButton =
    showWorkerCurrentJobActions && status === REPAIR_STATUS_WAIT_WORKER;
  const showWorkerCloseJobButton =
    showWorkerCurrentJobActions && status === REPAIR_STATUS_WORKING;

  const renderContent = () => {
    if (isLoading) {
      return (
        <LoadingAnimate
          title={TEXT.REPAIR_COMPUTER_LOADING_DETAIL}
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

    const showReadOnlyFields = isReadOnly || status !== "0";
    const requesterName = jobData
      ? getJobText(jobData, requesterNameFields)
      : "";
    const requesterId = jobData ? getJobText(jobData, requesterIdFields) : "";
    const foremanName = jobData ? getJobText(jobData, foremanNameFields) : "";
    const foremanId = jobData ? getJobText(jobData, foremanIdFields) : "";
    const statusName = jobData
      ? getJobText(jobData, statusNameFields) || status
      : status;

    return (
      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        {showReadOnlyFields ? (
          <>
            <ThemedView
              style={styles.sectionBox}
              lightColor="#FFFFFF"
              darkColor="#151718"
            >
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                {TEXT.REPAIR_COMPUTER_JOB_DETAIL}
              </ThemedText>

              <View style={styles.field}>
                <ThemedText type="defaultSemiBold">{TEXT.REPAIR_COMPUTER_JOB_TYPE}</ThemedText>
                <ThemedText style={styles.readOnlyValue}>
                  {repairTypeName || "-"}
                </ThemedText>
              </View>

              <View style={styles.field}>
                <ThemedText type="defaultSemiBold">
                  {TEXT.REPAIR_COMPUTER_DETAIL}
                </ThemedText>
                <ThemedText style={styles.readOnlyValue}>
                  {detail || "-"}
                </ThemedText>
              </View>

              <View style={styles.field}>
                <ThemedText type="defaultSemiBold">
                  {TEXT.REPAIR_COMPUTER_SUPPLY_CODE}
                </ThemedText>
                <ThemedText style={styles.readOnlyValue}>
                  {supplyCode || "-"}
                </ThemedText>
              </View>

              <View style={styles.field}>
                <ThemedText type="defaultSemiBold">
                  {TEXT.REPAIR_COMPUTER_STATUS_LABEL}
                </ThemedText>
                <ThemedText style={styles.readOnlyValue}>
                  {statusName || "-"}
                </ThemedText>
              </View>

              <View style={styles.field}>
                <ThemedText type="defaultSemiBold">
                  {TEXT.REPAIR_COMPUTER_INFORM_DATE_LABEL}
                </ThemedText>
                <ThemedText style={styles.readOnlyValue}>
                  {informDate || "-"}
                </ThemedText>
              </View>
            </ThemedView>

            <ThemedView
              style={styles.sectionBox}
              lightColor="#FFFFFF"
              darkColor="#151718"
            >
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                {TEXT.REPAIR_COMPUTER_INFORMER_SECTION}
              </ThemedText>
              <PersonDetailCard
                fallbackTitle={TEXT.REPAIR_COMPUTER_INFORMER_NAME}
                id={requesterId}
                meta={`${TEXT.REPAIR_COMPUTER_PHONE}: ${phone || "-"}`}
                name={requesterName}
              />
            </ThemedView>

            <ThemedView
              style={styles.sectionBox}
              lightColor="#FFFFFF"
              darkColor="#151718"
            >
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                {TEXT.REPAIR_COMPUTER_FOREMAN}
              </ThemedText>
              <PersonDetailCard
                fallbackTitle={TEXT.REPAIR_COMPUTER_FOREMAN}
                id={foremanId}
                name={foremanName}
              />
            </ThemedView>
          </>
        ) : (
          <>
            <TextField
              label={TEXT.REPAIR_COMPUTER_DETAIL}
              multiline
              numberOfLines={2}
              style={{ minHeight: 60 }}
              value={detail}
              onChangeText={setDetail}
              placeholder={TEXT.REPAIR_COMPUTER_DETAIL}
            />
            <TextField
              label={TEXT.REPAIR_COMPUTER_SUPPLY_CODE}
              value={supplyCode}
              onChangeText={setSupplyCode}
              placeholder={TEXT.REPAIR_COMPUTER_SUPPLY_CODE}
            />
            <TextField
              label={TEXT.REPAIR_COMPUTER_PHONE}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              placeholder={TEXT.REPAIR_COMPUTER_PHONE}
            />
          </>
        )}

      </ScrollView>
    );
  };

  const renderFooterActions = () => {
    if (isLoading || error) {
      return null;
    }

    if (
      !canUpdate &&
      !showWorkerNewJobActions &&
      !showWorkerOperateButton &&
      !showWorkerCloseJobButton
    ) {
      return null;
    }

    return (
      <FloatingActionBar disabled={isUpdating || isWorkerActionSubmitting}>
        {canUpdate ? (
          <Pressable
            accessibilityRole="button"
            disabled={isUpdating}
            onPress={handleUpdate}
            style={[
              styles.updateButton,
              isUpdating ? styles.disabledButton : undefined,
            ]}
          >
            {isUpdating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : null}
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              type="defaultSemiBold"
            >
              {isUpdating ? TEXT.SHARED_UPDATING : TEXT.SHARED_UPDATE}
            </ThemedText>
          </Pressable>
        ) : null}

        {showWorkerNewJobActions ? (
          <View style={styles.workerActionRow}>
            <Pressable
              accessibilityRole="button"
              disabled={isWorkerActionSubmitting}
              onPress={() => setIsWorkerAcceptConfirmOpen(true)}
              style={[
                styles.acceptButton,
                isWorkerActionSubmitting ? styles.disabledButton : undefined,
              ]}
            >
              {isWorkerActionSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : null}
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
              disabled={isWorkerActionSubmitting}
              onPress={handleWorkerReject}
              style={[
                styles.rejectButton,
                isWorkerActionSubmitting ? styles.disabledButton : undefined,
              ]}
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

        {showWorkerOperateButton ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              navPush({
                pathname: "/repair-computer/operate-job",
                params: { id: jobId },
              } as Parameters<typeof navPush>[0]);
            }}
            style={styles.operateButton}
          >
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              type="defaultSemiBold"
            >
              Operate
            </ThemedText>
          </Pressable>
        ) : null}

        {showWorkerCloseJobButton ? (
          <Pressable
            accessibilityRole="button"
            disabled={isWorkerActionSubmitting}
            onPress={() => setIsWorkerCloseConfirmOpen(true)}
            style={[
              styles.operateButton,
              isWorkerActionSubmitting ? styles.disabledButton : undefined,
            ]}
          >
            {isWorkerActionSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : null}
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              type="defaultSemiBold"
            >
              Close Job
            </ThemedText>
          </Pressable>
        ) : null}
      </FloatingActionBar>
    );
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
          <View style={styles.panelHeader}>
            <ThemedText type="subtitle" numberOfLines={2}>
              {repairTypeName ||
                (isReadOnly
                  ? TEXT.REPAIR_COMPUTER_JOB_DETAIL
                  : TEXT.REPAIR_COMPUTER_EDIT_JOB)}
            </ThemedText>
            {supplyCode ? (
              <ThemedText style={styles.panelSubtitle}>
                {TEXT.REPAIR_COMPUTER_SUPPLY_CODE_LABEL} {supplyCode}
              </ThemedText>
            ) : null}
            {informDate ? (
              <View style={styles.panelDateRow}>
                <IconSymbol name="calendar" size={13} color={c.textMuted} />
                <ThemedText style={styles.panelMeta}>{informDate}</ThemedText>
              </View>
            ) : null}
          </View>
          {renderContent()}
        </ThemedView>
      </View>

      {renderFooterActions()}

      <AppToast
        message={toastMessage}
        type={toastType === "error" ? "error" : "success"}
      />

      <ConfirmDialog
        visible={isWorkerAcceptConfirmOpen}
        title={TEXT.REPAIR_COMPUTER_ACCEPT_CONFIRM_TITLE}
        message={TEXT.REPAIR_COMPUTER_ACCEPT_CONFIRM_MESSAGE}
        confirmLabel={TEXT.SHARED_YES}
        cancelLabel={TEXT.SHARED_NO}
        loading={isWorkerActionSubmitting}
        onConfirm={handleWorkerAccept}
        onCancel={() => setIsWorkerAcceptConfirmOpen(false)}
      />

      <ConfirmDialog
        visible={isWorkerCloseConfirmOpen}
        title={TEXT.REPAIR_COMPUTER_CLOSE_CONFIRM_TITLE}
        message={TEXT.REPAIR_COMPUTER_CLOSE_CONFIRM_MESSAGE}
        confirmLabel={TEXT.SHARED_YES}
        cancelLabel={TEXT.SHARED_NO}
        loading={isWorkerActionSubmitting}
        onConfirm={handleWorkerCloseJob}
        onCancel={() => setIsWorkerCloseConfirmOpen(false)}
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  panelHeader: {
    gap: 4,
    paddingBottom: 4,
  },
  panelSubtitle: {
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  panelDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  panelMeta: {
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  form: {
    gap: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  field: {
    gap: 8,
  },
  sectionBox: {
    gap: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  readOnlyValue: {
    minHeight: 34,
    color: c.text,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 6,
  },
  personCard: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 12,
  },
  personPhoto: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: c.surfaceMuted,
  },
  personPhotoPlaceholder: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.surfaceMuted,
  },
  personPhotoInitial: {
    fontSize: 20,
    lineHeight: 26,
  },
  personText: {
    flex: 1,
  },
  personName: {
    fontSize: 15,
    lineHeight: 21,
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
  updateButton: {
    minHeight: 48,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.primary,
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.65,
  },
  workerActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  acceptButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.primary,
    paddingHorizontal: 18,
  },
  rejectButton: {
    minHeight: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.primary,
    paddingHorizontal: 18,
  },
  operateButton: {
    minHeight: 48,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.primary,
    marginTop: 4,
    paddingHorizontal: 18,
  },
});
