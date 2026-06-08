import { TEXT } from "@/constants/text";
import { usePathname } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const workerId = getWorkerId(item);
  const fullName = getWorkerFullName(item);
  const queueCount = getText(item, queueCountFields) || "0";
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
            lightColor="#0A6E8A"
            darkColor="#0A6E8A"
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
      </View>

      <View style={styles.queueBadge}>
        <ThemedText
          lightColor="#0A6E8A"
          darkColor="#0A6E8A"
          type="defaultSemiBold"
          style={styles.queueCount}
        >
          {queueCount}
        </ThemedText>
        <ThemedText style={styles.queueLabel}>
          {TEXT.REPAIR_COMPUTER_JOBS}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

export default function RepairComputerQueueScreen() {
  const pathname = usePathname();
  const { roleSwitcher } = useRepairComputerRole();
  const [workers, setWorkers] = useState<WorkerQueueItem[]>([]);
  const [failedPhotoIds, setFailedPhotoIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const autoLoadedRouteRef = useRef("");
  const isLoadingQueueRef = useRef(false);

  const loadQueue = useCallback(
    async (showRefreshing = false, forceReload = false) => {
      if (
        isLoadingQueueRef.current ||
        (!forceReload &&
          autoLoadedRouteRef.current === "/repair-computer/queue")
      ) {
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

  useEffect(() => {
    if (
      pathname === "/repair-computer/queue" &&
      autoLoadedRouteRef.current !== pathname
    ) {
      autoLoadedRouteRef.current = pathname;
      loadQueue(false, true);
    }
  }, [loadQueue, pathname]);

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
            onPress={() => loadQueue(false, true)}
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
            onRefresh={() => loadQueue(true, true)}
          />
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
        backHref="/"
        rightContent={roleSwitcher}
      />

      <View style={styles.content}>
        <ThemedView
          style={styles.panel}
          lightColor="#FFFFFF"
          darkColor="#1F2B30"
        >
          <ThemedText type="subtitle">{TEXT.REPAIR_COMPUTER_QUEUE}</ThemedText>
          {renderContent()}
        </ThemedView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  panel: {
    flex: 1,
    borderRadius: 8,
    padding: 0,
  },
  listContent: {
    gap: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  itemCard: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D7E6EC",
    padding: 14,
  },
  workerPhoto: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#E4F0F6",
  },
  photoPlaceholder: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 29,
    backgroundColor: "#E4F0F6",
  },
  placeholderText: {
    fontSize: 22,
    lineHeight: 28,
  },
  workerInfo: {
    flex: 1,
    marginLeft: 14,
  },
  workerName: {
    fontSize: 16,
    lineHeight: 22,
  },
  workerMeta: {
    color: "#687076",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  queueBadge: {
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#E4F0F6",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  queueCount: {
    fontSize: 18,
    lineHeight: 22,
  },
  queueLabel: {
    color: "#687076",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  stateContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  stateMessage: {
    color: "#687076",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
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
    backgroundColor: "#0A6E8A",
    marginTop: 24,
  },
  emptyCard: {
    minHeight: 120,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D7E6EC",
    padding: 16,
  },
  emptyMessage: {
    color: "#687076",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
