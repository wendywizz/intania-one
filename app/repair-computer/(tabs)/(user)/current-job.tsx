import { TEXT } from "@/constants/text";
import { useFocusEffect } from "expo-router";
import { navPush } from "@/utils/navigation";
import { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/ui";
import { AppToast } from "@/components/app-toast";
import { SubmittingOverlay } from "@/components/submitting-overlay";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import {
    getRepairComputerJobId,
    RepairComputerJobListItem,
} from "@/components/repair-computer-job-list-item";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AppFonts } from "@/constants/fonts";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import type { RepairComputer } from "@/models/types";
import type { ListResponse } from "@/services/api";
import { getUserCurrentJob, removeJob } from "@/services/repairComputerService";

const ESTIMATED_ITEM_HEIGHT = 132;
const LIST_VERTICAL_CHROME = 260;

function getJobKey(job: RepairComputer, index: number) {
  return `${getRepairComputerJobId(job) || "repair-job"}-${index}`;
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

function blurActiveWebElement() {
  if (Platform.OS !== "web") {
    return;
  }

  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
}

export default function RepairComputerCurrentJobScreen() {
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
  const [selectedJob, setSelectedJob] = useState<RepairComputer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "">("");
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
        const result = await getUserCurrentJob(staffId, 0, pageSize);
        const nextJobs = result.data;

        loadedStartRef.current = new Set([0]);
        setJobs(nextJobs);
        setHasMore(getHasMore(nextJobs.length, pageSize, result));
      } catch (error) {
        setJobs([]);
        setError(
          error instanceof Error
            ? error.message
            : TEXT.REPAIR_COMPUTER_UNABLE_TO_LOAD_CURRENT_JOBS,
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
      const result = await getUserCurrentJob(staffId, start, pageSize);
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

  const openDeleteConfirm = (job: RepairComputer) => {
    blurActiveWebElement();
    setSelectedJob(job);
  };

  const openEditForm = (job: RepairComputer) => {
    const jobId = getRepairComputerJobId(job);

    if (!jobId) {
      setToastType("error");
      setToastMessage(TEXT.REPAIR_COMPUTER_UNABLE_TO_OPEN_JOB_DETAIL);
      return;
    }

    blurActiveWebElement();
    navPush({
      pathname: "/repair-computer/user-job-detail",
      params: {
        id: jobId,
        backHref: "/repair-computer/current-job",
      },
    } as Parameters<typeof navPush>[0]);
  };

  const closeDeleteConfirm = () => {
    if (isDeleting) {
      return;
    }

    blurActiveWebElement();
    setSelectedJob(null);
  };

  const handleDelete = async () => {
    const jobId = selectedJob ? getRepairComputerJobId(selectedJob) : "";

    if (!jobId || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setToastMessage("");
    setToastType("");

    try {
      const result = await removeJob(jobId);

      setToastType("success");
      setToastMessage(
        result.message || TEXT.REPAIR_COMPUTER_JOB_DELETED_SUCCESS_MESSAGE,
      );
      loadFirstPage(false, true);
    } catch (error) {
      setToastType("error");
      setToastMessage(
        error instanceof Error
          ? error.message
          : TEXT.REPAIR_COMPUTER_UNABLE_TO_DELETE_JOB,
      );
    } finally {
      setIsDeleting(false);
      setSelectedJob(null);
    }
  };

  const openNewJob = useCallback(
    () => navPush('/repair-computer/inform' as Parameters<typeof navPush>[0]),
    [],
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <LoadingAnimate
          title={TEXT.REPAIR_COMPUTER_LOADING_CURRENT_JOBS}
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
        // Only while there are jobs listed: with none, the same action is drawn
        // as a plain button under the empty state's message instead.
        ListHeaderComponent={
          jobs.length === 0 ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={TEXT.REPAIR_COMPUTER_ADD_NEW_JOB}
              onPress={openNewJob}
              style={({ pressed }) => [
                styles.addJobButton,
                pressed && styles.addJobButtonPressed,
              ]}
            >
              <IconSymbol name="plus" size={20} color={c.primary} />
              <ThemedText style={styles.addJobText}>
                {TEXT.REPAIR_COMPUTER_ADD_NEW_JOB}
              </ThemedText>
            </Pressable>
          )
        }
        renderItem={({ item }) => (
          <RepairComputerJobListItem
            job={item}
            onDelete={openDeleteConfirm}
            onPress={openEditForm}
          />
        )}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={c.primary} size="small" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            preset="repair"
            message={TEXT.REPAIR_COMPUTER_NO_CURRENT_JOBS}
            action={
              <Button
                title={TEXT.REPAIR_COMPUTER_ADD_NEW_JOB}
                icon="plus"
                onPress={openNewJob}
              />
            }
          />
        }
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
                        <NavTopBar
        title={TEXT.REPAIR_COMPUTER_CURRENT_JOB}
        backHref="/"
        showHomeButton={false}
      />

      <View style={styles.content}>
        <View style={styles.listWrapper}>
          {renderContent()}
        </View>
      </View>

      <ConfirmDialog
        visible={Boolean(selectedJob)}
        title={TEXT.CONFIRM_DELETE}
        message={TEXT.REPAIR_COMPUTER_DELETE_CONFIRM_MESSAGE}
        confirmLabel={TEXT.DELETE}
        cancelLabel={TEXT.CANCEL}
        destructive
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={closeDeleteConfirm}
      />

      <AppToast
        message={toastMessage}
        type={toastType === "error" ? "error" : "success"}
      />
      <SubmittingOverlay visible={isDeleting} />
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
  addJobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: c.primary,
    backgroundColor: c.primarySoft,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  addJobButtonPressed: {
    opacity: 0.7,
  },
  addJobText: {
    color: c.primary,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: AppFonts.psuBold,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 80,
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
