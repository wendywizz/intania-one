import { useLocalSearchParams, type Href } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { ScreenHeader } from "@/components/screen-header";
import { SectionCard } from "@/components/section-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { DetailInfoCard } from "@/components/ui/detail-info-card";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { UserAvatar } from "@/components/user-avatar";
import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import type { TimestampHistory } from "@/services/timestampService";
import { formatFullDate } from "@/utils/date-format";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function parseItem(value?: string | string[]): TimestampHistory {
  const raw = firstParam(value);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as TimestampHistory) : {};
  } catch {
    return {};
  }
}

function getText(item: TimestampHistory, fields: string[]) {
  for (const field of fields) {
    const value = item[field];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

// "08:00:00" -> "08:00"; blank/placeholder -> "".
function formatTime(value?: string | null) {
  const text = String(value ?? "").trim();
  if (!text || text === "00:00:00" || text === "00:00") return "";
  const match = text.match(/(\d{1,2})[:.](\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "";
}

function getStampTypeLabel(stampType: string) {
  if (stampType === "in") return TEXT.TIMESTAMP_STAMP_IN_TYPE;
  if (stampType === "out") return TEXT.TIMESTAMP_STAMP_OUT_TYPE;
  if (stampType === "all") return TEXT.TIMESTAMP_STAMP_ALL;
  return stampType || TEXT.TIMESTAMP_FORGOT_TAB;
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

// The approval decision rows (date, comment) rendered under the approver in the
// same card, using the DetailInfoCard row look.
function DecisionRows({
  rows,
}: {
  rows: { label: string; value: string; icon?: IconSymbolName }[];
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const visible = rows.filter((row) => row.value);
  if (!visible.length) return null;
  return (
    <View style={styles.decisionBlock}>
      {visible.map((row, index) => (
        <View
          key={row.label}
          style={[styles.detailRow, index === visible.length - 1 ? styles.detailRowLast : undefined]}
        >
          {row.icon ? <IconSymbol name={row.icon} size={22} color={c.inverse} /> : null}
          <View style={styles.detailRowText}>
            <ThemedText style={styles.detailRowLabel}>{row.label}</ThemedText>
            <ThemedText style={styles.detailRowValue}>{row.value}</ThemedText>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function TimestampHistoryDetailScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ item?: string }>();
  const item = useMemo(() => parseItem(params.item), [params.item]);

  const stampType = getText(item, ["stampType", "stamp_type", "type"]).toLowerCase();
  const typeLabel = getStampTypeLabel(stampType);

  const statusCode = getText(item, ["status", "approvalStatus", "approval_status"]);
  const statusName =
    statusCode === "1"
      ? TEXT.TIMESTAMP_APPROVE_STATUS_APPROVED
      : statusCode === "2"
        ? TEXT.TIMESTAMP_APPROVE_STATUS_REJECTED
        : TEXT.TIMESTAMP_APPROVE_STATUS_PENDING;
  const statusBadge = getStatusBadge(statusCode);

  const stampDate = getText(item, ["stampDate", "stamp_date", "workDate", "work_date"]);
  const stampDateLabel = stampDate ? formatFullDate(stampDate) : "";
  const writeDate = getText(item, ["writeDate", "write_date", "requestDate", "request_date"]);
  const writeDateLabel = writeDate ? formatFullDate(writeDate) : "";
  const inTime = formatTime(getText(item, ["inTime", "in_time"]));
  const outTime = formatTime(getText(item, ["outTime", "out_time"]));
  const reason = getText(item, ["reason", "detail", "description"]);

  const requesterName = getText(item, ["name", "staffName", "staff_name", "fullname"]);
  const requesterPosition = getText(item, ["positionName", "position_name"]);
  const requesterDept = getText(item, ["deptName", "dept_name"]);
  const requesterStaffId = getText(item, ["uniStaffId", "uni_staff_id"]);

  const approverName = getText(item, ["approverName", "approver_name"]);
  const approverPosition = getText(item, ["approverPositionName", "approver_position_name"]);
  const approverStaffId = getText(item, ["approverUniStaffId", "approver_uni_staff_id"]);
  const decisionDate = getText(item, ["decisionDate", "decision_date"]);
  const decisionDateLabel = decisionDate ? formatFullDate(decisionDate) : "";
  const decisionReason = getText(item, ["decisionReason", "decision_reason"]);

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={typeLabel}
        backHref={{ pathname: "/timestamp/forgot-timestamp", params: { tab: "history" } } as Href}
        titleInNavBar
      />

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
            { label: TEXT.TIMESTAMP_APPROVE_STAMP_DATE_LABEL, value: stampDateLabel, icon: "calendar" },
            // "ขาดงาน" (stampType "all") misses both stamps, so show in & out on
            // one combined row instead of two separate ones.
            ...(stampType === "all"
              ? [{
                  label: TEXT.TIMESTAMP_APPROVE_IN_OUT_TIME_LABEL,
                  value: [inTime, outTime].filter(Boolean).join(" - "),
                  icon: "clock.fill" as const,
                }]
              : [
                  { label: TEXT.TIMESTAMP_APPROVE_IN_TIME_LABEL, value: inTime, icon: "clock.fill" as const },
                  { label: TEXT.TIMESTAMP_APPROVE_OUT_TIME_LABEL, value: outTime, icon: "clock.fill" as const },
                ]),
            { label: TEXT.TIMESTAMP_APPROVE_WRITE_DATE_LABEL, value: writeDateLabel, icon: "calendar" },
            { label: TEXT.TIMESTAMP_APPROVE_REASON_LABEL, value: reason, icon: "list.bullet" },
          ]}
        />

        {/* Approver + the approval decision in one section */}
        {approverName || approverPosition || decisionDateLabel || decisionReason ? (
          <SectionCard title={TEXT.TIMESTAMP_FIELD_APPROVER}>
            <PersonRow
              name={approverName || approverPosition}
              position={approverName ? approverPosition : ""}
              staffId={approverStaffId}
            />
            <DecisionRows
              rows={[
                { label: TEXT.TIMESTAMP_APPROVE_DECISION_DATE_LABEL, value: decisionDateLabel, icon: "calendar" },
                { label: TEXT.TIMESTAMP_APPROVE_COMMENT_LABEL, value: decisionReason, icon: "text.bubble" },
              ]}
            />
          </SectionCard>
        ) : null}
      </ScrollView>
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
  // Decision rows (date, comment) shown under the approver — same look as the
  // DetailInfoCard rows, with a divider separating them from the person.
  decisionBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailRowText: {
    flex: 1,
    gap: 2,
  },
  detailRowLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: c.textFaint,
  },
  detailRowValue: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 15,
    lineHeight: 22,
    color: c.text,
  },
});
