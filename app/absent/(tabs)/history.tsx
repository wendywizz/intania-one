import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';
import {
  TYPE_ABSENT_BIRTH,
  TYPE_ABSENT_BUSINESS,
  TYPE_ABSENT_HAJJ,
  TYPE_ABSENT_RELAX,
  TYPE_ABSENT_SICK,
} from '@/constants/type-absent';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import type { Absent } from '@/models/types';
import { historyData } from '@/services/absentService';
import { formatDateTime } from '@/utils/date-format';

const HISTORY_PAGE_LENGTH = 50;
const absentTypeLabels: Record<string, string> = {
  [TYPE_ABSENT_SICK]: TEXT.ABSENT_SICK_TITLE,
  [TYPE_ABSENT_BUSINESS]: TEXT.ABSENT_BUSINESS_TITLE,
  [TYPE_ABSENT_BIRTH]: TEXT.ABSENT_BIRTH_TITLE,
  [TYPE_ABSENT_RELAX]: TEXT.ABSENT_RELAX_TITLE,
  [TYPE_ABSENT_HAJJ]: 'Hajj leave',
};

const absentTypeFields = [
  'absentType',
  'absent_type',
  'typeAbsent',
  'type_absent',
  'leaveType',
  'leave_type',
  'type',
];
const absentTypeNameFields = [
  'absentTypeName',
  'absent_type_name',
  'typeName',
  'type_name',
  'leaveTypeName',
  'leave_type_name',
];
const startDateFields = ['startDate', 'start_date', 'dateStart', 'date_start'];
const endDateFields = ['endDate', 'end_date', 'dateEnd', 'date_end'];
const statusFields = [
  'progressTypeName',
  'progress_type_name',
  'statusName',
  'status_name',
  'statusLabel',
  'status_label',
  'status',
];

function getText(item: Absent, fields: string[]) {
  for (const field of fields) {
    const value = item[field];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number') {
      return String(value);
    }
  }

  return '';
}

function getAbsentId(item: Absent) {
  return getText(item, ['id', 'absentId', 'absent_id', 'requestId', 'request_id']);
}

function getAbsentType(item: Absent) {
  return getText(item, absentTypeFields);
}

function getAbsentTypeLabel(item: Absent) {
  const typeName = getText(item, absentTypeNameFields);
  const type = getAbsentType(item);

  return typeName || absentTypeLabels[type] || (type ? `Absent type ${type}` : 'Absent');
}

function getAbsentKey(item: Absent, index: number) {
  return `${getAbsentId(item) || getAbsentType(item) || 'absent'}-${index}`;
}

function getDateRange(item: Absent) {
  const startDate = getText(item, startDateFields);
  const endDate = getText(item, endDateFields);
  const formattedStartDate = startDate ? formatDateTime(startDate) : '';
  const formattedEndDate = endDate ? formatDateTime(endDate) : '';

  if (formattedStartDate && formattedEndDate) {
    return `${formattedStartDate} - ${formattedEndDate}`;
  }

  return formattedStartDate || formattedEndDate;
}

function getAbsentTimestamp(item: Absent) {
  const timestamp = Date.parse(getText(item, startDateFields));
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortAbsentHistory(items: Absent[]) {
  return [...items].sort((leftItem, rightItem) => getAbsentTimestamp(rightItem) - getAbsentTimestamp(leftItem));
}

type AbsentHistoryListItemProps = {
  item: Absent;
  onPress: (item: Absent) => void;
};

function AbsentHistoryListItem({ item, onPress }: AbsentHistoryListItemProps) {
  const type = getAbsentTypeLabel(item);
  const dateRange = getDateRange(item);
  const reason = getText(item, ['reason', 'travelDetail', 'travel_detail', 'detail', 'description', 'remark']);
  const status = getText(item, statusFields);

  return (
    <Pressable accessibilityRole="button" onPress={() => onPress(item)}>
      <ThemedView style={styles.itemCard} lightColor="#FFFFFF" darkColor="#151718">
        <View style={styles.itemHeader}>
          <ThemedText type="defaultSemiBold" style={styles.itemTitle}>
            {type}
          </ThemedText>
          {status ? <ThemedText style={styles.statusText}>{status}</ThemedText> : null}
        </View>

        {dateRange ? <ThemedText style={styles.itemMeta}>{dateRange}</ThemedText> : null}
        {reason ? <ThemedText style={styles.itemDetail}>{reason}</ThemedText> : null}
      </ThemedView>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const { user: authUser } = useAuth();
  const [items, setItems] = useState<Absent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const userId = authUser?.staffId || USER_ID;

  const loadHistory = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError('');

    const result = await historyData(userId, { length: HISTORY_PAGE_LENGTH, start: 0 });

    if (result.processType === 'error') {
      setItems([]);
      setError(result.message || TEXT.SHARED_UNABLE_TO_LOAD_HISTORY);
    } else {
      setItems(sortAbsentHistory(Array.isArray(result.data) ? result.data : []));
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  const openDetail = useCallback((item: Absent) => {
    router.push({
      pathname: '/absent/detail',
      params: {
        id: getAbsentId(item),
        type: getAbsentType(item),
        item: encodeURIComponent(JSON.stringify(item)),
      },
    } as Parameters<typeof router.push>[0]);
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return <LoadingAnimate title={TEXT.SHARED_LOADING_HISTORY} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />;
    }

    if (error) {
      return (
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">{TEXT.SHARED_SOMETHING_WENT_WRONG}</ThemedText>
          <ThemedText style={[styles.stateMessage, styles.errorText]}>{error}</ThemedText>
          <Pressable accessibilityRole="button" onPress={() => loadHistory()} style={styles.retryButton}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              {TEXT.SHARED_RETRY}</ThemedText>
          </Pressable>
        </View>
      );
    }

    return (
      <FlatList
        contentContainerStyle={styles.listContent}
        data={items}
        keyExtractor={getAbsentKey}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadHistory(true)} />}
        renderItem={({ item }) => <AbsentHistoryListItem item={item} onPress={openDetail} />}
        ListEmptyComponent={
          <ThemedView style={styles.emptyCard} lightColor="#FFFFFF" darkColor="#151718">
            <ThemedText style={styles.emptyMessage}>{TEXT.SHARED_NO_HISTORY}</ThemedText>
          </ThemedView>
        }
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.ABSENT_TITLE} />

      <View style={styles.content}>
        <ThemedView style={styles.panel} lightColor="#FFFFFF" darkColor="#1F2B30">
          <ThemedText type="subtitle">{TEXT.ABSENT_HISTORY_TITLE}</ThemedText>
          {renderContent()}
        </ThemedView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  panel: {
    flex: 1,
    borderRadius: 8,
    padding: 0,
  },
  listContent: {
    gap: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  itemCard: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  statusText: {
    color: '#0A6E8A',
    fontSize: 12,
    lineHeight: 18,
  },
  itemMeta: {
    color: '#687076',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  itemDetail: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  stateContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  stateMessage: {
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  errorText: {
    color: '#B42318',
  },
  retryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0A6E8A',
    marginTop: 24,
  },
  emptyCard: {
    minHeight: 120,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
    padding: 16,
  },
  emptyMessage: {
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
