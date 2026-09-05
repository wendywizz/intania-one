import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { type AppColors, useScreenGutter, useThemedStyles } from '@/constants/theme';

import {
  AbsenceListItem,
  PENDING_BADGE,
  getAbsenceId,
  getAbsenceType,
  getStatusBadge,
} from '@/components/absence/absence-list-item';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { TopTabs } from '@/components/ui';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';
import {
  TYPE_ABSENCE_BIRTH,
  TYPE_ABSENCE_BUSINESS,
  TYPE_ABSENCE_RELAX,
  TYPE_ABSENCE_SICK,
} from '@/constants/types';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import type { absence } from '@/models/types';
import { historyData, waitingData } from '@/services/absenceService';
import { navPush } from '@/utils/navigation';

type MyLeaveTab = 'pending' | 'history';

function getEditPathname(type: string) {
  switch (type) {
    case TYPE_ABSENCE_SICK: return '/absence/sick';
    case TYPE_ABSENCE_BUSINESS: return '/absence/business';
    case TYPE_ABSENCE_RELAX: return '/absence/relax';
    case TYPE_ABSENCE_BIRTH: return '/absence/birth';
    default: return '/absence/detail';
  }
}

export default function MyLeaveScreen() {

  const styles = useThemedStyles(makeStyles);
  const gutter = useScreenGutter();
  const { user: authUser } = useAuth();
  const userId = authUser?.staffId || USER_ID;
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab = (Array.isArray(params.tab) ? params.tab[0] : params.tab) === 'history' ? 'history' : 'pending';

  const [activeTab, setActiveTab] = useState<MyLeaveTab>(initialTab);

  useEffect(() => {
    if (params.tab === 'history') setActiveTab('history');
    else if (params.tab === 'pending') setActiveTab('pending');
  }, [params.tab]);
  const [pending, setPending] = useState<{ remain: absence | null; cancel: absence | null }>({
    remain: null,
    cancel: null,
  });
  const [history, setHistory] = useState<absence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setError('');

      const [pendingResult, historyResult] = await Promise.allSettled([
        waitingData(userId),
        historyData(userId, { length: 50, start: 0 }),
      ]);

      if (pendingResult.status === 'fulfilled') {
        setPending({ remain: pendingResult.value.remainResult, cancel: pendingResult.value.cancelResult });
      } else {
        setPending({ remain: null, cancel: null });
      }

      if (historyResult.status === 'fulfilled') {
        setHistory(historyResult.value.data);
      } else {
        setHistory([]);
      }

      if (pendingResult.status === 'rejected' && historyResult.status === 'rejected') {
        setError(
          pendingResult.reason instanceof Error
            ? pendingResult.reason.message
            : TEXT.SHARED_UNABLE_TO_LOAD_HISTORY,
        );
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [userId],
  );

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const openEdit = useCallback((item: absence) => {
    const type = getAbsenceType(item);
    navPush({
      pathname: getEditPathname(type),
      params: {
        id: getAbsenceId(item),
        type,
        mode: 'edit',
        source: 'waiting',
        item: encodeURIComponent(JSON.stringify(item)),
      },
    } as Parameters<typeof navPush>[0]);
  }, []);

  const openView = useCallback((item: absence) => {
    navPush({
      pathname: '/absence/detail',
      params: {
        id: getAbsenceId(item),
        type: getAbsenceType(item),
        item: encodeURIComponent(JSON.stringify(item)),
        backHref: '/absence/my-leave?tab=history',
      },
    } as Parameters<typeof navPush>[0]);
  }, []);

  const pendingItems = [pending.remain, pending.cancel].filter(Boolean) as absence[];

  const renderContent = () => {
    // Only while there is nothing to show; see components/timestamp/timestamp-forgot-list.
    if (isLoading && !pending.remain && !pending.cancel && history.length === 0) {
      return <LoadingAnimate title={TEXT.SHARED_LOADING_HISTORY} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />;
    }
    if (error) {
      return <ErrorState title={TEXT.SHARED_SOMETHING_WENT_WRONG} message={error} onRetry={() => loadData()} />;
    }

    const data = activeTab === 'pending' ? pendingItems : history;
    const isPending = activeTab === 'pending';

    return (
      <FlatList
        style={styles.list}
        contentContainerStyle={[data.length ? styles.listContent : styles.listEmptyContent, { paddingHorizontal: gutter }]}
        data={data}
        keyExtractor={(item, index) => `${getAbsenceId(item) || 'leave'}-${index}`}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} />}
        renderItem={({ item }) => (
          <AbsenceListItem
            item={item}
            badge={isPending ? PENDING_BADGE : getStatusBadge(item)}
            onPress={isPending ? openEdit : openView}
          />
        )}
        ListEmptyComponent={
          isPending ? (
            // Nothing of this person's is waiting on anyone — same picture and
            // wording as the general user's "mine" tab (pending.tsx), which
            // shows the identical list under a different role's tab bar.
            <EmptyState preset="pending" message={TEXT.ABSENCE_MINE_EMPTY} />
          ) : (
            <EmptyState preset="history" message={TEXT.ABSENCE_HISTORY_EMPTY} />
          )
        }
      />
    );
  };

  const tabs: { key: MyLeaveTab; label: string }[] = [
    { key: 'pending', label: TEXT.ABSENCE_MY_LEAVE_PENDING_TAB },
    { key: 'history', label: TEXT.ABSENCE_MY_LEAVE_HISTORY_TAB },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={TEXT.ABSENCE_MY_LEAVE_TAB} backHref="/" titleInNavBar showHomeButton={false} />

      <TopTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

      <View style={styles.content}>{renderContent()}</View>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  content: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingTop: 24, paddingBottom: 20 },
  listEmptyContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  emptyText: { fontSize: 14, lineHeight: 20, color: c.textMuted, textAlign: 'center' },
});
