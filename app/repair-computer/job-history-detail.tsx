import { TEXT } from "@/constants/text";
import { router, useLocalSearchParams } from "expo-router";
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

import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { SectionCard } from "@/components/section-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { DetailInfoCard } from "@/components/ui/detail-info-card";
import { PersonListCard, type PersonListEntry } from "@/components/ui/person-list-card";
import type { RepairComputer } from "@/models/types";
import { getPersonPhoto } from "@/services/personService";
import { getJobDetail } from "@/services/repairComputerService";
import { formatDateTime } from "@/utils/date-format";
import { getRepairStatusBadgeStyle } from "@/utils/repair-computer-status";
import { USER_PLACEHOLDER } from "@/constants/images";

const TEXT_NONE = "-";
const TEXT_RC_NO_SUPPLYCODE = "No supply code";

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

export default function JobHistoryDetailScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{
    backHref?: string | string[];
    id?: string | string[];
  }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const backHrefParam = Array.isArray(params.backHref) ? params.backHref[0] : params.backHref;
  const backHref = backHrefParam || "/repair-computer/(tabs)";
  const [data, setData] = useState<RepairComputer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDetail = useCallback(async () => {
    if (!jobId) {
      setError(TEXT.REPAIR_COMPUTER_UNABLE_TO_LOAD_JOB_DETAIL);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
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
  const workerName = getJobText(data, workerNameFields);
  const workerId = getJobText(data, workerIdFields);
  const badgeStyle = getRepairStatusBadgeStyle(statusId);
  // Foreman role (reached from the foreman history / manage-job flows): the
  // viewer is the foreman, so their own row is hidden and the card is retitled.
  const isForemanRole = /foreman|manage-job/.test(backHref);
  const isWorkerRole = /worker/.test(backHref);
  // Informer role: the viewer is the reporter, so their own "informer" card is
  // redundant and hidden.
  const isInformerRole = !isForemanRole && !isWorkerRole;
  // In the assignment card, hide the viewer's own row (foreman hides foreman,
  // worker hides worker).
  const showWorker = !isWorkerRole && Boolean(workerName || workerId);
  const showForeman = !isForemanRole && Boolean(foremanName || foremanId);

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
            { label: TEXT.REPAIR_COMPUTER_REPAIR_TYPE_LABEL, value: repairTypeName, icon: "wrench.fill" },
            { label: TEXT.REPAIR_COMPUTER_SUPPLY_CODE_LABEL, value: supplyCode, icon: "doc.text.fill" },
            {
              label: TEXT.REPAIR_COMPUTER_INFORM_DATE_LABEL,
              value: informDateTime ? formatDateTime(informDateTime) : "",
              icon: "calendar",
            },
            // The reporter's own words are the point of a history record, so the
            // row stays even when they left it blank — an explicit "-" reads as
            // "nothing was written", where a missing row reads as a bug.
            { label: TEXT.REPAIR_COMPUTER_DETAIL_LABEL, value: detail || TEXT_NONE, icon: "text.bubble" },
          ]}
        />

        {!isInformerRole ? (
          <SectionCard title={TEXT.REPAIR_COMPUTER_INFORMER_SECTION}>
            <PersonSummaryCard
              fallbackTitle="User"
              id={requesterId}
              meta={[deptName, phone].filter(Boolean).join(" · ") || undefined}
              name={requesterName}
            />
          </SectionCard>
        ) : null}

        {showWorker || showForeman ? (
          <PersonListCard
            title={TEXT.REPAIR_COMPUTER_JOB_ASSIGNMENT}
            showCount={false}
            people={[
              ...(showWorker
                ? [{
                    key: "worker",
                    name: workerName || TEXT.REPAIR_COMPUTER_WORKER,
                    subtitle: TEXT.REPAIR_COMPUTER_WORKER,
                    photoStaffId: normalizeStaffId(workerId),
                  } as PersonListEntry]
                : []),
              ...(showForeman
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
