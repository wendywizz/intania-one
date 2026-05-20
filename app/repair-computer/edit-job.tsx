import { TEXT } from "@/constants/text";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";

import { AppToast } from "@/components/app-toast";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppFonts } from "@/constants/fonts";
import {
    REPAIR_STATUS_WAIT_WORKER,
    REPAIR_STATUS_WORKING,
} from "@/constants/type-repair-computer";
import type { RepairComputer } from "@/models/types";
import { getPersonPhoto } from "@/services/personnelService";
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
        <View style={styles.personPhotoPlaceholder}>
          <ThemedText
            lightColor="#0A6E8A"
            darkColor="#0A6E8A"
            type="defaultSemiBold"
            style={styles.personPhotoInitial}
          >
            {fallbackInitial || "?"}
          </ThemedText>
        </View>
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
      }, 900);
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

    router.push({
      pathname: "/repair-computer/worker-reject-job",
      params: { id: jobId },
    } as Parameters<typeof router.push>[0]);
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
      }, 900);
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

    const canUpdate = !isReadOnly && status === "0";
    const showReadOnlyFields = isReadOnly || status !== "0";
    const showWorkerNewJobActions =
      backHref === "/repair-computer/worker-new-job";
    const showWorkerCurrentJobActions =
      backHref === "/repair-computer/worker-current-job";
    const showWorkerOperateButton =
      showWorkerCurrentJobActions && status === REPAIR_STATUS_WAIT_WORKER;
    const showWorkerCloseJobButton =
      showWorkerCurrentJobActions && status === REPAIR_STATUS_WORKING;
    const requesterName = jobData
      ? getJobText(jobData, requesterNameFields)
      : "";
    const requesterId = jobData ? getJobText(jobData, requesterIdFields) : "";
    const foremanName = jobData ? getJobText(jobData, foremanNameFields) : "";
    const foremanId = jobData ? getJobText(jobData, foremanIdFields) : "";
    const repairTypeName = jobData
      ? getJobText(jobData, repairTypeNameFields)
      : "";
    const statusName = jobData
      ? getJobText(jobData, statusNameFields) || status
      : status;
    const informDate = jobData
      ? formatDateTime(getJobText(jobData, informDateFields))
      : "";

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
                <ThemedText type="defaultSemiBold">Job Type</ThemedText>
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
                User Inform
              </ThemedText>
              <PersonDetailCard
                fallbackTitle="User"
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
            <View style={styles.field}>
              <ThemedText type="defaultSemiBold">
                {TEXT.REPAIR_COMPUTER_DETAIL}
              </ThemedText>
              <TextInput
                multiline
                numberOfLines={2}
                onChangeText={setDetail}
                placeholder={TEXT.REPAIR_COMPUTER_DETAIL}
                placeholderTextColor="#8A969C"
                style={[styles.input, styles.textArea]}
                textAlignVertical="top"
                value={detail}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="defaultSemiBold">
                {TEXT.REPAIR_COMPUTER_SUPPLY_CODE}
              </ThemedText>
              <TextInput
                onChangeText={setSupplyCode}
                placeholder={TEXT.REPAIR_COMPUTER_SUPPLY_CODE}
                placeholderTextColor="#8A969C"
                style={styles.input}
                value={supplyCode}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="defaultSemiBold">
                {TEXT.REPAIR_COMPUTER_PHONE}
              </ThemedText>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={setPhone}
                placeholder={TEXT.REPAIR_COMPUTER_PHONE}
                placeholderTextColor="#8A969C"
                style={styles.input}
                value={phone}
              />
            </View>
          </>
        )}

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
              router.push({
                pathname: "/repair-computer/operate-job",
                params: { id: jobId },
              } as Parameters<typeof router.push>[0]);
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
      </ScrollView>
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
          <ThemedText type="subtitle">
            {isReadOnly
              ? TEXT.REPAIR_COMPUTER_JOB_DETAIL
              : TEXT.REPAIR_COMPUTER_EDIT_JOB}
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
        visible={isWorkerAcceptConfirmOpen}
        animationType="fade"
        onRequestClose={() => setIsWorkerAcceptConfirmOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setIsWorkerAcceptConfirmOpen(false)}
        >
          <Pressable>
            <ThemedView
              style={styles.confirmModal}
              lightColor="#FFFFFF"
              darkColor="#151718"
            >
              <ThemedText type="subtitle">Confirm Accept</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                Do you want to accept this repair computer job?
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isWorkerActionSubmitting}
                  onPress={() => setIsWorkerAcceptConfirmOpen(false)}
                  style={styles.cancelButton}
                >
                  <ThemedText type="defaultSemiBold">No</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isWorkerActionSubmitting}
                  onPress={handleWorkerAccept}
                  style={[
                    styles.confirmButton,
                    isWorkerActionSubmitting
                      ? styles.disabledButton
                      : undefined,
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
        visible={isWorkerCloseConfirmOpen}
        animationType="fade"
        onRequestClose={() => setIsWorkerCloseConfirmOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setIsWorkerCloseConfirmOpen(false)}
        >
          <Pressable>
            <ThemedView
              style={styles.confirmModal}
              lightColor="#FFFFFF"
              darkColor="#151718"
            >
              <ThemedText type="subtitle">Confirm Close Job</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                Do you want to close this repair computer job?
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isWorkerActionSubmitting}
                  onPress={() => setIsWorkerCloseConfirmOpen(false)}
                  style={styles.cancelButton}
                >
                  <ThemedText type="defaultSemiBold">No</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isWorkerActionSubmitting}
                  onPress={handleWorkerCloseJob}
                  style={[
                    styles.confirmButton,
                    isWorkerActionSubmitting
                      ? styles.disabledButton
                      : undefined,
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
    borderColor: "#D7E6EC",
    padding: 14,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  input: {
    minHeight: 46,
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
  textArea: {
    minHeight: 76,
  },
  readOnlyValue: {
    minHeight: 34,
    color: "#11181C",
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
    borderColor: "#D7E6EC",
    padding: 12,
  },
  personPhoto: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#E4F0F6",
  },
  personPhotoPlaceholder: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#E4F0F6",
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
    color: "#687076",
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
  updateButton: {
    minHeight: 48,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0A6E8A",
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
    backgroundColor: "#0A6E8A",
    paddingHorizontal: 18,
  },
  rejectButton: {
    minHeight: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#C44D58",
    paddingHorizontal: 18,
  },
  operateButton: {
    minHeight: 48,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0A6E8A",
    marginTop: 4,
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
