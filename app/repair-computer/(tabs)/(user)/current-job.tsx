import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import { TEXT } from '@/constants/text';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { AppToast } from '@/components/app-toast';
import { getRepairComputerJobId, RepairComputerJobListItem } from '@/components/repair-computer-job-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PROCESS } from '@/constants/domain';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import { useRepairComputerRole } from '@/context/RepairComputerRoleContext';
import type { RepairComputer, Result } from '@/models/types';
import { getUserCurrentJob, removeJob } from '@/services/repairComputerService';

const ESTIMATED_ITEM_HEIGHT = 132;
const LIST_VERTICAL_CHROME = 260;
const statusFields = ['status', 'state', 'statusId', 'status_id'];

function getJobKey(job: RepairComputer, index: number) {
  return `${getRepairComputerJobId(job) || 'repair-job'}-${index}`;
}

function getPageSize(screenHeight: number) {
  return Math.max(3, Math.ceil((screenHeight - LIST_VERTICAL_CHROME) / ESTIMATED_ITEM_HEIGHT));
}

function getHasMore(currentCount: number, pageSize: number, result: Result<RepairComputer[]>) {
  if (typeof result.totalCount === 'number') {
    return currentCount < result.totalCount;
  }

  const pageCount = Array.isArray(result.data) ? result.data.length : 0;
  return pageCount >= pageSize;
}

function getJobText(job: RepairComputer, fields: string[]) {
  for (const field of fields) {
    const value = job[field];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number') {
      return String(value);
    }
  }

  return '';
}

function canEditJob(job: RepairComputer) {
  const status = getJobText(job, statusFields);
  return status === '' || Number(status) === 0;
}

function blurActiveWebElement() {
  if (Platform.OS !== 'web') {
    return;
  }

  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
}

