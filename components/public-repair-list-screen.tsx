import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { PublicRepairJobCard } from '@/components/public-repair-job-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';
import { usePublicRepairRole } from '@/context/PublicRepairRoleContext';
import type { PublicRepairJob } from '@/models/types';
import { getList } from '@/services/publicRepairService';
import { navPush } from '@/utils/navigation';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';

const ITEM_HEIGHT = 120;
const CHROME_HEIGHT = 200;

type Props = {
  title: string;
  listType: string;
  staffId: string;
};

function getPageSize(height: number) {
  return Math.max(5, Math.ceil((height - CHROME_HEIGHT) / ITEM_HEIGHT));
}

export function PublicRepairListScreen({ title, listType, staffId }: Props) {
  const { roleSwitcher } = usePublicRepairRole();
  const { height } = useWindowDimensions();
  const pageSize = getPageSize(height);

  const [jobs, setJobs] = useState<PublicRepairJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const loadingRef = useRef<number | null>(null);
  const loadedRef = useRef<Set<number>>(new Set());

  const load = useCallback(async (start: number, refresh = false) => {
    if (loadingRef.current === start || loadedRef.current.has(start)) return;
    loadingRef.current = start;

    if (start === 0) {
      refresh ? setIsRefreshing(true) : setIsLoading(true);
      setError('');
    } else {
      setIsLoadingMore(true);
    }

    try {
      const result = await getList(listType, staffId, start, pageSize);
      loadedRef.current.add(start);
      setJobs((prev) => (start === 0 ? result.data : [...prev, ...result.data]));
      setHasMore(result.data.length >= pageSize && start + result.data.length < (result.totalCount || Infinity));
    } catch (e) {
      if (start === 0) {
        setJobs([]);
        setError(e instanceof Error ? e.message : TEXT.PR_ERROR_LOAD);
        setHasMore(false);
      }
    } finally {
      loadingRef.current = null;
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [listType, staffId, pageSize]);

  const refresh = useCallback(() => {
    loadedRef.current = new Set();
    load(0, true);
  }, [load]);

  useFocusEffect(useCallback(() => {
    loadedRef.current = new Set();
    load(0);
  }, [load]));

  const onEndReached = useCallback(() => {
    if (!isLoading && !isRefreshing && !isLoadingMore && hasMore) {
      load(jobs.length);
    }
  }, [isLoading, isRefreshing, isLoadingMore, hasMore, jobs.length, load]);

  const openDetail = (job: PublicRepairJob) => {
    navPush({
      pathname: '/public-repair/detail',
      params: { repair_id: job.repair_id, staff_id: staffId },
    } as Parameters<typeof navPush>[0]);
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={title} showHomeButton rightContent={roleSwitcher} />

      {isLoading ? (
        <LoadingAnimate title={title} desc={TEXT.PR_LOADING} />
      ) : error ? (
        <View style={styles.center}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item, i) => `${item.repair_id}-${i}`}
          renderItem={({ item }) => <PublicRepairJobCard job={item} onPress={openDetail} />}
          contentContainerStyle={jobs.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.center}>
              <ThemedText style={styles.emptyText}>{TEXT.PR_NO_ITEMS}</ThemedText>
            </View>
          }
          ListFooterComponent={isLoadingMore ? <ActivityIndicator style={styles.footer} /> : null}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingVertical: 6 },
  emptyContainer: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 15, color: '#9CA3AF', textAlign: 'center' },
  errorText: { fontSize: 15, color: '#EF4444', textAlign: 'center' },
  footer: { paddingVertical: 16 },
});
