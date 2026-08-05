import { TEXT } from "@/constants/text";
import { useFocusEffect } from "expo-router";
import { navPush } from "@/utils/navigation";
import { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { EmptyState } from "@/components/empty-state";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import {
    getRepairComputerJobId,
    RepairComputerJobListItem,
} from "@/components/repair-computer-job-list-item";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { PRIVILEGE_RC_USER } from "@/constants/types";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import type { RepairComputer } from "@/models/types";
import type { ListResponse } from "@/services/api";
import { getUserHistory } from "@/services/repairComputerService";

const ESTIMATED_ITEM_HEIGHT = 132;
const LIST_VERTICAL_CHROME = 260;

function getJobKey(job: RepairComputer, index: number) {
  return `${getRepairComputerJobId(job) || "repair-history"}-${index}`;
}

function getPageSize(screenHeight: number) {
  return Math.max(
    3,
    Math.ceil((screenHeight - LIST_VERTICAL_CHROME) / ESTIMATED_ITEM_HEIGHT),
  );
}

function getHasMore(
  currentCount: number,
  pageSize: number,
  result: ListResponse<RepairComputer>,
) {
  if (typeof result.totalCount === "number") {
    return currentCount < result.totalCount;
  }

  const pageCount = Array.isArray(result.data) ? result.data.length : 0;
  return pageCount >= pageSize;
}

export default function RepairComputerHistoryScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { height } = useWindowDimensions();
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;
  const pageSize = getPageSize(height);
  const [jobs, setJobs] = useState<RepairComputer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const loadingStartRef = useRef<number | null>(null);
  const loadedStartRef = useRef<Set<number>>(new Set());

  const loadFirstPage = useCallback(
    async (showRefreshing = false, forceReload = false) => {
      if (
        loadingStartRef.current === 0 ||
        (!forceReload && loadedStartRef.current.has(0))
      ) {
        return;
      }

      loadingStartRef.current = 0;
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");
      try {
        const result = await getUserHistory(
          staffId,
          PRIVILEGE_RC_USER,
          0,
          pageSize,
        );
        const nextJobs = result.data;

        loadedStartRef.current = new Set([0]);
        setJobs(nextJobs);
        setHasMore(getHasMore(nextJobs.length, pageSize, result));
      } catch (error) {
        setJobs([]);
        setError(
          error instanceof Error
            ? error.message
            : TEXT.SHARED_UNABLE_TO_LOAD_HISTORY,
        );
        setHasMore(false);
      } finally {
        loadingStartRef.current = null;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [pageSize, staffId],
  );

  const loadMoreJobs = useCallback(async () => {
    if (isLoading || isRefreshing || isLoadingMore || !hasMore) {
      return;
    }

    const start = jobs.length;

    if (
      loadingStartRef.current === start ||
      loadedStartRef.current.has(start)
    ) {
      return;
    }

    loadingStartRef.current = start;
    setIsLoadingMore(true);
    try {
      const result = await getUserHistory(
        staffId,
        PRIVILEGE_RC_USER,
        start,
        pageSize,
      );
      const nextJobs = result.data;

      loadedStartRef.current.add(start);
      setJobs((currentJobs) => [...currentJobs, ...nextJobs]);
      setHasMore(getHasMore(start + nextJobs.length, pageSize, result));
    } catch {
      setHasMore(false);
    } finally {
      loadingStartRef.current = null;
      setIsLoadingMore(false);
    }
  }, [
    hasMore,
    isLoading,
    isLoadingMore,
    isRefreshing,
    jobs.length,
    pageSize,
    staffId,
  ]);

  useFocusEffect(
    useCallback(() => {
      loadFirstPage(false, true);
    }, [loadFirstPage]),
  );

  const openJobDetail = (job: RepairComputer) => {
    const jobId = getRepairComputerJobId(job);

    if (!jobId) {
      return;
    }

    navPush({
      pathname: "/repair-computer/job-history-detail",
      params: {
        id: jobId,
        backHref: "/repair-computer/history",
      },
    } as Parameters<typeof navPush>[0]);
  };

  const renderContent = () => {
    // Only while there is nothing to show; see components/timestamp/timestamp-forgot-list.
    if (isLoading && jobs.length === 0) {
      return (
        <LoadingAnimate
          title={TEXT.SHARED_LOADING_HISTORY}
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
            onPress={() => loadFirstPage(false, true)}
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

    return (
      <FlatList
        contentContainerStyle={styles.listContent}
        data={jobs}
        keyExtractor={getJobKey}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadFirstPage(true, true)}
          />
        }
        onEndReached={loadMoreJobs}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <RepairComputerJobListItem job={item} showRepairType onPress={openJobDetail} />
        )}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={c.primary} size="small" />
            </View>
          ) : null
        }
        ListEmptyComponent={<EmptyState preset="history" message={TEXT.REPAIR_COMPUTER_NO_JOB_HISTORY} />}
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
            <NavTopBar
              title={TEXT.SHARED_HISTORY}
              backHref="/"
              showHomeButton={false}
            />

      <View style={styles.content}>
        <View style={styles.listWrapper}>
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
  },
    listWrapper: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
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
  emptyCard: {
    minHeight: 120,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 16,
  },
  emptyMessage: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  footerLoader: {
    alignItems: "center",
    paddingVertical: 14,
  },
});
