import { useCallback } from 'react';
import { TEXT } from '@/constants/text';

import { RepairComputerJobListScreen } from '@/components/repair-computer-job-list-screen';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import { listForemanHistory } from '@/services/repairComputerService';

export default function ForemanHistoryScreen() {
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;
  const loadPage = useCallback((start: number, length: number) => {
    return listForemanHistory(staffId, start, length);
  }, [staffId]);

  return (
    <RepairComputerJobListScreen
      title={TEXT.REPAIR_COMPUTER_REPAIR_HISTORY}
      description={TEXT.REPAIR_COMPUTER_VIEW_FOREMAN_HISTORY_DESCRIPTION}
      emptyMessage={TEXT.SHARED_NO_HISTORY}
      errorMessage={TEXT.SHARED_UNABLE_TO_LOAD_HISTORY}
      loadingTitle={TEXT.SHARED_LOADING_HISTORY}
      loadPage={loadPage}
      detailBackHref="/repair-computer/foreman-history"
      detailPathname="/repair-computer/job-history-detail"
      itemRepairTypeOnly
    />
  );
}
