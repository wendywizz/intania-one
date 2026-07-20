import { ChevronRight, Clock, Inbox, LogIn, LogOut } from 'lucide-react-native';
import { useFocusEffect } from "expo-router";
import { navPush } from "@/utils/navigation";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { LoadingAnimate } from "@/components/loading-animate";
import { EmptyState } from "@/components/empty-state";
import { ThemedText } from "@/components/themed-text";
import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import {
  getTimestampHistoryData,
  type TimestampHistory,
} from "@/services/timestampService";
import { formatDateRange, formatFullDate } from "@/utils/date-format";

const dateFields = new Set([
  "date",
  "workDate",
  "work_date",
  "stampDate",
  "stamp_date",
  "timestampDate",
  "timestamp_date",
  "requestDate",
  "request_date",
  "createdAt",
  "created_at",
]);
// The date the stamp was forgotten (the timestamp itself), not the request date.
const forgotDateFields = [
  "workDate",
  "work_date",
  "stampDate",
  "stamp_date",
  "timestampDate",
  "timestamp_date",
];
const stampTypeFields = new Set(["stampType", "stamp_type", "type"]);
const historyStatusFields = [
  "status",
  "result",
  "approvalStatus",
  "approval_status",
  "isActive",
  "is_active",
];

function getCurrentYear() {
  return new Date().getFullYear();
}

