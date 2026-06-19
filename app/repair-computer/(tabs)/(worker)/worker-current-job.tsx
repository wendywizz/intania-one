import { useCallback } from 'react';

import { RepairComputerJobListScreen } from '@/components/repair-computer-job-list-screen';
import { TEXT } from '@/constants/text';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import { listWorkerCurrentJob } from '@/services/repairComputerService';

export default function WorkerCurrentJobScreen() {
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;
  const loadPage = useCallback((start: number, length: number) => {
    return listWorkerCurrentJob(staffId, start, length);
  }, [staffId]);

  return (
    <RepairComputerJobListScreen
      title={TEXT.REPAIR_COMPUTER_CURRENT_JOB}
      description={TEXT.REPAIR_COMPUTER_VIEW_WORKER_CURRENT_JOBS_DESCRIPTION}
      emptyMessage={TEXT.REPAIR_COMPUTER_NO_CURRENT_JOBS}
      errorMessage={TEXT.REPAIR_COMPUTER_UNABLE_TO_LOAD_CURRENT_JOBS}
      loadingTitle={TEXT.REPAIR_COMPUTER_LOADING_CURRENT_JOBS}
      loadPage={loadPage}
      detailBackHref="/repair-computer/worker-current-job"
      detailPathname="/repair-computer/worker-job-detail"
      itemShowRepairType
    />
  );
}
