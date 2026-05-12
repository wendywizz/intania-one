import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { getRepairComputerJobId, RepairComputerJobListItem } from '@/components/repair-computer-job-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PROCESS } from '@/constants/domain';
import { PRIVILEGE_RC_USER } from '@/constants/type-repair-computer';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import { useRepairComputerRole } from '@/context/RepairComputerRoleContext';
import type { RepairComputer } from '@/models/types';
import { getUserHistory } from '@/services/repairComputerService';

const ESTIMATED_ITEM_HEIGHT = 132;
const LIST_VERTICAL_CHROME = 260;

function getJobKey(job: RepairComputer, index: number) {
  return `${getRepairComputerJobId(job) || 'repair-history'}-${index}`;
}

function getPageSize(screenHeight: number) {
  return Math.max(3, Math.ceil((screenHeight - LIST_VERTICAL_CHROME) / ESTIMATED_ITEM_HEIGHT));
}

export default function RepairComputerHistoryScreen() {
  const { height } = useWindowDimensions();
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

  const loadFirstPage = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError('');
    const result = await getUserHistory(staffId, PRIVILEGE_RC_USER, 0, pageSize);

    if (result.processType === PROCESS.error) {
      setJobs([]);
      setError(result.message || 'Unable to load history');
      setHasMore(false);
    } else {
      const nextJobs = Array.isArray(result.data) ? result.data : [];
      setJobs(nextJobs);
      setHasMore(nextJobs.length >= pageSize);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, [pageSize, staffId]);

  const loadMoreJobs = useCallback(async () => {
    if (isLoading || isRefreshing || isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    const result = await getUserHistory(staffId, PRIVILEGE_RC_USER, jobs.length, pageSize);

    if (result.processType === PROCESS.error) {
      setHasMore(false);
    } else {
      const nextJobs = Array.isArray(result.data) ? result.data : [];
      setJobs((currentJobs) => [...currentJobs, ...nextJobs]);
      setHasMore(nextJobs.length >= pageSize);
    }

    setIsLoadingMore(false);
  }, [hasMore, isLoading, isLoadingMore, isRefreshing, jobs.length, pageSize, staffId]);

  useFocusEffect(
    useCallback(() => {
      loadFirstPage();
    }, [loadFirstPage]),
  );

  const openJobDetail = (job: RepairComputer) => {
    const jobId = getRepairComputerJobId(job);

    if (!jobId) {
      return;
    }

    router.push({
      pathname: '/repair-computer/edit-job',
      params: { id: jobId, readonly: 'true', backHref: '/repair-computer/history' },
    } as Parameters<typeof router.push>[0]);
  };

  const renderContent = () => {
    if (isLoading) {
      return <LoadingAnimate title="Loading history" desc="Please wait a moment" />;
    }

    if (error) {
      return (
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">Something went wrong</ThemedText>
          <ThemedText style={[styles.stateMessage, styles.errorText]}>{error}</ThemedText>
          <Pressable accessibilityRole="button" onPress={() => loadFirstPage()} style={styles.retryButton}>
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
        data={jobs}
        keyExtractor={getJobKey}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadFirstPage(true)} />
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
            <ThemedText style={styles.emptyMessage}>No history</ThemedText>
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
          <ThemedText type="subtitle">History</ThemedText>
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
