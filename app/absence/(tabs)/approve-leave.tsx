import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Inbox } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import {
  getAbsenceId,
  getAbsenceType,
  getRequesterName,
  LeaveCard,
  PENDING_BADGE,
  statusBadge,
} from '@/components/absence/leave-card';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import type { absence } from '@/models/types';
import { approvingHistoryData, approvingWaitingData } from '@/services/absenceService';
import { navPush } from '@/utils/navigation';

type ApproveTab = 'pending' | 'history';

// Approval history is paginated 10 at a time (infinite scroll).
const PAGE_SIZE = 10;

function getText(item: absence, fields: string[]) {
  for (const field of fields) {
    const value = item[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

export default function ApproveLeaveScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user: authUser } = useAuth();
  const userId = authUser?.staffId || USER_ID;
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab = (Array.isArray(params.tab) ? params.tab[0] : params.tab) === 'history' ? 'history' : 'pending';

  const [activeTab, setActiveTab] = useState<ApproveTab>(initialTab);

  useEffect(() => {
    if (params.tab === 'history') setActiveTab('history');
    else if (params.tab === 'pending') setActiveTab('pending');
  }, [params.tab]);
  const [queue, setQueue] = useState<absence[]>([]);
  const [history, setHistory] = useState<absence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const loadingMoreRef = useRef(false);

  const loadData = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setError('');

      const [queueResult, historyResult] = await Promise.allSettled([
        approvingWaitingData(userId),
        approvingHistoryData(userId, { start: 0, length: PAGE_SIZE }),
      ]);

      if (queueResult.status === 'fulfilled') setQueue(queueResult.value.data);
      else setQueue([]);

      if (historyResult.status === 'fulfilled') {
        const firstPage = historyResult.value.data;
        setHistory(firstPage);
        setHasMore(firstPage.length >= PAGE_SIZE);
      } else {
        setHistory([]);
        setHasMore(false);
      }

      if (queueResult.status === 'rejected' && historyResult.status === 'rejected') {
        setError(
          queueResult.reason instanceof Error
            ? queueResult.reason.message
            : TEXT.SHARED_UNABLE_TO_LOAD_HISTORY,
        );
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [userId],
  );

  const loadMoreHistory = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || isLoading || isRefreshing) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const result = await approvingHistoryData(userId, {
        start: history.length,
        length: PAGE_SIZE,
      });
      const next = result.data;
      setHistory((prev) => [...prev, ...next]);
      setHasMore(next.length >= PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoading, isRefreshing, history.length, userId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const openApproval = useCallback((item: absence) => {
    navPush({
      pathname: '/absence/approve-detail',
      params: { item: encodeURIComponent(JSON.stringify(item)) },
    } as Parameters<typeof navPush>[0]);
  }, []);

  const openView = useCallback((item: absence) => {
    navPush({
      pathname: '/absence/detail',
      params: {
        id: getAbsenceId(item),
        type: getAbsenceType(item),
        item: encodeURIComponent(JSON.stringify(item)),
        backHref: '/absence/approve-leave?tab=history',
      },
    } as Parameters<typeof navPush>[0]);
  }, []);

  const renderEmpty = (text: string) => (
    <EmptyState icon={Inbox} message={text} />
  );

  const renderContent = () => {
    if (isLoading) {
      return <LoadingAnimate title={TEXT.SHARED_LOADING_HISTORY} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />;
    }
    if (error) {
      return <ErrorState title={TEXT.SHARED_SOMETHING_WENT_WRONG} message={error} onRetry={() => loadData()} />;
    }

    const isPending = activeTab === 'pending';
    const data = isPending ? queue : history;

    return (
      <FlatList
        style={styles.list}
        contentContainerStyle={data.length ? styles.listContent : styles.listEmptyContent}
        data={data}
        keyExtractor={(item, index) => `${getAbsenceId(item) || 'approve'}-${index}`}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} />}
        renderItem={({ item }) => (
          <LeaveCard
            item={item}
            name={getRequesterName(item)}
            badge={isPending ? PENDING_BADGE : statusBadge(getText(item, ['status']))}
            onPress={isPending ? openApproval : openView}
          />
        )}
        onEndReached={isPending ? undefined : loadMoreHistory}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          !isPending && isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={c.primary} size="small" />
            </View>
          ) : null
        }
        ListEmptyComponent={renderEmpty(isPending ? TEXT.ABSENCE_APPROVE_EMPTY : TEXT.ABSENCE_APPROVE_HISTORY_EMPTY)}
      />
    );
  };

  const tabs: { key: ApproveTab; label: string }[] = [
    { key: 'pending', label: TEXT.ABSENCE_APPROVE_PENDING_TAB },
    { key: 'history', label: TEXT.ABSENCE_APPROVE_HISTORY_TAB },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={TEXT.ABSENCE_APPROVE_LEAVE_TAB} backHref="/" />

      <View style={styles.topTabBar}>
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={styles.topTab}
              onPress={() => setActiveTab(tab.key)}
            >
              <ThemedText style={[styles.topTabText, active && styles.topTabTextActive]}>
                {tab.label}
              </ThemedText>
              <View style={[styles.topTabIndicator, active && styles.topTabIndicatorActive]} />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.content}>{renderContent()}</View>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { flex: 1 },
  topTabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  topTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 14,
    gap: 8,
  },
  topTabText: { fontSize: 14, fontWeight: '600', color: c.textFaint },
  topTabTextActive: { color: c.primary },
  topTabIndicator: { height: 3, width: 40, borderRadius: 2, backgroundColor: 'transparent' },
  topTabIndicatorActive: { backgroundColor: c.primary },
  list: { flex: 1 },
  listContent: { gap: 12, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },
  listEmptyContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  emptyText: { fontSize: 14, lineHeight: 20, color: c.textMuted, textAlign: 'center' },
});
