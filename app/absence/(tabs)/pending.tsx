import { useFocusEffect } from 'expo-router';
import { Inbox } from 'lucide-react-native';
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
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
  TYPE_ABSENCE_RELAX,
  TYPE_ABSENCE_SICK,
} from '@/constants/types';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import type { absence } from '@/models/types';
import { approvingWaitingData, waitingData } from '@/services/absenceService';
import { navPush } from '@/utils/navigation';
import { formatDateRange } from '@/utils/date-format';

const absenceTypeLabels: Record<string, string> = {
  [TYPE_ABSENCE_SICK]: TEXT.ABSENCE_SICK_TITLE,
  [TYPE_ABSENCE_BUSINESS]: TEXT.ABSENCE_BUSINESS_TITLE,
  [TYPE_ABSENCE_BIRTH]: TEXT.ABSENCE_BIRTH_TITLE,
  [TYPE_ABSENCE_RELAX]: TEXT.ABSENCE_RELAX_TITLE,
  [TYPE_ABSENCE_HAJJ]: TEXT.ABSENCE_HAJJ_TITLE,
};

const absenceTypeFields = ['absentType', 'absenceType', 'typeAbsence', 'ABSENCE_type', 'typeabsence', 'type_absence', 'leaveType', 'leave_type', 'type'];
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

function getDateRange(item: absence) {
  const startDate = getText(item, startDateFields);
  const endDate = getText(item, endDateFields);
  const formatted = formatDateRange(startDate, endDate);
  return formatted ? `Date: ${formatted}` : '';
}

function getEditPathname(type: string) {
  switch (type) {
    case TYPE_ABSENCE_SICK: return '/absence/sick';
    case TYPE_ABSENCE_BUSINESS: return '/absence/business';
    case TYPE_ABSENCE_RELAX: return '/absence/relax';
    case TYPE_ABSENCE_BIRTH: return '/absence/birth';
    default: return '/absence/detail';
  }
}

type IconName = 'cross.fill' | 'briefcase.fill' | 'sun.max.fill' | 'figure.child' | 'doc.text.fill';

function getTypeIcon(type: string): IconName {
  switch (type) {
    case TYPE_ABSENCE_SICK: return 'cross.fill';
    case TYPE_ABSENCE_BUSINESS: return 'briefcase.fill';
    case TYPE_ABSENCE_RELAX: return 'sun.max.fill';
    case TYPE_ABSENCE_BIRTH: return 'figure.child';
    default: return 'doc.text.fill';
  }
}

function getRequesterName(item: absence) {
  return getText(item, ['name', 'staffName', 'staff_name', 'fullname', 'fullName']);
}

type RequestCardProps = {
  item: absence;
  name: string;
  onPress?: (item: absence) => void;
};

// One card shape shared by both "รออนุมัติลา" and "อนุมัติผู้ยื่นลา" so their
// details render identically: name (bold), leave type, date range and badge.
function RequestCard({ item, name, onPress }: RequestCardProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const type = getAbsenceType(item);
  const typeLabel = getText(item, ['approveName']) || getAbsenceTypeLabel(item);
  const dateRange = getDateRange(item);
  const icon = getTypeIcon(type);

  const body = (
    <View style={styles.itemRow}>
      <View style={styles.itemIconCircle}>
        <IconSymbol name={icon} size={20} color={c.primary} />
      </View>
      <View style={styles.itemBody}>
        {name ? (
          <ThemedText style={styles.itemRequester} numberOfLines={1}>
            {name}
          </ThemedText>
        ) : null}
        <ThemedText style={styles.itemTitle}>{typeLabel}</ThemedText>
        {dateRange ? (
          <ThemedText style={styles.itemDate}>{dateRange}</ThemedText>
        ) : null}
      </View>
      <View style={styles.pendingBadge}>
        <ThemedText style={styles.pendingBadgeText}>{TEXT.ABSENCE_PENDING_BADGE}</ThemedText>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={() => onPress(item)} style={styles.itemCard}>
        {body}
      </Pressable>
    );
  }

  return <View style={styles.itemCard}>{body}</View>;
}

type PendingTab = 'approve' | 'mine';

