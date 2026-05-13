import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';
import { TEXT } from '@/constants/text';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { getRepairComputerJobId, RepairComputerJobListItem } from '@/components/repair-computer-job-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PROCESS } from '@/constants/domain';
import {
  PRIVILEGE_RC_FOREMAN,
  PRIVILEGE_RC_WORKER,
  type RepairComputerRole,
} from '@/constants/type-repair-computer';
import { useRepairComputerRole } from '@/context/RepairComputerRoleContext';
import type { RepairComputer, Result } from '@/models/types';

const ESTIMATED_ITEM_HEIGHT = 132;
const LIST_VERTICAL_CHROME = 260;

type RepairComputerJobListScreenProps = {
  title: string;
  emptyMessage: string;
  errorMessage: string;
  loadingTitle: string;
  loadPage: (start: number, length: number) => Promise<Result<RepairComputer[]>>;
  detailBackHref: string;
  detailPathname?: '/repair-computer/edit-job' | '/repair-computer/foreman-job-detail';
};

function getJobKey(job: RepairComputer, index: number) {
  return `${getRepairComputerJobId(job) || 'repair-job'}-${index}`;
}

function getPageSize(screenHeight: number) {
  return Math.max(3, Math.ceil((screenHeight - LIST_VERTICAL_CHROME) / ESTIMATED_ITEM_HEIGHT));
}

function getRoleTitlePrefix(role: RepairComputerRole) {
  if (role === PRIVILEGE_RC_FOREMAN) {
    return TEXT.FOREMAN;
  }

  if (role === PRIVILEGE_RC_WORKER) {
    return TEXT.WORKER;
  }

  return 'User';
}

function getHasMore(currentCount: number, pageSize: number, result: Result<RepairComputer[]>) {
  if (typeof result.totalCount === 'number') {
    return currentCount < result.totalCount;
  }

  const pageCount = Array.isArray(result.data) ? result.data.length : 0;
  return pageCount >= pageSize;
}

export function RepairComputerJobListScreen({
  title,
  emptyMessage,
  errorMessage,
  loadingTitle,
  loadPage,
  detailBackHref,
  detailPathname = '/repair-computer/edit-job',
}: RepairComputerJobListScreenProps) {
  const { height } = useWindowDimensions();
  const pathname = usePathname();
  const { currentRole, roleSwitcher } = useRepairComputerRole();
  const screenTitle = title === TEXT.NEW_JOB ? `${getRoleTitlePrefix(currentRole)} ${title}` : title;
  const pageSize = getPageSize(height);
  const [jobs, setJobs] = useState<RepairComputer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
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
    const result = await loadPage(0, pageSize);
    loadingStartRef.current = null;
    loadedStartRef.current = new Set([0]);

    if (result.processType === PROCESS.error) {
      setJobs([]);
      setError(result.message || errorMessage);
      setHasMore(false);
    } else {
      const nextJobs = Array.isArray(result.data) ? result.data : [];
      setJobs(nextJobs);
      setHasMore(getHasMore(nextJobs.length, pageSize, result));
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, [errorMessage, loadPage, pageSize]);

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
    const result = await loadPage(start, pageSize);
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
  }, [hasMore, isLoading, isLoadingMore, isRefreshing, jobs.length, loadPage, pageSize]);

  useEffect(() => {
    if (pathname !== detailBackHref) {
      return;
    }

    if (autoLoadedRouteRef.current !== pathname) {
      autoLoadedRouteRef.current = pathname;
      loadedStartRef.current = new Set();
      loadFirstPage(false, true);
    }
  }, [detailBackHref, loadFirstPage, pathname]);

  const openJobDetail = (job: RepairComputer) => {
    const jobId = getRepairComputerJobId(job);

    if (!jobId) {
      return;
    }

    router.push({
      pathname: detailPathname,
      params: { id: jobId, readonly: 'true', backHref: detailBackHref },
    } as Parameters<typeof router.push>[0]);
  };

  const renderContent = () => {
    if (isLoading) {
      return <LoadingAnimate title={loadingTitle} desc={TEXT.PLEASE_WAIT_A_MOMENT} />;
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
        renderItem={({ item }) => <RepairComputerJobListItem job={item} onPress={openJobDetail} />}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color="#0A6E8A" size="small" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <ThemedView style={styles.emptyCard} lightColor="#FFFFFF" darkColor="#151718">
            <ThemedText style={styles.emptyMessage}>{emptyMessage}</ThemedText>
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
          <ThemedText type="subtitle">{screenTitle}</ThemedText>
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
});