function getText(item: TimestampHistory, fields: string[]) {
  for (const field of fields) {
    const value = item[field];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function getHistoryKey(item: TimestampHistory, index: number) {
  const id = getText(item, ["id", "forgetId", "forget_id", "timestampId", "timestamp_id"]);
  const date = getText(item, Array.from(dateFields));
  return `${id || date || "timestamp-history"}-${index}`;
}

function getHistoryDate(item: TimestampHistory) {
  return getText(item, Array.from(dateFields));
}

function getHistoryTimestamp(item: TimestampHistory) {
  const timestamp = Date.parse(getHistoryDate(item));
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortHistoryItems(items: TimestampHistory[]) {
  return [...items].sort(
    (leftItem, rightItem) =>
      getHistoryTimestamp(rightItem) - getHistoryTimestamp(leftItem),
  );
}

function getHistoryTitle(item: TimestampHistory) {
  const stampType = getText(item, Array.from(stampTypeFields)).toLowerCase();
  if (stampType === "in") return TEXT.TIMESTAMP_STAMP_IN;
  if (stampType === "out") return TEXT.TIMESTAMP_STAMP_OUT;
  if (stampType === "all") return TEXT.TIMESTAMP_STAMP_ALL;
  const date = getHistoryDate(item);
  return date ? formatFullDate(date) : TEXT.SHARED_HISTORY;
}

function getForgotDateLabel(item: TimestampHistory) {
  const forgotDate = getText(item, forgotDateFields);
  return forgotDate ? formatFullDate(forgotDate) : "-";
}

// Forget-request approval state. Upstream uses status "1" = approved,
// "0" = still waiting for approval; any other decided value = rejected.
function getHistoryItemStatus(
  item: TimestampHistory,
): "approved" | "rejected" | "pending" {
  for (const field of historyStatusFields) {
    const raw = item[field];
    if (raw === undefined || raw === null || String(raw).trim() === "") continue;
    const value = String(raw).toLowerCase().trim();
    if (["1", "approved", "true", "yes", "active"].includes(value)) return "approved";
    if (["0", "pending", "waiting", "wait"].includes(value)) return "pending";
    return "rejected";
  }
  return "pending";
}

// Icon + colour that convey the miss-timestamp type — kept in sync with the
// approve screens: forgot check-in (green), check-out (amber), both (red).
function getTypeIcon(stampType: string) {
  if (stampType === "in") return { Icon: LogIn, color: "#12805C", bg: "#E7F5EF" };
  if (stampType === "out") return { Icon: LogOut, color: "#B54708", bg: "#FDF3E7" };
  return { Icon: Clock, color: "#B33939", bg: "#FBEAEA" };
}

function TimestampHistoryItem({ item }: { item: TimestampHistory }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const status = getHistoryItemStatus(item);
  const stampType = getText(item, Array.from(stampTypeFields)).toLowerCase();
  const { Icon: TypeIcon, color: typeColor, bg: typeBg } = getTypeIcon(stampType);

  const openDetail = () => {
    navPush({
      pathname: "/timestamp/history-detail",
      params: { item: JSON.stringify(item) },
    } as Parameters<typeof navPush>[0]);
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={openDetail}
      style={({ pressed }) => (pressed ? styles.itemPressed : undefined)}
    >
      <View style={styles.itemCard}>
        <View style={[styles.iconCircle, { backgroundColor: typeBg }]}>
          <TypeIcon size={18} color={typeColor} />
        </View>
        <View style={styles.itemInfo}>
          <ThemedText style={styles.itemTitle}>{getHistoryTitle(item)}</ThemedText>
          <ThemedText style={styles.itemMeta}>{getForgotDateLabel(item)}</ThemedText>
        </View>
        <View style={styles.itemRight}>
          {status === "approved" ? (
            <View style={styles.approvedBadge}>
              <ThemedText style={styles.approvedBadgeText}>{TEXT.TIMESTAMP_APPROVED_BADGE}</ThemedText>
            </View>
          ) : status === "rejected" ? (
            <View style={styles.rejectedBadge}>
              <ThemedText style={styles.rejectedBadgeText}>{TEXT.TIMESTAMP_REJECTED_BADGE}</ThemedText>
            </View>
          ) : null}
          <ChevronRight size={16} color="#8B716F" />
        </View>
      </View>
    </Pressable>
  );
}

export function TimestampHistoryList() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user: authUser } = useAuth();
  const [items, setItems] = useState<TimestampHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const staffId = authUser?.staffId || USER_ID;
  const currentYear = getCurrentYear();

  const loadItems = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError("");
      try {
        const result = await getTimestampHistoryData(staffId, currentYear);
        // History shows completed requests only — hide ones still awaiting approval.
        const completed = result.data.filter(
          (item) => getHistoryItemStatus(item) !== "pending",
        );
        setItems(sortHistoryItems(completed));
      } catch (loadError) {
        setItems([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : TEXT.SHARED_UNABLE_TO_LOAD_HISTORY,
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentYear, staffId],
  );

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems]),
  );

  const approvedCount = items.filter((i) => getHistoryItemStatus(i) === "approved").length;
  const rejectedCount = items.filter((i) => getHistoryItemStatus(i) === "rejected").length;

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.statsCard}>
        <ThemedText style={styles.statsHeading}>{TEXT.SHARED_HISTORY}</ThemedText>
        <ThemedText style={styles.statsSubtitle}>
          {TEXT.TIMESTAMP_HISTORY_SUBTITLE}
        </ThemedText>

        <ThemedText style={styles.cycleLabel}>{TEXT.TIMESTAMP_COMPANY_CYCLE_LABEL}</ThemedText>
        <ThemedText style={styles.cycleValue}>
          {formatDateRange(`${currentYear - 1}-10-01`, `${currentYear}-09-30`)}
        </ThemedText>

        <View style={styles.statsDivider} />

        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <ThemedText style={styles.statLabel}>{TEXT.TIMESTAMP_TOTAL_APPROVED}</ThemedText>
            <ThemedText style={styles.statCountApproved}>{approvedCount}</ThemedText>
          </View>
          <View style={styles.statsVerticalDivider} />
          <View style={styles.statCell}>
            <ThemedText style={styles.statLabel}>{TEXT.TIMESTAMP_TOTAL_REJECTED}</ThemedText>
            <ThemedText style={styles.statCountRejected}>{rejectedCount}</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <LoadingAnimate
          title={TEXT.SHARED_LOADING_HISTORY}
          desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT}
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateContainer}>
        <ThemedText type="subtitle">{TEXT.SHARED_SOMETHING_WENT_WRONG}</ThemedText>
        <ThemedText style={[styles.stateMessage, styles.errorText]}>{error}</ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => loadItems()}
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
    <FlatList
      style={styles.flatList}
      contentContainerStyle={styles.listContent}
      data={items}
      keyExtractor={getHistoryKey}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => loadItems(true)}
        />
      }
      renderItem={({ item }) => <TimestampHistoryItem item={item} />}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={<EmptyState icon={Inbox} message={TEXT.SHARED_NO_HISTORY} />}
      ListFooterComponent={
        items.length > 0 ? (
          <View style={styles.listFooter}>
            <View style={styles.footerLine} />
            <ThemedText style={styles.footerText}>{TEXT.TIMESTAMP_END_OF_HISTORY}</ThemedText>
            <View style={styles.footerLine} />
          </View>
        ) : null
      }
    />
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  flatList: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    padding: 16,
    gap: 12,
  },
  listHeader: {
    paddingBottom: 4,
  },
  statsCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 4,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statsHeading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: c.primary,
    fontFamily: AppFonts.psuBold,
    marginBottom: 2,
  },
  statsSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
    marginBottom: 10,
  },
  cycleLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: c.textMuted,
    fontFamily: AppFonts.psuBold,
  },
  cycleValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: c.text,
    fontFamily: AppFonts.psuBold,
    marginBottom: 4,
  },
  statsDivider: {
    height: 1,
    backgroundColor: c.surfaceMuted,
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statsVerticalDivider: {
    width: 1,
    height: 40,
    backgroundColor: c.surfaceMuted,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: c.textMuted,
    fontFamily: AppFonts.psuBold,
  },
  statCountApproved: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: c.primary,
    fontFamily: AppFonts.psuBold,
  },
  statCountRejected: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: c.textMuted,
    fontFamily: AppFonts.psuBold,
  },
  itemCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(223,191,189,0.3)",
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  itemPressed: {
    opacity: 0.72,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  itemMeta: {
    fontSize: 12,
    lineHeight: 16,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  approvedBadge: {
    backgroundColor: c.successSoft,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  approvedBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#166534",
    fontFamily: AppFonts.psuBold,
  },
  rejectedBadge: {
    backgroundColor: c.dangerSoft,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  rejectedBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#991B1B",
    fontFamily: AppFonts.psuBold,
  },
  listFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: c.surfaceMuted,
  },
  footerText: {
    fontSize: 12,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  stateMessage: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  errorText: {
    color: c.danger,
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
  emptyCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    borderWidth: 1,
    borderColor: "rgba(223,191,189,0.2)",
  },
  emptyMessage: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
