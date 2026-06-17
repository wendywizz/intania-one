import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

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
  TYPE_absence_RELAX,
  TYPE_absence_SICK,
} from '@/constants/types';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import type { absence } from '@/models/types';
import { waitingData } from '@/services/absenceService';
import { navPush } from '@/utils/navigation';
import { formatDateRange } from '@/utils/date-format';

const absenceTypeLabels: Record<string, string> = {
  [TYPE_absence_SICK]: TEXT.absence_SICK_TITLE,
  [TYPE_absence_BUSINESS]: TEXT.absence_BUSINESS_TITLE,
  [TYPE_absence_BIRTH]: TEXT.absence_BIRTH_TITLE,
  [TYPE_absence_RELAX]: TEXT.absence_RELAX_TITLE,
  [TYPE_absence_HAJJ]: TEXT.absence_HAJJ_TITLE,
};

const absenceTypeFields = ['absenceType', 'absence_type', 'typeabsence', 'type_absence', 'leaveType', 'leave_type', 'type'];
const absenceTypeNameFields = ['absenceTypeName', 'absence_type_name', 'typeName', 'type_name', 'leaveTypeName', 'leave_type_name'];
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

function getDateRange(item: absence) {
  const startDate = getText(item, startDateFields);
  const endDate = getText(item, endDateFields);
  const formatted = formatDateRange(startDate, endDate);
  return formatted ? `Date: ${formatted}` : '';
}

function getEditPathname(type: string) {
  switch (type) {
    case TYPE_absence_SICK: return '/absence/sick';
    case TYPE_absence_BUSINESS: return '/absence/business';
    case TYPE_absence_RELAX: return '/absence/relax';
    case TYPE_absence_BIRTH: return '/absence/birth';
    default: return '/absence/detail';
  }
}

type IconName = 'cross.fill' | 'briefcase.fill' | 'sun.max.fill' | 'figure.child' | 'doc.text.fill';

function getTypeIcon(type: string): IconName {
  switch (type) {
    case TYPE_absence_SICK: return 'cross.fill';
    case TYPE_absence_BUSINESS: return 'briefcase.fill';
    case TYPE_absence_RELAX: return 'sun.max.fill';
    case TYPE_absence_BIRTH: return 'figure.child';
    default: return 'doc.text.fill';
  }
}

type PendingItemProps = {
  item: absence;
  approvalStep: string;
  onPress: (item: absence) => void;
};

function PendingItem({ item, approvalStep, onPress }: PendingItemProps) {
  const type = getAbsenceType(item);
  const typeLabel = getAbsenceTypeLabel(item);
  const dateRange = getDateRange(item);
  const icon = getTypeIcon(type);

  return (
    <Pressable accessibilityRole="button" onPress={() => onPress(item)} style={styles.itemCard}>
      <View style={styles.itemRow}>
        <View style={styles.itemIconCircle}>
          <IconSymbol name={icon} size={20} color="#922124" />
        </View>
        <View style={styles.itemBody}>
          <ThemedText style={styles.itemTitle}>{typeLabel}</ThemedText>
          {dateRange ? (
            <ThemedText style={styles.itemDate}>{dateRange}</ThemedText>
          ) : null}
          <ThemedText style={styles.itemStep}>{approvalStep}</ThemedText>
        </View>
        <View style={styles.pendingBadge}>
          <ThemedText style={styles.pendingBadgeText}>{TEXT.absence_PENDING_BADGE}</ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

export default function PendingScreen() {
  const { user: authUser } = useAuth();
  const [items, setItems] = useState<{ remain: absence | null; cancel: absence | null }>({
    remain: null,
    cancel: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const userId = authUser?.staffId || USER_ID;

  const loadData = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setError('');
      try {
        const result = await waitingData(userId);
        setItems({ remain: result.remainResult, cancel: result.cancelResult });
      } catch (err) {
        setItems({ remain: null, cancel: null });
        setError(err instanceof Error ? err.message : TEXT.SHARED_UNABLE_TO_LOAD_HISTORY);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [userId],
  );

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const openDetail = useCallback((item: absence) => {
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

  const renderContent = () => {
    if (isLoading) {
      return <LoadingAnimate title={TEXT.SHARED_LOADING_HISTORY} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />;
    }

    if (error) {
      return (
        <View style={styles.stateBox}>
          <ThemedText style={styles.stateTitle}>{TEXT.SHARED_SOMETHING_WENT_WRONG}</ThemedText>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable accessibilityRole="button" onPress={() => loadData()} style={styles.retryButton}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              {TEXT.SHARED_RETRY}
            </ThemedText>
          </Pressable>
        </View>
      );
    }

    const hasItems = items.remain || items.cancel;
    if (!hasItems) {
      return (
        <View style={styles.emptyBox}>
          <ThemedText style={styles.emptyText}>{TEXT.SHARED_NO_HISTORY}</ThemedText>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} />}
      >
        {items.remain ? (
          <PendingItem
            item={items.remain}
            approvalStep={TEXT.absence_PENDING_STEP_DEPT_HEAD}
            onPress={openDetail}
          />
        ) : null}
        {items.cancel ? (
          <PendingItem
            item={items.cancel}
            approvalStep={TEXT.absence_PENDING_STEP_HR}
            onPress={openDetail}
          />
        ) : null}
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.absence_TITLE} />
      <View style={styles.headerSection}>
        <ThemedText style={styles.pageTitle}>{TEXT.absence_PENDING_TITLE}</ThemedText>
        <ThemedText style={styles.pageSubtitle}>{TEXT.absence_PENDING_SUBTITLE}</ThemedText>
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
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
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
    color: '#585E6D',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    gap: 12,
    padding: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DFBFBD',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(179, 57, 57, 0.1)',
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
    color: '#191C1F',
  },
  itemDate: {
    fontSize: 12,
    lineHeight: 16,
    color: '#585E6D',
  },
  itemStep: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: '#585E6D',
  },
  pendingBadge: {
    backgroundColor: '#E1E2E6',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pendingBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
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
});