export default function RepairComputerCurrentJobScreen() {
  const { height } = useWindowDimensions();
  const pathname = usePathname();
  const { user: authUser } = useAuth();
  const { roleSwitcher } = useRepairComputerRole();
  const staffId = authUser?.staffId || USER_ID;
  const pageSize = getPageSize(height);
  const [jobs, setJobs] = useState<RepairComputer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const [selectedJob, setSelectedJob] = useState<RepairComputer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | ''>('');
  const autoLoadedRouteRef = useRef('');
  const loadingStartRef = useRef<number | null>(null);
  const loadedStartRef = useRef<Set<number>>(new Set());

  const loadFirstPage = useCallback(async (showRefreshing = false, forceReload = false) => {
    if (loadingStartRef.current === 0 || (!forceReload && loadedStartRef.current.has(0))) {
      return;
    }

    loadingStartRef.current = 0;
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError('');
    const result = await getUserCurrentJob(staffId, 0, pageSize);
    loadingStartRef.current = null;
    loadedStartRef.current = new Set([0]);

    if (result.processType === PROCESS.error) {
      setJobs([]);
      setError(result.message || TEXT.UNABLE_TO_LOAD_CURRENT_JOBS);
      setHasMore(false);
    } else {
      const nextJobs = Array.isArray(result.data) ? result.data : [];
      setJobs(nextJobs);
      setHasMore(getHasMore(nextJobs.length, pageSize, result));
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, [pageSize, staffId]);

  const loadMoreJobs = useCallback(async () => {
    if (isLoading || isRefreshing || isLoadingMore || !hasMore) {
      return;
    }

    const start = jobs.length;

    if (loadingStartRef.current === start || loadedStartRef.current.has(start)) {
      return;
    }

    loadingStartRef.current = start;
    setIsLoadingMore(true);
    const result = await getUserCurrentJob(staffId, start, pageSize);
    loadingStartRef.current = null;
    loadedStartRef.current.add(start);

    if (result.processType === PROCESS.error) {
      setHasMore(false);
    } else {
      const nextJobs = Array.isArray(result.data) ? result.data : [];
      setJobs((currentJobs) => [...currentJobs, ...nextJobs]);
      setHasMore(getHasMore(start + nextJobs.length, pageSize, result));
    }

    setIsLoadingMore(false);
  }, [hasMore, isLoading, isLoadingMore, isRefreshing, jobs.length, pageSize, staffId]);

  useEffect(() => {
    if (pathname !== '/repair-computer/current-job') {
      return;
    }

    if (autoLoadedRouteRef.current !== pathname) {
      autoLoadedRouteRef.current = pathname;
      loadFirstPage(false, true);
    }
  }, [loadFirstPage, pathname]);

  const openDeleteConfirm = (job: RepairComputer) => {
    blurActiveWebElement();
    setSelectedJob(job);
  };

  const openEditForm = (job: RepairComputer) => {
    const jobId = getRepairComputerJobId(job);

    if (!jobId) {
      setToastType('error');
      setToastMessage(TEXT.UNABLE_TO_OPEN_JOB_DETAIL);
      return;
    }

    blurActiveWebElement();
    router.push({
      pathname: '/repair-computer/edit-job',
      params: {
        id: jobId,
        ...(canEditJob(job) ? {} : { readonly: 'true' }),
      },
    } as Parameters<typeof router.push>[0]);
  };

  const closeDeleteConfirm = () => {
    if (isDeleting) {
      return;
    }

    blurActiveWebElement();
    setSelectedJob(null);
  };

  const handleDelete = async () => {
    const jobId = selectedJob ? getRepairComputerJobId(selectedJob) : '';

    if (!jobId || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setToastMessage('');
    setToastType('');

    const result = await removeJob(jobId);

    setIsDeleting(false);
    setSelectedJob(null);

    if (result.processType === PROCESS.success && result.success !== false) {
      setToastType('success');
      setToastMessage(result.message || TEXT.REPAIR_JOB_DELETED_SUCCESSFULLY);
      loadFirstPage(false, true);
      return;
    }

    setToastType('error');
    setToastMessage(result.message || TEXT.UNABLE_TO_DELETE_REPAIR_JOB);
  };

  const renderContent = () => {
    if (isLoading) {
      return <LoadingAnimate title={TEXT.LOADING_CURRENT_JOBS} desc={TEXT.PLEASE_WAIT_A_MOMENT} />;
    }

    if (error) {
      return (
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">{TEXT.SOMETHING_WENT_WRONG}</ThemedText>
          <ThemedText style={[styles.stateMessage, styles.errorText]}>{error}</ThemedText>
          <Pressable accessibilityRole="button" onPress={() => loadFirstPage(false, true)} style={styles.retryButton}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              {TEXT.RETRY}</ThemedText>
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
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadFirstPage(true, true)} />
        }
        onEndReached={loadMoreJobs}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <RepairComputerJobListItem job={item} onDelete={openDeleteConfirm} onPress={openEditForm} />
        )}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color="#0A6E8A" size="small" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <ThemedView style={styles.emptyCard} lightColor="#FFFFFF" darkColor="#151718">
            <ThemedText style={styles.emptyMessage}>{TEXT.NO_CURRENT_JOBS}</ThemedText>
          </ThemedView>
        }
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.REPAIR_COMPUTER} backHref="/" rightContent={roleSwitcher} />

      <View style={styles.content}>
        <ThemedView style={styles.panel} lightColor="#F3F8FB" darkColor="#1F2B30">
          <ThemedText type="subtitle">{TEXT.CURRENT_JOB}</ThemedText>
          {renderContent()}
        </ThemedView>
      </View>

      <Modal transparent visible={Boolean(selectedJob)} animationType="fade" onRequestClose={closeDeleteConfirm}>
        <Pressable style={styles.backdrop} onPress={closeDeleteConfirm}>
          <Pressable>
            <ThemedView style={styles.confirmModal} lightColor="#FFFFFF" darkColor="#151718">
              <ThemedText type="subtitle">{TEXT.CONFIRM_DELETE}</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                {TEXT.DO_YOU_WANT_TO_DELETE_THIS_REPAIR_COMPUTER_JOB}</ThemedText>

              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isDeleting}
                  onPress={closeDeleteConfirm}
                  style={styles.cancelButton}>
                  <ThemedText type="defaultSemiBold">{TEXT.CANCEL}</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isDeleting}
                  onPress={handleDelete}
                  style={[styles.confirmDeleteButton, isDeleting ? styles.disabledButton : undefined]}>
                  {isDeleting ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                  <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>

      <AppToast message={toastMessage} type={toastType === 'error' ? 'error' : 'success'} />
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
  footerLoader: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: 24,
  },
  confirmModal: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 8,
    padding: 18,
  },
  confirmMessage: {
    color: '#687076',
    lineHeight: 20,
    marginTop: 10,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  cancelButton: {
    minHeight: 46,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#BFD2DA',
    backgroundColor: '#FFFFFF',
  },
  confirmDeleteButton: {
    minHeight: 46,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#C44D58',
  },
  disabledButton: {
    opacity: 0.65,
  },
});
