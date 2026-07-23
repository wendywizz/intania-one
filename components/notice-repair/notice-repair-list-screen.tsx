import { Inbox } from 'lucide-react-native';
import { EmptyState } from '@/components/empty-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { NoticeRepairJobCard } from '@/components/notice-repair/notice-repair-job-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';
import { useNoticeRepairRole } from '@/context/NoticeRepairRoleContext';
import type { NoticeRepairJob } from '@/models/types';
import { getList } from '@/services/noticeRepairService';
import { navPush } from '@/utils/navigation';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

const ITEM_HEIGHT = 120;
const CHROME_HEIGHT = 200;

export type NoticeRepairSegment = {
  label: string;
  listType: string;
  /** Title shown while this segment is active (falls back to the screen title). */
  title?: string;
  /** Sub-title shown under the top-tab bar while this segment is active. */
  description?: string;
  /** Detail route to open for items in this segment (defaults to /notice-repair/detail). */
  detailPathname?: string;
  /** Extra work_category filter passed to the list endpoint for this segment. */
  workCategory?: string | number;
};

type Props = {
  title: string;
  staffId: string;
  /** Subtitle shown under the screen title. Falls back to a generic line. */
  description?: string;
  /** Single list mode. Ignored when `segments` is provided. */
  listType?: string;
  /** Top-tab mode: renders a segmented bar and lists the selected segment. */
  segments?: NoticeRepairSegment[];
  /** When provided, shows a floating "+" button that runs this handler. */
  onAddPress?: () => void;
  addLabel?: string;
  /** Detail route to open when a job is tapped (defaults to /notice-repair/detail). */
  detailPathname?: string;
  /** Extra work_category filter passed to the list endpoint (single-list mode). */
  workCategory?: string | number;
};

function getPageSize(height: number) {
  return Math.max(5, Math.ceil((height - CHROME_HEIGHT) / ITEM_HEIGHT));
}

export function NoticeRepairListScreen({ title, description, listType, staffId, segments, onAddPress, addLabel, detailPathname, workCategory }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { roleSwitcher, currentRole } = useNoticeRepairRole();
  const { height } = useWindowDimensions();
  const pageSize = getPageSize(height);

  const [activeSegment, setActiveSegment] = useState(0);
  const currentListType = segments ? segments[activeSegment].listType : (listType ?? '');
  const currentWorkCategory = segments ? segments[activeSegment].workCategory : workCategory;

  const [jobs, setJobs] = useState<NoticeRepairJob[]>([]);
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
      const result = await getList(currentListType, staffId, start, pageSize, currentWorkCategory);
      loadedRef.current.add(start);
      setJobs((prev) => (start === 0 ? result.data : [...prev, ...result.data]));
      setHasMore(result.data.length >= pageSize && start + result.data.length < (result.totalCount || Infinity));
    } catch (e) {
      if (start === 0) {
        setJobs([]);
        setError(e instanceof Error ? e.message : TEXT.NOTICE_REPAIR_ERROR_LOAD);
        setHasMore(false);
      }
    } finally {
      loadingRef.current = null;
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [currentListType, staffId, pageSize, currentWorkCategory]);

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

  const openDetail = (job: NoticeRepairJob) => {
    const pathname = (segments ? segments[activeSegment]?.detailPathname : detailPathname) ?? '/notice-repair/detail';
    navPush({
      pathname,
      params: { repair_id: job.repair_id, staff_id: staffId, role: currentRole, source: currentListType },
    } as Parameters<typeof navPush>[0]);
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.NOTICE_REPAIR__TITLE}
        subtitle={TEXT.NOTICE_REPAIR_LIST_SUBTITLE}
        moduleIcon="wrench.fill"
        backHref="/"
        rightContent={roleSwitcher}
      />

      {segments ? (
        /* Top-tab bar directly under the nav bar, with an underline on the
           active tab (material-style). */
        <View style={styles.topTabBar}>
          {segments.map((seg, i) => {
            const active = i === activeSegment;
            return (
              <Pressable
                key={seg.listType}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={styles.topTab}
                onPress={() => selectSegment(i)}>
                <ThemedText style={[styles.topTabText, active && styles.topTabTextActive]}>
                  {seg.label}
                </ThemedText>
                <View style={[styles.topTabIndicator, active && styles.topTabIndicatorActive]} />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Title + sub-title, same typography as the non-segmented screens. In
          segments mode the sub-title reflects the active tab. */}
      <View style={styles.panelHeader}>
        <ThemedText type="subtitle">
          {segments ? (segments[activeSegment]?.title ?? title) : title}
        </ThemedText>
        <ThemedText style={styles.panelDescription}>
          {segments
            ? (segments[activeSegment]?.description ?? description ?? TEXT.NOTICE_REPAIR_LIST_SUBTITLE)
            : (description ?? TEXT.NOTICE_REPAIR_LIST_SUBTITLE)}
        </ThemedText>
      </View>

      {isLoading ? (
        <LoadingAnimate title={title} desc={TEXT.NOTICE_REPAIR_LOADING} />
      ) : error ? (
        <View style={styles.center}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item, i) => `${item.repair_id}-${i}`}
          renderItem={({ item }) => <NoticeRepairJobCard job={item} onPress={openDetail} />}
          contentContainerStyle={jobs.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<EmptyState icon={Inbox} message={TEXT.NOTICE_REPAIR_NO_ITEMS} />}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator style={styles.footer} /> : null}
        />
      )}

      {onAddPress && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={addLabel}
          onPress={onAddPress}
          style={styles.fab}>
          <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.fabIcon}>+</ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  panelHeader: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 4,
  },
  panelDescription: {
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  topTabBar: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  topTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 12,
    gap: 8,
  },
  topTabText: { fontSize: 14, fontWeight: '600', color: c.textFaint },
  topTabTextActive: { color: c.primary },
  topTabIndicator: { height: 3, width: 28, borderRadius: 2, backgroundColor: 'transparent' },
  topTabIndicatorActive: { backgroundColor: c.primary },
  list: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 },
  emptyContainer: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 15, color: c.textFaint, textAlign: 'center' },
  errorText: { fontSize: 15, color: c.danger, textAlign: 'center' },
  footer: { paddingVertical: 16 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },
  fabIcon: { fontSize: 30, lineHeight: 34, fontWeight: '300', marginTop: -2 },
});
