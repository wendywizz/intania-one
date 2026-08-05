import { EmptyState, type EmptyPreset } from '@/components/empty-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { NoticeRepairJobCard } from '@/components/notice-repair/notice-repair-job-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { useNoticeRepairRole } from '@/context/NoticeRepairRoleContext';
import type { NoticeRepairJob } from '@/models/types';
import { getList } from '@/services/noticeRepairService';
import { navPush } from '@/utils/navigation';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

const ITEM_HEIGHT = 120;
const CHROME_HEIGHT = 200;

export type NoticeRepairSegment = {
  label: string;
  listType: string;
  /** Detail route to open for items in this segment (defaults to /notice-repair/detail). */
  detailPathname?: string;
  /** Extra work_category filter passed to the list endpoint for this segment. */
  workCategory?: string | number;
  /**
   * What to say when *this* segment is empty. Segments sit side by side under
   * one title, so a shared "ไม่มีรายการแจ้งซ่อม" never says which of them the
   * reader just emptied.
   */
  emptyMessage?: string;
  /** Which picture this segment's empty state gets. Defaults to `notice`. */
  emptyPreset?: EmptyPreset;
};

type Props = {
  /** Shown in the loading state; the nav bar carries the module title. */
  title: string;
  staffId: string;
  /** Single list mode. Ignored when `segments` is provided. */
  listType?: string;
  /** Top-tab mode: renders a segmented bar and lists the selected segment. */
  segments?: NoticeRepairSegment[];
  /** When provided, shows a dashed "add" button above the list that runs this handler. */
  onAddPress?: () => void;
  addLabel?: string;
  /** Detail route to open when a job is tapped (defaults to /notice-repair/detail). */
  detailPathname?: string;
  /** Extra work_category filter passed to the list endpoint (single-list mode). */
  workCategory?: string | number;
  /** What to say when the list is empty (single-list mode). */
  emptyMessage?: string;
  /** Which picture the empty state gets. Defaults to `notice`. */
  emptyPreset?: EmptyPreset;
};

function getPageSize(height: number) {
  return Math.max(5, Math.ceil((height - CHROME_HEIGHT) / ITEM_HEIGHT));
}

export function NoticeRepairListScreen({ title, listType, staffId, segments, onAddPress, addLabel, detailPathname, workCategory, emptyMessage, emptyPreset }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { roleSwitcher, currentRole } = useNoticeRepairRole();
  const { height } = useWindowDimensions();
  const pageSize = getPageSize(height);

  const [activeSegment, setActiveSegment] = useState(0);
  const currentListType = segments ? segments[activeSegment].listType : (listType ?? '');
  const currentWorkCategory = segments ? segments[activeSegment].workCategory : workCategory;
  // The segment's own wording wins; the screen-level one is the fallback for
  // single-list mode and for segments that have not been given their own.
  const currentEmptyMessage =
    (segments ? segments[activeSegment].emptyMessage : emptyMessage) ??
    emptyMessage ??
    TEXT.NOTICE_REPAIR_NO_ITEMS;
  const currentEmptyPreset =
    (segments ? segments[activeSegment].emptyPreset : emptyPreset) ?? emptyPreset ?? 'notice';

  // `jobs` is everything fetched so far; `visibleCount` is how much of it the
  // list actually renders. Most upstream endpoints hand back the whole list in
  // one response, so scrolling reveals more of what we already hold; the few
  // that page server-side fall through to a follow-up fetch (see onEndReached).
  const [jobs, setJobs] = useState<NoticeRepairJob[]>([]);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreOnServer, setHasMoreOnServer] = useState(true);
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
      setVisibleCount((prev) => (start === 0 ? pageSize : prev + pageSize));
      // A short page, or reaching the reported total, means the server is done.
      setHasMoreOnServer(
        result.data.length >= pageSize && start + result.data.length < (result.totalCount || Infinity),
      );
    } catch (e) {
      if (start === 0) {
        setJobs([]);
        setError(e instanceof Error ? e.message : TEXT.NOTICE_REPAIR_ERROR_LOAD);
        setHasMoreOnServer(false);
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
    setVisibleCount(pageSize);
    setActiveSegment(index);
  }, [activeSegment, pageSize]);

  const refresh = useCallback(() => {
    loadedRef.current = new Set();
    load(0, true);
  }, [load]);

  useFocusEffect(useCallback(() => {
    loadedRef.current = new Set();
    load(0);
  }, [load]));

  const visibleJobs = useMemo(() => jobs.slice(0, visibleCount), [jobs, visibleCount]);
  // More to show if we're still holding unrendered rows, or the server has more.
  const hasMore = visibleCount < jobs.length || hasMoreOnServer;

  const onEndReached = useCallback(() => {
    if (isLoading || isRefreshing || isLoadingMore) return;
    // Reveal the next slice of what we already have before asking for more.
    if (visibleCount < jobs.length) {
      setVisibleCount((prev) => Math.min(prev + pageSize, jobs.length));
      return;
    }
    if (hasMoreOnServer) load(jobs.length);
  }, [isLoading, isRefreshing, isLoadingMore, visibleCount, jobs.length, hasMoreOnServer, pageSize, load]);

  const isEmpty = visibleJobs.length === 0;

  // Dashed "add" row pinned above the list, matching the repair-computer module.
  // Only while there are rows: with none, the same action is drawn as a plain
  // button under the empty state's message, where the reader is already looking.
  const addButton = onAddPress && !isEmpty ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={addLabel}
      onPress={onAddPress}
      style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}>
      <IconSymbol name="plus" size={20} color={c.primary} />
      <ThemedText style={styles.addButtonText}>{addLabel}</ThemedText>
    </Pressable>
  ) : null;

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
        backHref="/"
        rightContent={roleSwitcher}
        showHomeButton={false}
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


      {isLoading ? (
        <LoadingAnimate title={title} desc={TEXT.NOTICE_REPAIR_LOADING} />
      ) : error ? (
        <View style={styles.center}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : (
        <FlatList
          data={visibleJobs}
          keyExtractor={(item, i) => `${item.repair_id}-${i}`}
          renderItem={({ item }) => <NoticeRepairJobCard job={item} onPress={openDetail} />}
          contentContainerStyle={isEmpty ? styles.emptyContainer : styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={addButton}
          ListEmptyComponent={
            <EmptyState
              preset={currentEmptyPreset}
              message={currentEmptyMessage}
              action={
                onAddPress && addLabel ? (
                  <Button title={addLabel} icon="plus" onPress={onAddPress} />
                ) : null
              }
            />
          }
          ListFooterComponent={
            isLoadingMore || hasMore ? <ActivityIndicator style={styles.footer} /> : null
          }
        />
      )}
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  topTabBar: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    // Hairline on top so the tab bar reads as its own strip, split from the nav bar above.
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: c.primary,
    backgroundColor: c.primarySoft,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  addButtonPressed: { opacity: 0.7 },
  addButtonText: {
    color: c.primary,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: AppFonts.psuBold,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 15, color: c.textFaint, textAlign: 'center' },
  errorText: { fontSize: 15, color: c.danger, textAlign: 'center' },
  footer: { paddingVertical: 16 },
});
