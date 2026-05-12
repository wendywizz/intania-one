import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PROCESS } from '@/constants/domain';
import { ENDPOINTS } from '@/constants/endpoints';
import { useRepairComputerRole } from '@/context/RepairComputerRoleContext';
import { workerQueue } from '@/services/repairComputerService';

type WorkerQueueItem = Record<string, unknown>;

const workerIdFields = ['worker_id', 'workerId', 'staff_id', 'staffId', 'id'];
const fullNameFields = ['workerFullname', 'worker_fullname', 'fullname', 'fullName'];
const firstNameFields = ['firstname', 'firstName', 'first_name', 'firstNameTH', 'first_name_th'];
const lastNameFields = ['lastname', 'lastName', 'last_name', 'lastNameTH', 'last_name_th'];
const queueCountFields = ['queue_count', 'queueCount', 'current_job_queue_count', 'currentJobQueueCount', 'job_count', 'jobCount', 'count'];

function getText(item: WorkerQueueItem, fields: string[]) {
  for (const field of fields) {
    const value = item[field];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number') {
      return String(value);
    }
  }

  return '';
}

function getWorkerId(item: WorkerQueueItem) {
  return getText(item, workerIdFields);
}

function getWorkerKey(item: WorkerQueueItem, index: number) {
  return `${getWorkerId(item) || 'worker'}-${index}`;
}

function getWorkerFullName(item: WorkerQueueItem) {
  const responseFullName = getText(item, fullNameFields);
  const firstName = getText(item, firstNameFields);
  const lastName = getText(item, lastNameFields);
  return responseFullName || [firstName, lastName].filter(Boolean).join(' ') || getWorkerId(item) || 'Worker';
}

function sortWorkersByNameAsc(items: WorkerQueueItem[]) {
  return [...items].sort((leftItem, rightItem) => {
    return getWorkerFullName(leftItem).localeCompare(getWorkerFullName(rightItem));
  });
}

type WorkerQueueListItemProps = {
  failedPhotoIds: Set<string>;
  item: WorkerQueueItem;
  onPhotoError: (workerId: string) => void;
};

function WorkerQueueListItem({ failedPhotoIds, item, onPhotoError }: WorkerQueueListItemProps) {
  const workerId = getWorkerId(item);
  const fullName = getWorkerFullName(item);
  const queueCount = getText(item, queueCountFields) || '0';
  const photoUri = `${ENDPOINTS.photoBase}${workerId}.jpg`;
  const shouldShowPhoto = Boolean(workerId) && !failedPhotoIds.has(workerId);

  return (
    <ThemedView style={styles.itemCard} lightColor="#FFFFFF" darkColor="#151718">
      {shouldShowPhoto ? (
        <Image
          onError={() => onPhotoError(workerId)}
          source={{ uri: photoUri }}
          style={styles.workerPhoto}
        />
      ) : (
        <View style={styles.photoPlaceholder}>
          <ThemedText lightColor="#0A6E8A" darkColor="#0A6E8A" type="defaultSemiBold" style={styles.placeholderText}>
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
        <ThemedText lightColor="#0A6E8A" darkColor="#0A6E8A" type="defaultSemiBold" style={styles.queueCount}>
          {queueCount}
        </ThemedText>
        <ThemedText style={styles.queueLabel}>Jobs</ThemedText>
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
  const [error, setError] = useState('');

  const loadQueue = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError('');
    const result = await workerQueue();

    if (result.processType === PROCESS.error) {
      setWorkers([]);
      setError(result.message || 'Unable to load worker queue');
    } else {
      setWorkers(Array.isArray(result.data) ? sortWorkersByNameAsc(result.data) : []);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

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
      return <LoadingAnimate title="Loading queue" desc="Please wait a moment" />;
    }

    if (error) {
      return (
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">Something went wrong</ThemedText>
          <ThemedText style={[styles.stateMessage, styles.errorText]}>{error}</ThemedText>
          <Pressable accessibilityRole="button" onPress={() => loadQueue()} style={styles.retryButton}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              Retry
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
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadQueue(true)} />
        }
        renderItem={({ item }) => (
          <WorkerQueueListItem
            failedPhotoIds={failedPhotoIds}
            item={item}
            onPhotoError={handlePhotoError}
          />
        )}
        ListEmptyComponent={
          <ThemedView style={styles.emptyCard} lightColor="#FFFFFF" darkColor="#151718">
            <ThemedText style={styles.emptyMessage}>No worker queue</ThemedText>
          </ThemedView>
        }
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title="Repair Computer" backHref="/" rightContent={roleSwitcher} />

      <View style={styles.content}>
        <ThemedView style={styles.panel} lightColor="#F3F8FB" darkColor="#1F2B30">
          <ThemedText type="subtitle">Queue</ThemedText>
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
    padding: 24,
  },
  panel: {
    flex: 1,
    borderRadius: 8,
    padding: 20,
  },
  listContent: {
    gap: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  itemCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
    padding: 14,
  },
  workerPhoto: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#E4F0F6',
  },
  photoPlaceholder: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: '#E4F0F6',
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
    color: '#687076',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  queueBadge: {
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#E4F0F6',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  queueCount: {
    fontSize: 18,
    lineHeight: 22,
  },
  queueLabel: {
    color: '#687076',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  stateContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  stateMessage: {
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  errorText: {
    color: '#B42318',
  },
  retryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0A6E8A',
    marginTop: 24,
  },
  emptyCard: {
    minHeight: 120,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
    padding: 16,
  },
  emptyMessage: {
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
