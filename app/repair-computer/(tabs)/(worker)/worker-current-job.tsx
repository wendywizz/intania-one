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
      title={TEXT.CURRENT_JOB}
      emptyMessage={TEXT.NO_CURRENT_JOBS}
      errorMessage={TEXT.UNABLE_TO_LOAD_CURRENT_JOBS}
      loadingTitle={TEXT.LOADING_CURRENT_JOBS}
      loadPage={loadPage}
      detailBackHref="/repair-computer/worker-current-job"
    />
  );
}
