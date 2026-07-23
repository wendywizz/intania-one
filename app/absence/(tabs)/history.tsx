import { useFocusEffect } from 'expo-router';
import { navPush } from '@/utils/navigation';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { type AppColors, useColors, useScreenGutter, useThemedStyles } from '@/constants/theme';

import {
  AbsenceListItem,
  getAbsenceId,
  getAbsenceType,
  getStatusBadge,
} from '@/components/absence/absence-list-item';
import { ErrorState } from '@/components/error-state';
import { Inbox } from 'lucide-react-native';
import { EmptyState } from '@/components/empty-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import type { absence } from '@/models/types';
import { historyData } from '@/services/absenceService';

const HISTORY_PAGE_LENGTH = 10;

function getHasMore(currentCount: number, pageSize: number, totalCount?: number) {
  if (typeof totalCount === 'number') {
    return currentCount < totalCount;
  }
  return currentCount >= pageSize;
}

const startDateFields = ['startDate', 'start_date', 'dateStart', 'date_start'];

function getStartDate(item: absence) {
  for (const field of startDateFields) {
    const value = item[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function getAbsenceKey(item: absence, index: number) {
  return `${getAbsenceId(item) || getAbsenceType(item) || 'absence'}-${index}`;
}

function getAbsenceTimestamp(item: absence) {
  const ts = Date.parse(getStartDate(item));
  return Number.isNaN(ts) ? 0 : ts;
}

function sortAbsenceHistory(items: absence[]) {
  return [...items].sort((a, b) => getAbsenceTimestamp(b) - getAbsenceTimestamp(a));
}

export default function HistoryScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const gutter = useScreenGutter();
  const { user: authUser } = useAuth();
  const pageSize = HISTORY_PAGE_LENGTH;
  const [items, setItems] = useState<absence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const userId = authUser?.staffId || USER_ID;
  const loadingStartRef = useRef<number | null>(null);
  const loadedStartRef = useRef<Set<number>>(new Set());
  const itemsRef = useRef<absence[]>([]);

  const loadFirstPage = useCallback(
    async (showRefreshing = false, forceReload = false) => {
      if (loadingStartRef.current === 0 || (!forceReload && loadedStartRef.current.has(0))) {
        return;
      }
      loadingStartRef.current = 0;
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setError('');
      try {
        const result = await historyData(userId, { length: pageSize, start: 0 });
        const nextItems = result.data;
        const sorted = sortAbsenceHistory(nextItems);
        loadedStartRef.current = new Set([0]);
        setItems(sorted);
        itemsRef.current = sorted;
        setHasMore(getHasMore(nextItems.length, pageSize, result.totalCount));
      } catch (err) {
        setItems([]);
        setError(err instanceof Error ? err.message : TEXT.SHARED_UNABLE_TO_LOAD_HISTORY);
        setHasMore(false);
      } finally {
        loadingStartRef.current = null;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [userId, pageSize],
  );

  const loadMoreItems = useCallback(async () => {
    if (isLoading || isRefreshing || isLoadingMore || !hasMore) return;
    const start = itemsRef.current.length;
    if (loadingStartRef.current === start || loadedStartRef.current.has(start)) return;
    loadingStartRef.current = start;
    setIsLoadingMore(true);
    try {
      const result = await historyData(userId, { length: pageSize, start });
      const nextItems = result.data;
      const updated = sortAbsenceHistory([...itemsRef.current, ...nextItems]);
      loadedStartRef.current.add(start);
      setItems(updated);
      itemsRef.current = updated;
      setHasMore(getHasMore(start + nextItems.length, pageSize, result.totalCount));
    } catch {
      setHasMore(false);
    } finally {
      loadingStartRef.current = null;
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoading, isLoadingMore, isRefreshing, userId, pageSize]);

  useFocusEffect(useCallback(() => { loadFirstPage(false, true); }, [loadFirstPage]));

  const openDetail = useCallback((item: absence) => {
    navPush({
      pathname: '/absence/detail',
      params: {
        id: getAbsenceId(item),
        type: getAbsenceType(item),
        item: encodeURIComponent(JSON.stringify(item)),
      },
    } as Parameters<typeof navPush>[0]);
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return <LoadingAnimate title={TEXT.SHARED_LOADING_HISTORY} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />;
    }

    if (error) {
      return (
        <ErrorState
          title={TEXT.SHARED_SOMETHING_WENT_WRONG}
          message={error}
          onRetry={() => loadFirstPage(false, true)}
        />
      );
    }

    return (
      <FlatList
        style={styles.flatList}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: gutter }]}
        data={items}
        keyExtractor={getAbsenceKey}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadFirstPage(true, true)} />
        }
        onEndReached={loadMoreItems}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => <AbsenceListItem item={item} badge={getStatusBadge(item)} onPress={openDetail} />}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={c.primary} size="small" />
            </View>
          ) : null
        }
        ListEmptyComponent={<EmptyState icon={Inbox} message={TEXT.SHARED_NO_HISTORY} />}
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={TEXT.ABSENCE_HISTORY_TITLE} backHref="/" titleInNavBar />
      <View style={styles.content}>{renderContent()}</View>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  pageTitleSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 4,
  },
  pageTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    color: c.text,
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textMuted,
  },
  content: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingTop: 24,
    paddingBottom: 96,
  },
  stateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: c.danger,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 48,
    minWidth: 132,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: c.primary,
    marginTop: 8,
    paddingHorizontal: 24,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textMuted,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
