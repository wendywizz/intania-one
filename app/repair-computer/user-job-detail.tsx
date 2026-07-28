import { TEXT } from "@/constants/text";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { AppToast } from "@/components/app-toast";
import { SubmittingOverlay } from "@/components/submitting-overlay";
import { FloatingActionBar } from "@/components/floating-action-bar";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { SectionCard } from "@/components/section-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button, ConfirmDialog } from "@/components/ui";
import { DetailInfoCard } from "@/components/ui/detail-info-card";
import { AppFonts } from "@/constants/fonts";
import { PersonListCard, type PersonListEntry } from "@/components/ui/person-list-card";
import { REPAIR_STATUS_NEW_JOB } from "@/constants/types";
import type { RepairComputer } from "@/models/types";
import { getPersonPhoto } from "@/services/personService";
import { getJobDetail, update } from "@/services/repairComputerService";
import { formatDateTime } from "@/utils/date-format";
import { getRepairStatusBadgeStyle } from "@/utils/repair-computer-status";
import { USER_PLACEHOLDER } from "@/constants/images";

const TEXT_NONE = "-";
// Remove the default focus outline on web so active inputs match the
// borderless underline style (RN Web only; no-op on native).
const webNoOutline: any = Platform.OS === "web" ? { outlineStyle: "none" } : null;

const detailFields = ["detail", "description", "repairDetail", "repair_detail", "problem"];
const repairTypeNameFields = ["repairTypeName", "repair_type_name", "problemTypeName", "problem_type_name"];
const requesterNameFields = ["staffFullname", "staff_fullname", "staffullName", "requesterFullname", "requester_fullname"];
const requesterIdFields = [
  "staff_uni_id", "staffUniId", "staffUNIId", "STAFF_UNI_ID",
  "staffId", "staffID", "staff_id", "STAFF_ID", "STAFFID",
  "UNI_STAFF_ID", "uni_staff_id", "uniStaffId", "uniStaffID",
  "requesterId", "requester_id", "informStaffId", "inform_staff_id",
];
const workerNameFields = ["workerFullname", "worker_fullname", "workerName", "worker_name"];
const workerIdFields = [
  "worker_uni_id", "workerUniId", "workerUNIId", "WORKER_UNI_ID",
  "worker", "workerId", "workerID", "worker_id", "workerStaffId", "worker_staff_id",
];
const foremanNameFields = ["foremanFullname", "foreman_fullname", "foremanName", "foreman_name"];
const foremanIdFields = [
  "foreman_uni_id", "foremanUniId", "foremanUNIId", "FOREMAN_UNI_ID",
  "foreman", "foremanId", "foremanID", "foreman_id", "foremanStaffId", "foreman_staff_id",
];
const statusNameFields = ["statusName", "status_name", "statusLabel", "status_label"];
const statusIdFields = ["status", "state", "statusId", "status_id"];
const supplyCodeFields = ["supplyCode", "supply_code"];
const phoneFields = ["phone", "tel", "telephone"];

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

