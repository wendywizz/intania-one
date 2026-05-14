import { useCallback } from 'react';

import { RepairComputerJobListScreen } from '@/components/repair-computer-job-list-screen';
import { TEXT } from '@/constants/text';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import { listWorkerHistory } from '@/services/repairComputerService';

export default function WorkerHistoryScreen() {
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;
  const loadPage = useCallback((start: number, length: number) => {
    return listWorkerHistory(staffId, start, length);
  }, [staffId]);

  return (
    <RepairComputerJobListScreen
      title={TEXT.SHARED_HISTORY}
      emptyMessage={TEXT.SHARED_NO_HISTORY}
      errorMessage={TEXT.SHARED_UNABLE_TO_LOAD_HISTORY}
      loadingTitle={TEXT.SHARED_LOADING_HISTORY}
      loadPage={loadPage}
      detailBackHref="/repair-computer/worker-history"
    />
  );
}
