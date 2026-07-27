import { useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { ErrorState } from "@/components/error-state";
import { LoadingAnimate } from "@/components/loading-animate";
import { ScreenHeader } from "@/components/screen-header";
import { SectionCard } from "@/components/section-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { DetailInfoCard } from "@/components/ui/detail-info-card";
import { UserAvatar } from "@/components/user-avatar";
import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import {
  getForgetRecordDetail,
  type TimestampApproved,
  type TimestampRecordDetail,
} from "@/services/timestampService";
import { formatFullDate } from "@/utils/date-format";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function parseItemParam(value?: string | string[]): TimestampApproved {
  const raw = firstParam(value);
  if (!raw) return { id: "" };
  try {
    return JSON.parse(raw) as TimestampApproved;
  } catch {
    return { id: "" };
  }
}

// "08:00:00" -> "08:00"; blank/placeholder -> "".
function formatTime(value?: string | null) {
  const text = String(value ?? "").trim();
  if (!text || text === "00:00:00" || text === "00:00") return "";
  const match = text.match(/(\d{1,2})[:.](\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "";
}

function getStatusBadge(status: string): { bg: string; color: string } {
  if (status === "1") return { bg: "#D1FAE5", color: "#065F46" };
  if (status === "2") return { bg: "#FEE2E2", color: "#991B1B" };
  return { bg: "#FEF3C7", color: "#92400E" };
}

function PersonRow({
  name,
  position,
  staffId,
}: {
  name: string;
  position: string;
  staffId?: string | number | null;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  if (!name && !position) return null;
  return (
    <View style={styles.personRow}>
      <UserAvatar staffId={staffId} size={44} />
      <View style={styles.personText}>
        {name ? <ThemedText style={styles.personName}>{name}</ThemedText> : null}
        {position ? <ThemedText style={styles.personPosition}>{position}</ThemedText> : null}
      </View>
    </View>
  );
}

export default function TimestampRecordDetailScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ forgetId?: string; item?: string }>();
  const forgetId = firstParam(params.forgetId);
  const fallback = useMemo(() => parseItemParam(params.item), [params.item]);

  const [detail, setDetail] = useState<TimestampRecordDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!forgetId) {
      setError(TEXT.SHARED_SOMETHING_WENT_WRONG);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const data = await getForgetRecordDetail(forgetId);
      setDetail(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : TEXT.SHARED_SOMETHING_WENT_WRONG,
      );
    } finally {
      setIsLoading(false);
    }
  }, [forgetId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const typeLabel = String(detail?.approveName ?? fallback.approveName ?? TEXT.TIMESTAMP_FORGOT_TAB);
  const statusCode = String(detail?.status ?? fallback.status ?? "");
  const statusName =
    String(detail?.statusName ?? fallback.statusName ?? "") ||
    (statusCode === "1"
      ? TEXT.TIMESTAMP_APPROVE_STATUS_APPROVED
      : statusCode === "2"
        ? TEXT.TIMESTAMP_APPROVE_STATUS_REJECTED
        : TEXT.TIMESTAMP_APPROVE_STATUS_PENDING);
  const statusBadge = getStatusBadge(statusCode);

  const stampDate = detail?.stampDate ? formatFullDate(String(detail.stampDate)) : "";
  const writeDate = detail?.writeDate ? formatFullDate(String(detail.writeDate)) : "";
  const decisionDate = detail?.decisionDate ? formatFullDate(String(detail.decisionDate)) : "";
  const inTime = formatTime(detail?.inTime);
  const outTime = formatTime(detail?.outTime);
  const reason = String(detail?.reason ?? "");
  const decisionReason = String(detail?.decisionReason ?? "");

  const requesterName = String(detail?.fullname ?? detail?.name ?? fallback.name ?? "");
  const requesterPosition = String(detail?.positionName ?? "");
  const requesterDept = String(detail?.deptName ?? "");
  const requesterStaffId = detail?.uniStaffId ?? fallback.uniStaffId;
  const approverName = String(detail?.approverName ?? "");
  const approverPosition = String(detail?.approverPositionName ?? "");
  const approverStaffId = detail?.approverUniStaffId;

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={typeLabel}
        backHref={{ pathname: "/timestamp/approve", params: { tab: "history" } } as Href}
        titleInNavBar
        tone="primary"
      />

      {isLoading ? (
        <LoadingAnimate
          title={TEXT.SHARED_LOADING_DATA_TITLE}
          desc={TEXT.SHARED_LOADING_DESCRIPTION}
        />
      ) : error ? (
        <ErrorState
          title={TEXT.SHARED_ERROR_TITLE_THAI}
          message={error}
          onRetry={() => load()}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Miss-timestamp info — same titled card + icon/label/value rows as the
              absence detail screen. */}
          <DetailInfoCard
            title={TEXT.TIMESTAMP_RECORD_INFO_SECTION}
            trailing={
              statusName ? (
                <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                  <ThemedText style={[styles.statusText, { color: statusBadge.color }]}>
                    {statusName}
                  </ThemedText>
                </View>
              ) : null
            }
            rows={[
              { label: TEXT.TIMESTAMP_APPROVE_STAMP_DATE_LABEL, value: stampDate, icon: "calendar" },
              { label: TEXT.TIMESTAMP_APPROVE_IN_TIME_LABEL, value: inTime, icon: "clock.fill" },
              { label: TEXT.TIMESTAMP_APPROVE_OUT_TIME_LABEL, value: outTime, icon: "clock.fill" },
              { label: TEXT.TIMESTAMP_APPROVE_WRITE_DATE_LABEL, value: writeDate, icon: "calendar" },
              { label: TEXT.TIMESTAMP_APPROVE_REASON_LABEL, value: reason, icon: "list.bullet" },
            ]}
          />

          {/* Requester card */}
          {requesterName || requesterPosition || requesterDept ? (
            <SectionCard title={TEXT.TIMESTAMP_APPROVE_REQUESTER_LABEL}>
              <PersonRow
                name={requesterName}
                position={[requesterPosition, requesterDept].filter(Boolean).join(" · ")}
                staffId={requesterStaffId}
              />
            </SectionCard>
          ) : null}

          {/* Approver card */}
          {approverName || approverPosition ? (
            <SectionCard title={TEXT.TIMESTAMP_FIELD_APPROVER}>
              <PersonRow name={approverName || approverPosition} position={approverName ? approverPosition : ""} staffId={approverStaffId} />
            </SectionCard>
          ) : null}

          {/* Approval decision */}
          <DetailInfoCard
            title={TEXT.TIMESTAMP_DECISION_SECTION}
            rows={[
              { label: TEXT.TIMESTAMP_APPROVE_DECISION_DATE_LABEL, value: decisionDate, icon: "calendar" },
              { label: TEXT.TIMESTAMP_APPROVE_COMMENT_LABEL, value: decisionReason, icon: "list.bullet" },
            ]}
          />
        </ScrollView>
      )}
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: c.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: c.textMuted,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  typeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.primarySoft,
  },
  infoType: {
    flex: 1,
    fontFamily: AppFonts.psuBold,
    fontSize: 17,
    lineHeight: 24,
    color: c.text,
  },
  statusBadge: {
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  statusText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 12,
    lineHeight: 16,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cell: {
    backgroundColor: c.surfaceAlt,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  cellHalf: {
    flexBasis: "47%",
    flexGrow: 1,
  },
  cellWide: {
    flexBasis: "100%",
  },
  cellLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: c.textFaint,
  },
  cellValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cellValue: {
    flex: 1,
    fontFamily: AppFonts.psuRegular,
    fontSize: 15,
    lineHeight: 22,
    color: c.text,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.primarySoft,
  },
  personText: {
    flex: 1,
    gap: 3,
  },
  personName: {
    fontFamily: AppFonts.psuBold,
    fontSize: 15,
    lineHeight: 21,
    color: c.text,
  },
  personPosition: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
  },
});