export default function PendingScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user: authUser } = useAuth();
  const [items, setItems] = useState<{ remain: absence | null; cancel: absence | null }>({
    remain: null,
    cancel: null,
  });
  const [approving, setApproving] = useState<absence[]>([]);
  const [activeTab, setActiveTab] = useState<PendingTab>('approve');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const userId = authUser?.staffId || USER_ID;

  const loadData = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setError('');
      // The approval list (boss queue) is best-effort: its absence must not break
      // the user's own pending list.
      const [mineResult, approvingResult] = await Promise.allSettled([
        waitingData(userId),
        approvingWaitingData(userId),
      ]);

      if (mineResult.status === 'fulfilled') {
        setItems({ remain: mineResult.value.remainResult, cancel: mineResult.value.cancelResult });
      } else {
        setItems({ remain: null, cancel: null });
      }

      if (approvingResult.status === 'fulfilled') {
        setApproving(approvingResult.value.data);
      } else {
        setApproving([]);
      }

      // Only surface an error if the user's own pending list failed to load.
      if (mineResult.status === 'rejected') {
        setError(
          mineResult.reason instanceof Error
            ? mineResult.reason.message
            : TEXT.SHARED_UNABLE_TO_LOAD_HISTORY,
        );
      }

      setIsLoading(false);
      setIsRefreshing(false);
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

  // Approval-queue card → approval detail screen (with accept/reject).
  const openApproval = useCallback((item: absence) => {
    navPush({
      pathname: '/absence/approve-detail',
      params: { item: encodeURIComponent(JSON.stringify(item)) },
    } as Parameters<typeof navPush>[0]);
  }, []);

  const renderEmpty = () => (
    <EmptyState icon={Inbox} message={TEXT.SHARED_NO_ITEMS} />
  );

  // A scrollable list body that either lists the cards or, when empty, shows the
  // centered "ไม่มีรายการ" state. `topGap` adds room below the navbar when there
  // is no tab bar above the list (general-user view).
  const renderList = (hasItems: boolean, children: ReactNode, topGap = false) => (
    <ScrollView
      style={styles.sectionScroll}
      contentContainerStyle={
        hasItems
          ? [styles.sectionListContent, topGap ? styles.sectionListNoHeader : null]
          : styles.sectionEmptyContent
      }
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} />}
    >
      {hasItems ? children : renderEmpty()}
    </ScrollView>
  );

  const renderContent = () => {
    if (isLoading) {
      return <LoadingAnimate title={TEXT.SHARED_LOADING_HISTORY} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />;
    }

    if (error) {
      return (
        <ErrorState
          title={TEXT.SHARED_SOMETHING_WENT_WRONG}
          message={error}
          onRetry={() => loadData()}
        />
      );
    }

    const mineCount = (items.remain ? 1 : 0) + (items.cancel ? 1 : 0);
    // Having any approval item means this user is a boss → show both tabs.
    // Otherwise they are a general user → only their own "อนุมัติผู้ยื่นลา".
    const isBoss = approving.length > 0;
    const ownName = authUser?.name ?? '';

    const mineList = renderList(
      mineCount > 0,
      <>
        {items.remain ? (
          <RequestCard item={items.remain} name={ownName} onPress={openDetail} />
        ) : null}
        {items.cancel ? (
          <RequestCard item={items.cancel} name={ownName} onPress={openDetail} />
        ) : null}
      </>,
      !isBoss,
    );

    // General user → just their own requests, no tab bar.
    if (!isBoss) {
      return mineList;
    }

    const approveList = renderList(
      approving.length > 0,
      approving.map((item, index) => (
        <RequestCard
          key={getAbsenceId(item) || `approve-${index}`}
          item={item}
          name={getRequesterName(item)}
          onPress={openApproval}
        />
      )),
    );

    const tabs: { key: PendingTab; label: string }[] = [
      { key: 'approve', label: TEXT.ABSENCE_APPROVE_TAB },
      { key: 'mine', label: TEXT.ABSENCE_MINE_TAB },
    ];

    // Boss → two top tabs to switch between the approval queue and own requests.
    return (
      <>
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
        <View style={styles.tabContent}>
          {activeTab === 'approve' ? approveList : mineList}
        </View>
      </>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={TEXT.ABSENCE_PENDING_TITLE} backHref="/" />
      <View style={styles.content}>{renderContent()}</View>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    paddingTop: 14,
    gap: 8,
  },
  topTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textFaint,
  },
  topTabTextActive: {
    color: c.primary,
  },
  topTabIndicator: {
    height: 3,
    width: 40,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  topTabIndicatorActive: {
    backgroundColor: c.primary,
  },
  tabContent: {
    flex: 1,
  },
  sectionsWrap: {
    flex: 1,
  },
  section: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionAccent: {
    width: 4,
    alignSelf: 'stretch',
    minHeight: 34,
    borderRadius: 2,
    backgroundColor: c.primary,
  },
  sectionHeaderText: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: c.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: c.textMuted,
  },
  sectionCountChip: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(146, 33, 36, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: c.border,
    marginVertical: 4,
  },
  sectionScroll: {
    flex: 1,
  },
  sectionListContent: {
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  // General-user view has no section header, so give the first card room below
  // the navbar.
  sectionListNoHeader: {
    paddingTop: 20,
  },
  sectionEmptyContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  itemCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: c.primarySoft,
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
    color: c.text,
  },
  itemRequester: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: c.text,
  },
  itemDate: {
    fontSize: 12,
    lineHeight: 16,
    color: c.textMuted,
  },
  itemStep: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: c.textMuted,
  },
  pendingBadge: {
    backgroundColor: c.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pendingBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
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
});
