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
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { EmptyState } from "@/components/empty-state";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
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

// "Active Jobs: " -> "Active Jobs" (used as the muted subtitle under the name).
const ACTIVE_JOBS_LABEL = TEXT.REPAIR_COMPUTER_ACTIVE_JOBS_PREFIX.replace(/:\s*$/, "").trim();

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
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
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
        <ThemedText type="defaultSemiBold" style={styles.workerName} numberOfLines={2}>
          {fullName}
        </ThemedText>
        <ThemedText style={styles.workerMeta}>{ACTIVE_JOBS_LABEL}</ThemedText>
      </View>

      <View style={styles.countBadge}>
        <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.countValue}>
          {queueCount}
        </ThemedText>
        <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.countUnit}>
          {TEXT.REPAIR_COMPUTER_ACTIVE_LABEL}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

export default function RepairComputerQueueScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
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
        renderItem={({ item }) => (
          <WorkerQueueListItem
            failedPhotoIds={failedPhotoIds}
            item={item}
            onPhotoError={handlePhotoError}
          />
        )}
        ListEmptyComponent={<EmptyState iconName="tray.fill" message={TEXT.REPAIR_COMPUTER_NO_WORKER_QUEUE} />}
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.REPAIR_COMPUTER_QUEUE}
        backHref="/"
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
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(223, 191, 189, 0.3)',
    padding: 16,
    gap: 14,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  workerPhoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.surfaceMuted,
  },
  photoPlaceholder: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: c.surfaceMuted,
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
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  countBadge: {
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: c.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countValue: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
  countUnit: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    opacity: 0.9,
  },
  stateContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  stateMessage: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: 'center',
  },
  errorText: {
    color: c.primary,
  },
  retryButton: {
    minHeight: 48,
    minWidth: 132,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: c.primary,
    marginTop: 24,
  },
  emptyCard: {
    minHeight: 120,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 16,
  },
  emptyMessage: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
