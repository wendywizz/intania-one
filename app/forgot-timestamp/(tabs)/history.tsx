import { ChevronRight, Fingerprint, LogIn, LogOut } from 'lucide-react-native';
import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { navPush } from "@/utils/navigation";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import {
  getForgotTimestampHistoryData,
  type ForgotTimestampHistory,
} from "@/services/forgetTimestampService";
import { formatFullDate } from "@/utils/date-format";

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
const writeDateFields = [
  "writeDate",
  "write_date",
  "createdAt",
  "created_at",
  "requestDate",
  "request_date",
  "dateAdd",
  "date_add",
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

function getText(item: ForgotTimestampHistory, fields: string[]) {
  for (const field of fields) {
    const value = item[field];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function getHistoryKey(item: ForgotTimestampHistory, index: number) {
  const id = getText(item, ["id", "forgetId", "forget_id", "timestampId", "timestamp_id"]);
  const date = getText(item, Array.from(dateFields));
  return `${id || date || "forgot-timestamp-history"}-${index}`;
}

function getHistoryDate(item: ForgotTimestampHistory) {
  return getText(item, Array.from(dateFields));
}

function getWriteDate(item: ForgotTimestampHistory) {
  return getText(item, writeDateFields) || getHistoryDate(item);
}

function getHistoryTimestamp(item: ForgotTimestampHistory) {
  const timestamp = Date.parse(getHistoryDate(item));
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortHistoryItems(items: ForgotTimestampHistory[]) {
  return [...items].sort(
    (leftItem, rightItem) =>
      getHistoryTimestamp(rightItem) - getHistoryTimestamp(leftItem),
  );
}

function getHistoryTitle(item: ForgotTimestampHistory) {
  const stampType = getText(item, Array.from(stampTypeFields)).toLowerCase();
  if (stampType === "in") return TEXT.FORGOT_TIMESTAMP_STAMP_IN;
  if (stampType === "out") return TEXT.FORGOT_TIMESTAMP_STAMP_OUT;
  const date = getHistoryDate(item);
  return date ? formatFullDate(date) : TEXT.SHARED_HISTORY;
}

function getWriteDateLabel(item: ForgotTimestampHistory) {
  const writeDate = getWriteDate(item);
  return writeDate ? formatFullDate(writeDate) : "-";
}

function getHistoryItemStatus(item: ForgotTimestampHistory): "approved" | "rejected" | "" {
  for (const field of historyStatusFields) {
    const value = String(item[field] ?? "").toLowerCase().trim();
    if (["approved", "true", "1", "yes", "active"].includes(value)) return "approved";
    if (["rejected", "false", "0", "no", "denied"].includes(value)) return "rejected";
  }
  return "";
}

function ForgotTimestampHistoryItem({ item }: { item: ForgotTimestampHistory }) {
  const status = getHistoryItemStatus(item);
  const stampType = getText(item, Array.from(stampTypeFields)).toLowerCase();
  const StampIcon = stampType === "in" ? LogIn : stampType === "out" ? LogOut : Fingerprint;

  const openDetail = () => {
    navPush({
      pathname: "/forgot-timestamp/history-detail",
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
        <View style={styles.iconCircle}>
          <StampIcon size={18} color="#5D6371" />
        </View>
        <View style={styles.itemInfo}>
          <ThemedText style={styles.itemTitle}>{getHistoryTitle(item)}</ThemedText>
          <ThemedText style={styles.itemMeta}>{getWriteDateLabel(item)}</ThemedText>
        </View>
        <View style={styles.itemRight}>
          {status === "approved" ? (
            <View style={styles.approvedBadge}>
              <ThemedText style={styles.approvedBadgeText}>{TEXT.FORGOT_TIMESTAMP_APPROVED_BADGE}</ThemedText>
            </View>
          ) : status === "rejected" ? (
            <View style={styles.rejectedBadge}>
              <ThemedText style={styles.rejectedBadgeText}>{TEXT.FORGOT_TIMESTAMP_REJECTED_BADGE}</ThemedText>
            </View>
          ) : null}
          <ChevronRight size={16} color="#8B716F" />
        </View>
      </View>
    </Pressable>
  );
}

export default function ForgotTimestampHistoryScreen() {
  const { user: authUser } = useAuth();
  const [items, setItems] = useState<ForgotTimestampHistory[]>([]);
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
        const result = await getForgotTimestampHistoryData(staffId, currentYear);
        setItems(sortHistoryItems(result.data));
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
          {TEXT.FORGOT_TIMESTAMP_HISTORY_SUBTITLE}
        </ThemedText>

        <ThemedText style={styles.cycleLabel}>{TEXT.FORGOT_TIMESTAMP_COMPANY_CYCLE_LABEL}</ThemedText>
        <ThemedText style={styles.cycleValue}>
          {currentYear - 1} – {currentYear}
        </ThemedText>

        <View style={styles.statsDivider} />

        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <ThemedText style={styles.statLabel}>{TEXT.FORGOT_TIMESTAMP_TOTAL_APPROVED}</ThemedText>
            <ThemedText style={styles.statCountApproved}>{approvedCount}</ThemedText>
          </View>
          <View style={styles.statsVerticalDivider} />
          <View style={styles.statCell}>
            <ThemedText style={styles.statLabel}>{TEXT.FORGOT_TIMESTAMP_TOTAL_REJECTED}</ThemedText>
            <ThemedText style={styles.statCountRejected}>{rejectedCount}</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );

  const renderContent = () => {
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
        renderItem={({ item }) => <ForgotTimestampHistoryItem item={item} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <ThemedText style={styles.emptyMessage}>{TEXT.SHARED_NO_HISTORY}</ThemedText>
          </View>
        }
        ListFooterComponent={
          items.length > 0 ? (
            <View style={styles.listFooter}>
              <View style={styles.footerLine} />
              <ThemedText style={styles.footerText}>{TEXT.FORGOT_TIMESTAMP_END_OF_HISTORY}</ThemedText>
              <View style={styles.footerLine} />
            </View>
          ) : null
        }
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar title={TEXT.FORGOT_TIMESTAMP_TITLE} backHref="/" />
      <View style={styles.content}>{renderContent()}</View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FD",
  },
  content: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  listHeader: {
    paddingBottom: 4,
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E1E2E6",
    padding: 16,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statsHeading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: "#922124",
    fontFamily: AppFonts.psuBold,
    marginBottom: 2,
  },
  statsSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: "#584140",
    fontFamily: AppFonts.psuRegular,
    marginBottom: 10,
  },
  cycleLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#585E6D",
    fontFamily: AppFonts.psuBold,
  },
  cycleValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: "#191C1F",
    fontFamily: AppFonts.psuBold,
    marginBottom: 4,
  },
  statsDivider: {
    height: 1,
    backgroundColor: "#E1E2E6",
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
    backgroundColor: "#E1E2E6",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: "#585E6D",
    fontFamily: AppFonts.psuBold,
  },
  statCountApproved: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: "#922124",
    fontFamily: AppFonts.psuBold,
  },
  statCountRejected: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: "#585E6D",
    fontFamily: AppFonts.psuBold,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(223,191,189,0.3)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
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
    borderRadius: 8,
    backgroundColor: "#DADFF0",
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
    color: "#191C1F",
    fontFamily: AppFonts.psuBold,
  },
  itemMeta: {
    fontSize: 12,
    lineHeight: 16,
    color: "#585E6D",
    fontFamily: AppFonts.psuRegular,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  approvedBadge: {
    backgroundColor: "#DCFCE7",
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
    backgroundColor: "#FEE2E2",
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
    backgroundColor: "#E1E2E6",
  },
  footerText: {
    fontSize: 12,
    color: "#585E6D",
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
    color: "#B42318",
  },
  retryButton: {
    minHeight: 48,
    minWidth: 132,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#B33939",
    marginTop: 24,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    borderWidth: 1,
    borderColor: "rgba(223,191,189,0.2)",
  },
  emptyMessage: {
    color: "#687076",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
