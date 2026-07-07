import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TEXT } from '@/constants/text';

import { RepairComputerJobListScreen } from '@/components/repair-computer-job-list-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import {
  listForemanHistory,
  listForemanSupplyApproveHistory,
} from '@/services/repairComputerService';

type HistoryTab = 'job' | 'supply';

const TABS: { key: HistoryTab; label: string }[] = [
  { key: 'job', label: 'ประวัติงานซ่อม' },
  { key: 'supply', label: 'ประวัติอนุมัติเบิก' },
];

export default function ForemanHistoryScreen() {
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;
  const [activeTab, setActiveTab] = useState<HistoryTab>('job');

  const loadJobHistory = useCallback(
    (start: number, length: number) => listForemanHistory(staffId, start, length),
    [staffId],
  );

  const loadSupplyHistory = useCallback(
    (start: number, length: number) =>
      listForemanSupplyApproveHistory(staffId, start, length),
    [staffId],
  );

  const tabBar = (
    <ThemedView style={styles.topTabBar} lightColor="#FFFFFF" darkColor="#151718">
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => setActiveTab(tab.key)}
            style={styles.topTab}
          >
            <ThemedText
              style={[styles.topTabText, isActive ? styles.topTabTextActive : undefined]}
              numberOfLines={1}
            >
              {tab.label}
            </ThemedText>
            <View
              style={[styles.topTabIndicator, isActive ? styles.topTabIndicatorActive : undefined]}
            />
          </Pressable>
        );
      })}
    </ThemedView>
  );

  if (activeTab === 'supply') {
    return (
      <RepairComputerJobListScreen
        key="supply"
        title={TEXT.REPAIR_COMPUTER_REPAIR_HISTORY}
        emptyMessage={TEXT.SHARED_NO_HISTORY}
        errorMessage={TEXT.SHARED_UNABLE_TO_LOAD_HISTORY}
        loadingTitle={TEXT.SHARED_LOADING_HISTORY}
        loadPage={loadSupplyHistory}
        detailBackHref="/repair-computer/foreman-history"
        detailPathname="/repair-computer/foreman-job-detail"
        itemRepairTypeOnly
        headerSlot={tabBar}
      />
    );
  }

  return (
    <RepairComputerJobListScreen
      key="job"
      title={TEXT.REPAIR_COMPUTER_REPAIR_HISTORY}
      emptyMessage={TEXT.SHARED_NO_HISTORY}
      errorMessage={TEXT.SHARED_UNABLE_TO_LOAD_HISTORY}
      loadingTitle={TEXT.SHARED_LOADING_HISTORY}
      loadPage={loadJobHistory}
      detailBackHref="/repair-computer/foreman-history"
      detailPathname="/repair-computer/job-history-detail"
      itemRepairTypeOnly
      headerSlot={tabBar}
    />
  );
}

const styles = StyleSheet.create({
  topTabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  topTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 12,
    gap: 8,
  },
  topTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  topTabTextActive: {
    color: '#922124',
  },
  topTabIndicator: {
    height: 3,
    width: 40,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  topTabIndicatorActive: {
    backgroundColor: '#922124',
  },
});
