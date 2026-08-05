import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Inbox } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { type AppColors, useColors, useScreenGutter, useThemedStyles } from '@/constants/theme';

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
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
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
  const c = useColors();
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
        ListEmptyComponent={renderEmpty(isPending ? TEXT.SHARED_NO_ITEMS : TEXT.SHARED_NO_HISTORY)}
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
  container: { flex: 1, backgroundColor: c.background },
  content: { flex: 1 },
  topTabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
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
    paddingTop: 14,
    gap: 8,
  },
  topTabText: { fontSize: 14, fontWeight: '600', color: c.textFaint },
  topTabTextActive: { color: c.primary },
  topTabIndicator: { height: 3, width: 40, borderRadius: 2, backgroundColor: 'transparent' },
  topTabIndicatorActive: { backgroundColor: c.primary },
  list: { flex: 1 },
  listContent: { paddingTop: 24, paddingBottom: 20 },
  listEmptyContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  emptyText: { fontSize: 14, lineHeight: 20, color: c.textMuted, textAlign: 'center' },
});
