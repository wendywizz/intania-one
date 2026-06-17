import MaterialIcons from '@react-native-vector-icons/material-icons';
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppFonts } from "@/constants/fonts";
import type { ForgotTimestampHistory } from "@/services/forgetTimestampService";
import { formatDateAndTime, formatFullDate } from "@/utils/date-format";

const stampTypeFields = new Set(["stampType", "stamp_type", "type"]);
const dateFields = new Set([
  "workDate",
  "work_date",
  "stampDate",
  "stamp_date",
  "timestampDate",
  "timestamp_date",
]);
const writeDateFields = new Set([
  "date",
  "writeDate",
  "write_date",
  "requestDate",
  "request_date",
  "createdAt",
  "created_at",
  "dateAdd",
  "date_add",
]);
const timeFields = new Set(["inTime", "in_time", "outTime", "out_time"]);
const approverNameFields = new Set([
  "approverName",
  "approver_name",
  "approverFullName",
  "approver_full_name",
  "approverPositionName",
  "approver_position_name",
  "approverPosition",
  "approver_position",
]);
const reasonFields = ["reason", "detail", "description"];
const historyStatusFields = [
  "status",
  "result",
  "approvalStatus",
  "approval_status",
  "isActive",
  "is_active",
];

function getText(item: ForgotTimestampHistory, fields: Set<string> | string[]) {
  for (const field of fields) {
    const value = item[field];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function parseItem(value: string | string[] | undefined): ForgotTimestampHistory {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) return {};
  try {
    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === "object"
      ? (parsedValue as ForgotTimestampHistory)
      : {};
  } catch {
    return {};
  }
}

function getStampTime(item: ForgotTimestampHistory) {
  for (const field of timeFields) {
    const value = item[field];
    const time = String(value ?? "").trim();
    if (time && time !== "00:00:00") return time;
  }
  return "";
}

function getHistoryItemStatus(item: ForgotTimestampHistory): "approved" | "rejected" | "" {
  for (const field of historyStatusFields) {
    const value = String(item[field] ?? "").toLowerCase().trim();
    if (["approved", "true", "1", "yes", "active"].includes(value)) return "approved";
    if (["rejected", "false", "0", "no", "denied"].includes(value)) return "rejected";
  }
  return "";
}

function getStampTypeLabel(stampType: string) {
  if (stampType === "in") return "Timestamp In";
  if (stampType === "out") return "Timestamp Out";
  return stampType || "—";
}

type DetailRowProps = {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  value: string;
};

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconBox}>
        <MaterialIcons name={icon} size={18} color="#5D6371" />
      </View>
      <View style={styles.detailText}>
        <ThemedText style={styles.detailLabel}>{label}</ThemedText>
        <ThemedText style={styles.detailValue}>{value || "—"}</ThemedText>
      </View>
    </View>
  );
}

export default function ForgotTimestampHistoryDetailScreen() {
  const params = useLocalSearchParams<{ item?: string }>();
  const item = useMemo(() => parseItem(params.item), [params.item]);

  const stampType = getText(item, stampTypeFields).toLowerCase();
  const stampTypeLabel = getStampTypeLabel(stampType);
  const status = getHistoryItemStatus(item);

  const dateValue = getText(item, dateFields);
  const appealDate = getText(item, writeDateFields);
  const stampTime = getStampTime(item);
  const approver = getText(item, approverNameFields);
  const reason = getText(item, reasonFields);

  const appealDateDisplay = appealDate ? formatFullDate(appealDate) : "—";
  const datetimeDisplay = dateValue && stampTime
    ? formatDateAndTime(dateValue, stampTime)
    : dateValue
      ? formatFullDate(dateValue)
      : "—";

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar title="Timestamp Detail" backHref="/forgot-timestamp/history" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          {/* Header: stamp type + status badge */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderText}>
              <ThemedText style={styles.headerTypeLabel}>TYPE</ThemedText>
              <ThemedText style={styles.headerTypeValue}>{stampTypeLabel}</ThemedText>
            </View>
            {status === "approved" ? (
              <View style={styles.approvedBadge}>
                <MaterialIcons name="check-circle" size={14} color="#1E7E34" />
                <ThemedText style={styles.approvedBadgeText}>Approved</ThemedText>
              </View>
            ) : status === "rejected" ? (
              <View style={styles.rejectedBadge}>
                <MaterialIcons name="cancel" size={14} color="#991B1B" />
                <ThemedText style={styles.rejectedBadgeText}>Rejected</ThemedText>
              </View>
            ) : null}
          </View>

          <View style={styles.divider} />

          {/* Detail grid */}
          <View style={styles.detailRows}>
            <DetailRow
              icon="event"
              label="Appeal Date"
              value={appealDateDisplay}
            />
            <DetailRow
              icon="access-time"
              label="Timestamp Datetime"
              value={datetimeDisplay}
            />
            <DetailRow
              icon="fingerprint"
              label="Timestamp Type"
              value={stampTypeLabel}
            />
            <DetailRow
              icon="person"
              label="Approver"
              value={approver}
            />
          </View>

          {/* Reason section */}
          {reason ? (
            <>
              <View style={styles.divider} />
              <View style={styles.reasonSection}>
                <ThemedText style={styles.reasonSectionLabel}>REASON FOR ADJUSTMENT</ThemedText>
                <View style={styles.reasonBox}>
                  <ThemedText style={styles.reasonText}>{reason}</ThemedText>
                </View>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FD",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E1E2E6",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    gap: 12,
  },
  cardHeaderText: {
    gap: 2,
  },
  headerTypeLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#585E6D",
    fontFamily: AppFonts.psuBold,
  },
  headerTypeValue: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    color: "#191C1F",
    fontFamily: AppFonts.psuBold,
  },
  approvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E6F4EA",
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  approvedBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E7E34",
    fontFamily: AppFonts.psuBold,
  },
  rejectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEE2E2",
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  rejectedBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#991B1B",
    fontFamily: AppFonts.psuBold,
  },
  divider: {
    height: 1,
    backgroundColor: "#E7E8EC",
    marginVertical: 14,
  },
  detailRows: {
    gap: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#E7E8EC",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  detailText: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: "#585E6D",
    textTransform: "uppercase",
    fontFamily: AppFonts.psuBold,
  },
  detailValue: {
    fontSize: 14,
    lineHeight: 20,
    color: "#191C1F",
    fontFamily: AppFonts.psuRegular,
  },
  reasonSection: {
    gap: 10,
  },
  reasonSectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#585E6D",
    fontFamily: AppFonts.psuBold,
  },
  reasonBox: {
    borderLeftWidth: 4,
    borderLeftColor: "rgba(146,33,36,0.5)",
    borderRadius: 6,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(223,191,189,0.3)",
  },
  reasonText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#584140",
    fontFamily: AppFonts.psuRegular,
  },
});
