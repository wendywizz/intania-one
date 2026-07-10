import { router, useFocusEffect } from "expo-router";
import { ChevronRight, Clock, Inbox, LogIn, LogOut } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

// Reveal the list 10 rows at a time; load the next page as the user scrolls.
const PAGE_SIZE = 10;

import { ErrorState } from "@/components/error-state";
import { LoadingAnimate } from "@/components/loading-animate";
import { ThemedText } from "@/components/themed-text";
import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import {
  getForgetApprovedHistory,
  type TimestampApproved,
} from "@/services/timestampService";
import { formatFullDate } from "@/utils/date-format";

function getRequestId(item: TimestampApproved, index: number) {
  return `${String(item.forgetId ?? item.id ?? "approved")}-${index}`;
}

function statusStyle(status: string) {
  // "2" = rejected (red); anything else = certified (green).
  if (status === "2") {
    return { bg: "#FEE2E2", color: "#991B1B", label: TEXT.TIMESTAMP_APPROVE_STATUS_REJECTED };
  }
  return { bg: "#D1FAE5", color: "#065F46", label: TEXT.TIMESTAMP_APPROVE_STATUS_APPROVED };
}

// Icon + colour that convey the miss-timestamp type: forgot check-in (green),
// forgot check-out (amber), or both (red).
function getTypeIcon(item: { inTime?: string | number | null; outTime?: string | number | null }) {
  const hasIn = item.inTime != null && String(item.inTime).trim() !== "";
  const hasOut = item.outTime != null && String(item.outTime).trim() !== "";
  if (hasIn && !hasOut) return { Icon: LogIn, color: "#12805C", bg: "#E7F5EF" };
  if (hasOut && !hasIn) return { Icon: LogOut, color: "#B54708", bg: "#FDF3E7" };
  return { Icon: Clock, color: "#B33939", bg: "#FBEAEA" };
}

function ApprovedCard({ item }: { item: TimestampApproved }) {
  const stampValue = String(item.stampDate ?? "");
  const stampLabel = stampValue ? formatFullDate(stampValue) : "";
  const badge = statusStyle(String(item.status ?? ""));
  const { Icon: TypeIcon, color: typeColor, bg: typeBg } = getTypeIcon(item);

  const handlePress = () => {
    router.push({
      pathname: "/timestamp/record-detail",
      params: {
        forgetId: String(item.forgetId ?? item.id ?? ""),
        item: JSON.stringify(item),
      },
    } as Parameters<typeof router.push>[0]);
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => (pressed ? styles.itemPressed : undefined)}
    >
      <View style={styles.itemCard}>
        <View style={styles.itemRow}>
          <View style={[styles.iconCircle, { backgroundColor: typeBg }]}>
            <TypeIcon size={18} color={typeColor} />
          </View>
          <View style={styles.itemInfo}>
            <ThemedText style={styles.itemName} numberOfLines={1}>
              {String(item.approveName ?? TEXT.TIMESTAMP_FORGOT_TAB)}
            </ThemedText>
            {stampLabel ? (
              <ThemedText style={styles.itemDate}>{stampLabel}</ThemedText>
            ) : null}
            <View style={styles.infoDivider} />
            <ThemedText style={styles.itemType} numberOfLines={1}>
              {String(item.name ?? "")}
            </ThemedText>
          </View>
          <View style={styles.itemRight}>
            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
              <ThemedText style={[styles.statusText, { color: badge.color }]}>
                {item.statusName ? String(item.statusName) : badge.label}
              </ThemedText>
            </View>
            <ChevronRight size={16} color="#8B716F" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function TimestampApprovedList() {
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;
  const [items, setItems] = useState<TimestampApproved[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setError("");
      try {
        const result = await getForgetApprovedHistory(staffId);
        setItems(result);
        setVisibleCount(PAGE_SIZE);
      } catch (loadError) {
        setItems([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : TEXT.SHARED_SOMETHING_WENT_WRONG,
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [staffId],
  );

  const canLoadMore = visibleCount < items.length;
  const handleEndReached = () => {
    if (canLoadMore) {
      setVisibleCount((count) => Math.min(count + PAGE_SIZE, items.length));
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <LoadingAnimate
          title={TEXT.SHARED_LOADING_DATA_TITLE}
          desc={TEXT.SHARED_LOADING_DESCRIPTION}
        />
      </View>
    );
  }

  if (error) {
    return (
      <ErrorState
        title={TEXT.SHARED_ERROR_TITLE_THAI}
        message={error}
        onRetry={() => load()}
      />
    );
  }

  return (
    <FlatList
      style={styles.flatList}
      contentContainerStyle={
        items.length ? styles.listContent : styles.listContentEmpty
      }
      data={items.slice(0, visibleCount)}
      keyExtractor={getRequestId}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={() => load(true)} />
      }
      renderItem={({ item }) => <ApprovedCard item={item} />}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        canLoadMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color="#B33939" />
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Inbox size={44} color="#C7CBD4" />
          <ThemedText style={styles.emptyText}>
            {TEXT.TIMESTAMP_APPROVE_HISTORY_EMPTY}
          </ThemedText>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  flatList: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  footer: {
    paddingVertical: 16,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(223,191,189,0.3)",
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FBEAEA",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E7EB",
    marginVertical: 5,
  },
  itemName: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
    color: "#191C1F",
    fontFamily: AppFonts.psuBold,
  },
  itemType: {
    fontSize: 13,
    lineHeight: 18,
    color: "#584140",
    fontFamily: AppFonts.psuRegular,
  },
  itemDate: {
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
  itemPressed: {
    opacity: 0.72,
  },
  statusBadge: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: AppFonts.psuBold,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#687076",
    textAlign: "center",
    fontFamily: AppFonts.psuRegular,
  },
});
