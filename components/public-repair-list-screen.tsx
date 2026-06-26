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
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';

const ITEM_HEIGHT = 120;
const CHROME_HEIGHT = 200;

export type PublicRepairSegment = {
  label: string;
  listType: string;
};

type Props = {
  title: string;
  staffId: string;
  /** Single list mode. Ignored when `segments` is provided. */
  listType?: string;
  /** Top-tab mode: renders a segmented bar and lists the selected segment. */
  segments?: PublicRepairSegment[];
};

function getPageSize(height: number) {
  return Math.max(5, Math.ceil((height - CHROME_HEIGHT) / ITEM_HEIGHT));
}

export function PublicRepairListScreen({ title, listType, staffId, segments }: Props) {
  const { roleSwitcher } = usePublicRepairRole();
  const { height } = useWindowDimensions();
  const pageSize = getPageSize(height);

  const [activeSegment, setActiveSegment] = useState(0);
  const currentListType = segments ? segments[activeSegment].listType : (listType ?? '');

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
      const result = await getList(currentListType, staffId, start, pageSize);
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
  }, [currentListType, staffId, pageSize]);

  const selectSegment = useCallback((index: number) => {
    if (index === activeSegment) return;
    loadedRef.current = new Set();
    setJobs([]);
    setActiveSegment(index);
  }, [activeSegment]);

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
      <NavTopBar title={title} backHref="/" rightContent={roleSwitcher} />

      {segments && (
        <View style={styles.segmentBar}>
          {segments.map((seg, i) => {
            const active = i === activeSegment;
            return (
              <Pressable
                key={seg.listType}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.segment, active && styles.segmentActive]}
                onPress={() => selectSegment(i)}>
                <ThemedText style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {seg.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      )}

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
  segmentBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E1E2E6',
    backgroundColor: '#FFFFFF',
  },
  segmentActive: { backgroundColor: '#751A1D', borderColor: '#751A1D' },
  segmentText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  segmentTextActive: { color: '#FFFFFF' },
  list: { paddingVertical: 6 },
  emptyContainer: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 15, color: '#9CA3AF', textAlign: 'center' },
  errorText: { fontSize: 15, color: '#EF4444', textAlign: 'center' },
  footer: { paddingVertical: 16 },
});
