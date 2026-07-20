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
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { ErrorState } from '@/components/error-state';
import { CalendarDays, Inbox } from 'lucide-react-native';
import { EmptyState } from '@/components/empty-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TEXT } from '@/constants/text';
import {
  TYPE_ABSENCE_BIRTH,
  TYPE_ABSENCE_BUSINESS,
  TYPE_ABSENCE_HAJJ,
  TYPE_ABSENCE_HELPMATE,
  TYPE_ABSENCE_RELAX,
  TYPE_ABSENCE_SICK,
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
  [TYPE_ABSENCE_SICK]: TEXT.ABSENCE_SICK_TITLE,
  [TYPE_ABSENCE_BUSINESS]: TEXT.ABSENCE_BUSINESS_TITLE,
  [TYPE_ABSENCE_BIRTH]: TEXT.ABSENCE_BIRTH_TITLE,
  [TYPE_ABSENCE_HELPMATE]: TEXT.ABSENCE_BIRTH_TITLE,
  [TYPE_ABSENCE_RELAX]: TEXT.ABSENCE_RELAX_TITLE,
  [TYPE_ABSENCE_HAJJ]: TEXT.ABSENCE_HAJJ_TITLE,
};

const absenceTypeFields = ['absentType', 'absenceType', 'ABSENCE_type', 'typeabsence', 'type_absence', 'leaveType', 'leave_type', 'type'];
const absenceTypeNameFields = ['absentTypeName', 'absenceTypeName', 'ABSENCE_type_name', 'typeName', 'type_name', 'leaveTypeName', 'leave_type_name'];
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
  return getText(item, ['id', 'absenceId', 'ABSENCE_id', 'requestId', 'request_id']);
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
  return formatted || '';
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
  [TYPE_ABSENCE_SICK]: { iconBg: '#FFDAD7', iconColor: '#410005', icon: 'cross.fill' },
  [TYPE_ABSENCE_BUSINESS]: { iconBg: '#DDE2F3', iconColor: '#161C28', icon: 'briefcase.fill' },
  [TYPE_ABSENCE_RELAX]: { iconBg: '#DAE3F4', iconColor: '#131C28', icon: 'sun.max.fill' },
  [TYPE_ABSENCE_BIRTH]: { iconBg: '#FFDAD7', iconColor: '#410005', icon: 'figure.child' },
  [TYPE_ABSENCE_HELPMATE]: { iconBg: '#FFDAD7', iconColor: '#410005', icon: 'figure.child' },
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
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const type = getAbsenceType(item);
  const typeLabel = getAbsenceTypeLabel(item);
  const dateRange = getDateRange(item);
  const { iconColor, icon } = getIconStyle(type);

  return (
    <Pressable accessibilityRole="button" onPress={() => onPress(item)} style={styles.itemCard}>
      <View style={styles.itemIconCircle}>
        <IconSymbol name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.itemBody}>
        <ThemedText style={styles.itemTitle}>{typeLabel}</ThemedText>
        {dateRange ? (
          <View style={styles.itemDateRow}>
            <CalendarDays size={13} color={c.textMuted} />
            <ThemedText style={styles.itemDate}>{dateRange}</ThemedText>
          </View>
        ) : null}
      </View>
      <IconSymbol name="chevron.right" size={16} color={c.textMuted} style={{ opacity: 0.4, alignSelf: 'center' }} />
    </Pressable>
  );
}

export default function HistoryScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
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
      <ScreenHeader title={TEXT.ABSENCE_HISTORY_TITLE} backHref="/" />
      <View style={styles.content}>{renderContent()}</View>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    padding: 16,
    paddingTop: 20,
    paddingBottom: 96,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 22,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  itemIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
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
    color: c.text,
  },
  itemDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  itemDate: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
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
