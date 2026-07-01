import { TEXT } from "@/constants/text";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from "react-native";

import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useRepairComputerRole } from "@/context/RepairComputerRoleContext";
import { workerQueue } from "@/services/repairComputerService";

type WorkerQueueItem = Record<string, unknown>;

const workerIdFields = ["worker_id", "workerId", "staff_id", "staffId", "id"];
const fullNameFields = [
  "workerFullname",
  "worker_fullname",
  "fullname",
  "fullName",
];
const firstNameFields = [
  "firstname",
  "firstName",
  "first_name",
  "firstNameTH",
  "first_name_th",
];
const lastNameFields = [
  "lastname",
  "lastName",
  "last_name",
  "lastNameTH",
  "last_name_th",
];
const queueCountFields = [
  "queue_count",
  "queueCount",
  "current_job_queue_count",
  "currentJobQueueCount",
  "job_count",
  "jobCount",
  "count",
];

function getText(item: WorkerQueueItem, fields: string[]) {
  for (const field of fields) {
    const value = item[field];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function getWorkerId(item: WorkerQueueItem) {
  return getText(item, workerIdFields);
}

function getWorkerKey(item: WorkerQueueItem, index: number) {
  return `${getWorkerId(item) || "worker"}-${index}`;
}

function getWorkerFullName(item: WorkerQueueItem) {
  const responseFullName = getText(item, fullNameFields);
  const firstName = getText(item, firstNameFields);
  const lastName = getText(item, lastNameFields);
  return (
    responseFullName ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    getWorkerId(item) ||
    "Worker"
  );
}

function getQueueCount(item: WorkerQueueItem) {
  return Number(getText(item, queueCountFields) || "0");
}

function sortWorkersByNameAsc(items: WorkerQueueItem[]) {
  return [...items].sort((leftItem, rightItem) => {
    return getWorkerFullName(leftItem).localeCompare(
      getWorkerFullName(rightItem),
    );
  });
}

function computeTotalJobs(items: WorkerQueueItem[]) {
  return items.reduce((sum, item) => sum + getQueueCount(item), 0);
}

function getResponsePhoto(item: WorkerQueueItem) {
  const photo = item.photo;

  if (typeof photo === "string" && photo.trim()) {
    const value = photo.trim();
    if (/^(data:|https?:\/\/|file:|content:|asset:)/i.test(value)) {
      return value;
    }
    return `data:image/jpeg;base64,${value}`;
  }

  if (photo && typeof photo === "object") {
    const record = photo as Record<string, unknown>;
    const uri = record.uri || record.url || record.src;
    const base64 = record.base64 || record.data;

    if (typeof uri === "string" && uri.trim()) {
      return uri.trim();
    }

    if (typeof base64 === "string" && base64.trim()) {
      return `data:image/jpeg;base64,${base64.trim()}`;
    }
  }

  return "";
}

type WorkerQueueListItemProps = {
  failedPhotoIds: Set<string>;
  item: WorkerQueueItem;
  onPhotoError: (workerId: string) => void;
};

function WorkerQueueListItem({
  failedPhotoIds,
  item,
  onPhotoError,
}: WorkerQueueListItemProps) {
  const workerId = getWorkerId(item);
  const fullName = getWorkerFullName(item);
  const queueCount = getQueueCount(item);
  const photoUri = getResponsePhoto(item);
  const photoKey = photoUri || workerId;
  const shouldShowPhoto = Boolean(photoUri) && !failedPhotoIds.has(photoKey);

  return (
    <ThemedView
      style={styles.itemCard}
      lightColor="#FFFFFF"
      darkColor="#151718"
    >
      {shouldShowPhoto ? (
        <Image
          onError={() => onPhotoError(photoKey)}
          source={{ uri: photoUri }}
          style={styles.workerPhoto}
        />
      ) : (
        <View style={styles.photoPlaceholder}>
          <ThemedText
            lightColor="#584140"
            darkColor="#584140"
            type="defaultSemiBold"
            style={styles.placeholderText}
          >
            {fullName.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
      )}

      <View style={styles.workerInfo}>
        <ThemedText type="defaultSemiBold" style={styles.workerName}>
          {fullName}
        </ThemedText>
        <ThemedText style={styles.workerMeta}>
          {TEXT.REPAIR_COMPUTER_ACTIVE_JOBS_PREFIX}{queueCount}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

export default function RepairComputerQueueScreen() {
  const { roleSwitcher } = useRepairComputerRole();
  const [workers, setWorkers] = useState<WorkerQueueItem[]>([]);
  const [failedPhotoIds, setFailedPhotoIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const isLoadingQueueRef = useRef(false);

  const loadQueue = useCallback(
    async (showRefreshing = false) => {
      if (isLoadingQueueRef.current) {
        return;
      }

      isLoadingQueueRef.current = true;
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");
      try {
        const result = await workerQueue();
        setWorkers(sortWorkersByNameAsc(result.data));
      } catch (error) {
        setWorkers([]);
        setError(
          error instanceof Error
            ? error.message
            : TEXT.REPAIR_COMPUTER_UNABLE_TO_LOAD_WORKER_QUEUE,
        );
      } finally {
        isLoadingQueueRef.current = false;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      loadQueue();
    }, [loadQueue]),
  );

  const handlePhotoError = (workerId: string) => {
    setFailedPhotoIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(workerId);
      return nextIds;
    });
  };

  const totalJobs = computeTotalJobs(workers);

  const renderContent = () => {
    if (isLoading) {
      return (
        <LoadingAnimate
          title={TEXT.REPAIR_COMPUTER_LOADING_QUEUE}
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
            onPress={() => loadQueue()}
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
        data={workers}
        keyExtractor={getWorkerKey}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadQueue(true)}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <ThemedView style={styles.statsCard} lightColor="#FFFFFF" darkColor="#151718">
              <ThemedText type="defaultSemiBold" style={styles.statsLabel}>
                {TEXT.REPAIR_COMPUTER_TOTAL_JOBS}
              </ThemedText>
              <View style={styles.statsBadge}>
                <ThemedText
                  lightColor="#FFFFFF"
                  darkColor="#FFFFFF"
                  style={styles.statsCount}
                >
                  {totalJobs}
                </ThemedText>
                <ThemedText
                  lightColor="#FFFFFF"
                  darkColor="#FFFFFF"
                  style={styles.statsActive}
                >
                  {TEXT.REPAIR_COMPUTER_ACTIVE_LABEL}
                </ThemedText>
              </View>
            </ThemedView>

            {workers.length > 0 ? (
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Active Jobs
              </ThemedText>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <WorkerQueueListItem
            failedPhotoIds={failedPhotoIds}
            item={item}
            onPhotoError={handlePhotoError}
          />
        )}
        ListEmptyComponent={
          <ThemedView
            style={styles.emptyCard}
            lightColor="#FFFFFF"
            darkColor="#151718"
          >
            <ThemedText style={styles.emptyMessage}>
              {TEXT.REPAIR_COMPUTER_NO_WORKER_QUEUE}
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
        subtitle={TEXT.REPAIR_COMPUTER_TECHNICIAN_QUEUE}
        moduleIcon="laptop"
        backHref="/"
        rightContent={roleSwitcher}
      />

      <View style={styles.content}>
        <View style={styles.listWrapper}>
          {renderContent()}
        </View>
      </View>
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
  listContent: {
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  listHeader: {
    gap: 14,
    paddingTop: 4,
    paddingBottom: 4,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e1e2e6',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statsLabel: {
    fontSize: 15,
    lineHeight: 21,
  },
  statsBadge: {
    minWidth: 64,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#b33939',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statsCount: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
  statsActive: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    opacity: 0.9,
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#191c1f',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e1e2e6',
    padding: 14,
    gap: 14,
  },
  workerPhoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#edeef2',
  },
  photoPlaceholder: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: '#edeef2',
  },
  placeholderText: {
    fontSize: 20,
    lineHeight: 26,
  },
  workerInfo: {
    flex: 1,
    gap: 3,
  },
  workerName: {
    fontSize: 15,
    lineHeight: 21,
  },
  workerMeta: {
    color: '#584140',
    fontSize: 13,
    lineHeight: 18,
  },
  stateContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  stateMessage: {
    color: '#584140',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: 'center',
  },
  errorText: {
    color: '#ba1a1a',
  },
  retryButton: {
    minHeight: 48,
    minWidth: 132,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#b33939',
    marginTop: 24,
  },
  emptyCard: {
    minHeight: 120,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e1e2e6',
    padding: 16,
  },
  emptyMessage: {
    color: '#584140',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