// Avatar + name + role/meta row, matching the absence detail person rows.
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
  const styles = useThemedStyles(makeStyles);
  const staffId = normalizeStaffId(id);
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(staffId) && !photoFailed;
  const position = [role, meta].filter(Boolean).join(" · ");

  return (
    <View style={styles.personRow}>
      <Image
        onError={() => setPhotoFailed(true)}
        source={showPhoto ? { uri: getPersonPhoto({ staffId }) } : USER_PLACEHOLDER}
        style={styles.personAvatar}
      />
      <View style={styles.personText}>
        <ThemedText style={styles.personName} numberOfLines={2}>
          {name || fallbackTitle}
        </ThemedText>
        {position ? (
          <ThemedText style={styles.personPosition} numberOfLines={2}>
            {position}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

export default function UserJobDetailScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{
    backHref?: string | string[];
    id?: string | string[];
  }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const backHrefParam = Array.isArray(params.backHref) ? params.backHref[0] : params.backHref;
  const backHref = backHrefParam || "/repair-computer/current-job";

  const [data, setData] = useState<RepairComputer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState("");
  const [supplyCode, setSupplyCode] = useState("");
  const [phone, setPhone] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
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
      setDetail(getJobText(result, detailFields));
      setSupplyCode(getJobText(result, supplyCodeFields));
      setPhone(getJobText(result, phoneFields));
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

  const handleUpdate = async () => {
    if (!jobId || isUpdating) return;
    setIsConfirmOpen(false);
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
    } catch (err) {
      setToastType("error");
      setToastMessage(
        err instanceof Error
          ? err.message
          : TEXT.REPAIR_COMPUTER_UNABLE_TO_UPDATE_JOB,
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBackPress = () => {
    router.replace(backHref as Parameters<typeof router.replace>[0]);
  };

  const statusId = getJobText(data, statusIdFields);
  const isEditable = statusId === REPAIR_STATUS_NEW_JOB || statusId === "";
  const statusName = getJobText(data, statusNameFields) || statusId || TEXT_NONE;
  const repairTypeName = getJobText(data, repairTypeNameFields);
  const informDateTime = getJobText(data, [
    "informDateTime", "inform_date_time", "informDate", "inform_date",
  ]);
  const deptName = getJobText(data, ["deptName", "dept_name", "department"]);
  const requesterName = getJobText(data, requesterNameFields);
  const requesterId = getJobText(data, requesterIdFields);
  const foremanName = getJobText(data, foremanNameFields);
  const foremanId = getJobText(data, foremanIdFields);
  const workerName = getJobText(data, workerNameFields);
  const workerId = getJobText(data, workerIdFields);
  const badgeStyle = getRepairStatusBadgeStyle(statusId);
  const hasAssignedStaff = Boolean(workerName || workerId || foremanName || foremanId);

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
      <ScrollView
        contentContainerStyle={styles.form}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Job info — titled card + icon/label/value rows, like absence detail. */}
        <DetailInfoCard
          title={TEXT.REPAIR_COMPUTER_JOB_DETAIL}
          trailing={
            <View style={[styles.statusBadge, { backgroundColor: badgeStyle.background }]}>
              <ThemedText
                style={[styles.statusBadgeText, { color: badgeStyle.text }]}
                numberOfLines={1}
              >
                {statusName}
              </ThemedText>
            </View>
          }
          rows={[
            { label: TEXT.REPAIR_COMPUTER_DETAIL, value: repairTypeName, icon: "wrench.fill" },
            ...(isEditable
              ? []
              : [
                  { label: TEXT.REPAIR_COMPUTER_SUPPLY_CODE_LABEL, value: supplyCode, icon: "doc.text.fill" as const },
                  { label: TEXT.REPAIR_COMPUTER_PHONE_LABEL, value: phone, icon: "phone.fill" as const },
                ]),
            {
              label: TEXT.REPAIR_COMPUTER_INFORM_DATE_LABEL,
              value: informDateTime ? formatDateTime(informDateTime) : "",
              icon: "calendar",
            },
            ...(isEditable
              ? []
              : [{ label: TEXT.REPAIR_COMPUTER_DETAIL_LABEL, value: detail, icon: "text.bubble" as const }]),
          ]}
        />

        {isEditable ? (
          <>
            <SectionCard>
              <View style={styles.field}>
                <ThemedText style={styles.fieldLabel}>
                  {TEXT.REPAIR_COMPUTER_DETAIL}
                </ThemedText>
                <TextInput
                  multiline
                  numberOfLines={2}
                  value={detail}
                  onChangeText={setDetail}
                  placeholder={TEXT.REPAIR_COMPUTER_DETAIL_PLACEHOLDER}
                  placeholderTextColor={c.textFaint}
                  style={[styles.input, styles.textArea, webNoOutline]}
                />
              </View>
            </SectionCard>

            <SectionCard>
              <View style={styles.field}>
                <ThemedText style={styles.fieldLabel}>
                  {TEXT.REPAIR_COMPUTER_SUPPLY_CODE}
                  <ThemedText style={styles.optionalMark}>
                    {" "}
                    {TEXT.REPAIR_COMPUTER_OPTIONAL}
                  </ThemedText>
                </ThemedText>
                <TextInput
                  value={supplyCode}
                  onChangeText={setSupplyCode}
                  placeholder={TEXT.REPAIR_COMPUTER_SUPPLY_CODE_PLACEHOLDER}
                  placeholderTextColor={c.textFaint}
                  style={[styles.input, webNoOutline]}
                />
              </View>
            </SectionCard>

            <SectionCard>
              <View style={styles.field}>
                <ThemedText style={styles.fieldLabel}>
                  {TEXT.REPAIR_COMPUTER_PHONE}
                </ThemedText>
                <TextInput
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={TEXT.REPAIR_COMPUTER_PHONE_PLACEHOLDER}
                  placeholderTextColor={c.textFaint}
                  style={[styles.input, webNoOutline]}
                />
              </View>
            </SectionCard>
          </>
        ) : null}

        {!isEditable && hasAssignedStaff ? (
          <PersonListCard
            title={TEXT.REPAIR_COMPUTER_JOB_ASSIGNMENT}
            showCount={false}
            people={[
              ...((workerName || workerId)
                ? [{
                    key: "worker",
                    name: workerName || TEXT.REPAIR_COMPUTER_WORKER,
                    subtitle: TEXT.REPAIR_COMPUTER_WORKER,
                    photoStaffId: normalizeStaffId(workerId),
                  } as PersonListEntry]
                : []),
              ...((foremanName || foremanId)
                ? [{
                    key: "foreman",
                    name: foremanName || TEXT.REPAIR_COMPUTER_FOREMAN,
                    subtitle: TEXT.REPAIR_COMPUTER_FOREMAN,
                    photoStaffId: normalizeStaffId(foremanId),
                  } as PersonListEntry]
                : []),
            ]}
          />
        ) : null}

      </ScrollView>
    );
  };

  const renderFooterActions = () => {
    if (isLoading || error || !isEditable) {
      return null;
    }

    return (
      <FloatingActionBar disabled={isUpdating}>
        <Button
          title={TEXT.SHARED_UPDATE}
          fullWidth
          loading={isUpdating}
          onPress={() => setIsConfirmOpen(true)}
        />
      </FloatingActionBar>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={jobId ? `${TEXT.REPAIR_COMPUTER_JOB_ID_LABEL} ${jobId}` : TEXT.REPAIR_COMPUTER_TITLE}
        onBackPress={handleBackPress}
        showBackButton
        tone="primary"
      />
      <View style={styles.content}>
        <View style={styles.panel}>
          {renderContent()}
        </View>
      </View>

      {renderFooterActions()}

      <ConfirmDialog
        visible={isConfirmOpen}
        title={TEXT.REPAIR_COMPUTER_UPDATE_CONFIRM_TITLE}
        message={TEXT.REPAIR_COMPUTER_UPDATE_CONFIRM_MESSAGE}
        confirmLabel={TEXT.SHARED_UPDATE}
        cancelLabel={TEXT.CANCEL}
        loading={isUpdating}
        onConfirm={handleUpdate}
        onCancel={() => setIsConfirmOpen(false)}
      />

      <AppToast
        message={toastMessage}
        type={toastType === "error" ? "error" : "success"}
      />
      <SubmittingOverlay visible={isUpdating} />
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
  optionalMark: {
    color: c.textMuted,
    fontSize: 13,
    fontFamily: AppFonts.psuRegular,
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
    borderBottomColor: c.inputBorder,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: "top",
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
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  personAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.surfaceMuted,
  },
  personText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  personName: {
    fontSize: 15,
    lineHeight: 21,
    color: c.text,
    fontWeight: "700",
  },
  personPosition: {
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  assignBody: {
    marginTop: 8,
    gap: 14,
  },
  personDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
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
    backgroundColor: c.pomegranate,
    marginTop: 24,
  },
});
