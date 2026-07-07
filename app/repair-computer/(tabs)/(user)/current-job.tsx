import { TEXT } from "@/constants/text";
import { useFocusEffect } from "expo-router";
import { navPush } from "@/utils/navigation";
import { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";

import { AppToast } from "@/components/app-toast";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import {
    getRepairComputerJobId,
    RepairComputerJobListItem,
} from "@/components/repair-computer-job-list-item";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import type { RepairComputer } from "@/models/types";
import type { ListResponse } from "@/services/api";
import { getUserCurrentJob, removeJob } from "@/services/repairComputerService";

const ESTIMATED_ITEM_HEIGHT = 132;
const LIST_VERTICAL_CHROME = 260;
const statusFields = ["status", "state", "statusId", "status_id"];

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

function getJobText(job: RepairComputer, fields: string[]) {
  for (const field of fields) {
    const value = job[field];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function canEditJob(job: RepairComputer) {
  const status = getJobText(job, statusFields);
  return status === "" || Number(status) === 0;
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
    console.log("[handleDelete] selectedJob keys:", selectedJob ? Object.keys(selectedJob) : null);
    console.log("[handleDelete] jobId:", JSON.stringify(jobId));

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
              <ActivityIndicator color="#b33939" size="small" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <ThemedView
            style={styles.emptyCard}
            lightColor="#FFFFFF"
            darkColor="#151718"
          >
            <ThemedText style={styles.emptyMessage}>
              {TEXT.REPAIR_COMPUTER_NO_CURRENT_JOBS}
            </ThemedText>
          </ThemedView>
        }
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
                        <NavTopBar
        title={TEXT.REPAIR_COMPUTER_TITLE}
        subtitle={TEXT.REPAIR_COMPUTER_CURRENT_JOB}
        moduleIcon="laptop"
        backHref="/"
      />

      <View style={styles.content}>
        <View style={styles.listWrapper}>
          {renderContent()}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={TEXT.REPAIR_COMPUTER_INFORM}
        onPress={() =>
          navPush(
            '/repair-computer/inform' as Parameters<typeof navPush>[0],
          )
        }
        style={styles.fab}
      >
        <ThemedText
          lightColor="#FFFFFF"
          darkColor="#FFFFFF"
          style={styles.fabIcon}
        >
          +
        </ThemedText>
      </Pressable>

      <Modal
        transparent
        visible={Boolean(selectedJob)}
        animationType="fade"
        onRequestClose={closeDeleteConfirm}
      >
        <Pressable style={styles.backdrop} onPress={closeDeleteConfirm}>
          <Pressable>
            <ThemedView
              style={styles.confirmModal}
              lightColor="#FFFFFF"
              darkColor="#151718"
            >
              <ThemedText type="subtitle">{TEXT.CONFIRM_DELETE}</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                {TEXT.REPAIR_COMPUTER_DELETE_CONFIRM_MESSAGE}
              </ThemedText>

              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isDeleting}
                  onPress={closeDeleteConfirm}
                  style={styles.cancelButton}
                >
                  <ThemedText type="defaultSemiBold">{TEXT.CANCEL}</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isDeleting}
                  onPress={handleDelete}
                  style={[
                    styles.confirmDeleteButton,
                    isDeleting ? styles.disabledButton : undefined,
                  ]}
                >
                  {isDeleting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : null}
                  <ThemedText
                    lightColor="#FFFFFF"
                    darkColor="#FFFFFF"
                    type="defaultSemiBold"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>

      <AppToast
        message={toastMessage}
        type={toastType === "error" ? "error" : "success"}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  content: {
    flex: 1,
  },
    listWrapper: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 84,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#b33939',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '300',
    marginTop: -2,
  },
  listContent: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 80,
  },
  stateContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  stateMessage: {
    color: "#584140",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: "center",
  },
  errorText: {
    color: "#ba1a1a",
  },
  retryButton: {
    minHeight: 48,
    minWidth: 132,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#b33939",
    marginTop: 24,
  },
  emptyCard: {
    minHeight: 120,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e1e2e6",
    padding: 16,
  },
  emptyMessage: {
    color: "#584140",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  footerLoader: {
    alignItems: "center",
    paddingVertical: 14,
  },
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17, 24, 28, 0.45)",
    padding: 24,
  },
  confirmModal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 8,
    padding: 18,
  },
  confirmMessage: {
    color: "#584140",
    lineHeight: 20,
    marginTop: 10,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  cancelButton: {
    minHeight: 46,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e1e2e6",
    backgroundColor: "#FFFFFF",
  },
  confirmDeleteButton: {
    minHeight: 46,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#ba1a1a",
  },
  disabledButton: {
    opacity: 0.65,
  },
});
