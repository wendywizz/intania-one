import { useFocusEffect } from 'expo-router';
import { navPush } from '@/utils/navigation';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TEXT } from '@/constants/text';
import {
  TYPE_absence_BIRTH,
  TYPE_absence_BUSINESS,
  TYPE_absence_HAJJ,
  TYPE_absence_HELPMATE,
  TYPE_absence_RELAX,
  TYPE_absence_SICK,
} from '@/constants/types';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import type { absence } from '@/models/types';
import { historyData } from '@/services/absenceService';
import { formatDateRange } from '@/utils/date-format';

const HISTORY_PAGE_LENGTH = 10;

function getHasMore(currentCount: number, pageSize: number, totalCount?: number) {
  if (typeof totalCount === 'number') {
    return currentCount < totalCount;
  }
  return currentCount >= pageSize;
}

const absenceTypeLabels: Record<string, string> = {
  [TYPE_absence_SICK]: TEXT.absence_SICK_TITLE,
  [TYPE_absence_BUSINESS]: TEXT.absence_BUSINESS_TITLE,
  [TYPE_absence_BIRTH]: TEXT.absence_BIRTH_TITLE,
  [TYPE_absence_HELPMATE]: TEXT.absence_BIRTH_TITLE,
  [TYPE_absence_RELAX]: TEXT.absence_RELAX_TITLE,
  [TYPE_absence_HAJJ]: TEXT.absence_HAJJ_TITLE,
};

const absenceTypeFields = ['absentType', 'absenceType', 'absence_type', 'typeabsence', 'type_absence', 'leaveType', 'leave_type', 'type'];
const absenceTypeNameFields = ['absentTypeName', 'absenceTypeName', 'absence_type_name', 'typeName', 'type_name', 'leaveTypeName', 'leave_type_name'];
const startDateFields = ['startDate', 'start_date', 'dateStart', 'date_start'];
const endDateFields = ['endDate', 'end_date', 'dateEnd', 'date_end'];

function getText(item: absence, fields: string[]) {
  for (const field of fields) {
    const value = item[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function getAbsenceId(item: absence) {
  return getText(item, ['id', 'absenceId', 'absence_id', 'requestId', 'request_id']);
}

function getAbsenceType(item: absence) {
  return getText(item, absenceTypeFields);
}

function getAbsenceTypeLabel(item: absence) {
  const typeName = getText(item, absenceTypeNameFields);
  const type = getAbsenceType(item);
  return typeName || absenceTypeLabels[type] || (type ? `Absence type ${type}` : 'Absence');
}

function getAbsenceKey(item: absence, index: number) {
  return `${getAbsenceId(item) || getAbsenceType(item) || 'absence'}-${index}`;
}

function getDateRange(item: absence) {
  const startDate = getText(item, startDateFields);
  const endDate = getText(item, endDateFields);
  const formatted = formatDateRange(startDate, endDate);
  return formatted ? `${TEXT.absence_HISTORY_DATE_PREFIX}${formatted}` : '';
}

function getAbsenceTimestamp(item: absence) {
  const ts = Date.parse(getText(item, startDateFields));
  return Number.isNaN(ts) ? 0 : ts;
}

function sortAbsenceHistory(items: absence[]) {
  return [...items].sort((a, b) => getAbsenceTimestamp(b) - getAbsenceTimestamp(a));
}

type IconName = 'cross.fill' | 'briefcase.fill' | 'sun.max.fill' | 'figure.child' | 'doc.text.fill';

type IconStyle = { iconBg: string; iconColor: string; icon: IconName };

const TYPE_ICON_STYLES: Record<string, IconStyle> = {
  [TYPE_absence_SICK]: { iconBg: '#FFDAD7', iconColor: '#410005', icon: 'cross.fill' },
  [TYPE_absence_BUSINESS]: { iconBg: '#DDE2F3', iconColor: '#161C28', icon: 'briefcase.fill' },
  [TYPE_absence_RELAX]: { iconBg: '#DAE3F4', iconColor: '#131C28', icon: 'sun.max.fill' },
  [TYPE_absence_BIRTH]: { iconBg: '#FFDAD7', iconColor: '#410005', icon: 'figure.child' },
  [TYPE_absence_HELPMATE]: { iconBg: '#FFDAD7', iconColor: '#410005', icon: 'figure.child' },
};

const DEFAULT_ICON_STYLE: IconStyle = { iconBg: '#F2F3F7', iconColor: '#444D5B', icon: 'doc.text.fill' };

function getIconStyle(type: string): IconStyle {
  return TYPE_ICON_STYLES[type] ?? DEFAULT_ICON_STYLE;
}

type HistoryListItemProps = {
  item: absence;
  onPress: (item: absence) => void;
};

function HistoryListItem({ item, onPress }: HistoryListItemProps) {
  const type = getAbsenceType(item);
  const typeLabel = getAbsenceTypeLabel(item);
  const dateRange = getDateRange(item);
  const { iconBg, iconColor, icon } = getIconStyle(type);

  return (
    <Pressable accessibilityRole="button" onPress={() => onPress(item)} style={styles.itemCard}>
      <View style={[styles.itemIconCircle, { backgroundColor: iconBg }]}>
        <IconSymbol name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.itemBody}>
        <ThemedText style={styles.itemTitle}>{typeLabel}</ThemedText>
        {dateRange ? <ThemedText style={styles.itemDate}>{dateRange}</ThemedText> : null}
      </View>
      <IconSymbol name="chevron.right" size={16} color="#585E6D" style={{ opacity: 0.4 }} />
    </Pressable>
  );
}

export default function HistoryScreen() {
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
        <View style={styles.stateBox}>
          <ThemedText style={styles.stateTitle}>{TEXT.SHARED_SOMETHING_WENT_WRONG}</ThemedText>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => loadFirstPage(false, true)}
            style={styles.retryButton}
          >
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              {TEXT.SHARED_RETRY}
            </ThemedText>
          </Pressable>
        </View>
      );
    }

    return (
      <FlatList
        style={styles.flatList}
        contentContainerStyle={styles.listContent}
        data={items}
        keyExtractor={getAbsenceKey}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadFirstPage(true, true)} />
        }
        onEndReached={loadMoreItems}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => <HistoryListItem item={item} onPress={openDetail} />}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color="#922124" size="small" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <ThemedText style={styles.emptyText}>{TEXT.SHARED_NO_HISTORY}</ThemedText>
          </View>
        }
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.absence_TITLE} />
      <View style={styles.pageTitleSection}>
        <ThemedText style={styles.pageTitle}>{TEXT.absence_HISTORY_TITLE}</ThemedText>
        <ThemedText style={styles.pageSubtitle}>{TEXT.absence_HISTORY_SUBTITLE}</ThemedText>
      </View>
      <View style={styles.content}>{renderContent()}</View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
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
    color: '#191C1F',
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#584140',
  },
  content: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  listContent: {
    gap: 12,
    padding: 16,
    paddingTop: 8,
    paddingBottom: 96,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F2F3F7',
    borderRadius: 12,
    padding: 16,
  },
  itemIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemBody: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: '#191C1F',
  },
  itemDate: {
    fontSize: 13,
    lineHeight: 18,
    color: '#584140',
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
    color: '#191C1F',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#B42318',
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 48,
    minWidth: 132,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#B33939',
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
    color: '#585E6D',
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
