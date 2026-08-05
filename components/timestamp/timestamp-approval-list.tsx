import { router, useFocusEffect } from "expo-router";
import { InfinityLoader } from '@/components/infinity-loader';
import { Clock, LogIn, LogOut } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

// Reveal the list 10 rows at a time; load the next page as the user scrolls.
const PAGE_SIZE = 10;

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { LoadingAnimate } from "@/components/loading-animate";
import { ListCard } from "@/components/ui/list-card";
import { TEXT } from "@/constants/text";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import {
  getForgetApprovalWaiting,
  type TimestampApproval,
} from "@/services/timestampService";
import { formatFullDate } from "@/utils/date-format";

function getRequestId(item: TimestampApproval, index: number) {
  return `${String(item.forgetId ?? item.id ?? "approval")}-${index}`;
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

function ApprovalCard({ item }: { item: TimestampApproval }) {
  const c = useColors();
  const dateValue = String(item.stampDate ?? "");
  const dateLabel = dateValue ? formatFullDate(dateValue) : "";
  const { Icon: TypeIcon, color: typeColor, bg: typeBg } = getTypeIcon(item);

  const handlePress = () => {
    router.push({
      pathname: "/timestamp/approve-detail",
      params: {
        forgetId: String(item.forgetId ?? item.id ?? ""),
        item: JSON.stringify(item),
      },
    } as Parameters<typeof router.push>[0]);
  };

  return (
    <ListCard
      onPress={handlePress}
      icon={<TypeIcon size={18} color={typeColor} />}
      iconBackground={typeBg}
      title={String(item.approveName ?? TEXT.TIMESTAMP_FORGOT_TAB)}
      titleNumberOfLines={1}
      date={dateLabel || undefined}
      meta={[{ text: String(item.name ?? "") }]}
      badge={{ text: TEXT.TIMESTAMP_PENDING_BADGE, bg: c.warningSoft, color: "#92400E" }}
    />
  );
}

export function TimestampApprovalList() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;
  const [items, setItems] = useState<TimestampApproval[]>([]);
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
        const result = await getForgetApprovalWaiting(staffId);
        setItems(result.data);
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

  // Only while there is nothing to show; see timestamp-forgot-list.
  if (isLoading && items.length === 0) {
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
      renderItem={({ item }) => <ApprovalCard item={item} />}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        canLoadMore ? (
          <View style={styles.footer}>
            <InfinityLoader size={44} strokeWidth={4} />
          </View>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState preset="cleared" message={TEXT.TIMESTAMP_APPROVE_EMPTY} />
      }
    />
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  flatList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
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
});
