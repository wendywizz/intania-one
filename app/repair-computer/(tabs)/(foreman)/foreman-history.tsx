import { useCallback, useState } from 'react';
import { TEXT } from '@/constants/text';

import { RepairComputerJobListScreen } from '@/components/repair-computer-job-list-screen';
import { TopTabs } from '@/components/ui';
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

  const tabBar = <TopTabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />;

  if (activeTab === 'supply') {
    return (
      <RepairComputerJobListScreen
        key="supply"
        title={TEXT.SHARED_HISTORY}
        emptyMessage={TEXT.REPAIR_COMPUTER_NO_SUPPLY_HISTORY}
        emptyPreset="history"
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
      title={TEXT.SHARED_HISTORY}
      emptyMessage={TEXT.REPAIR_COMPUTER_NO_JOB_HISTORY}
      emptyPreset="history"
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

