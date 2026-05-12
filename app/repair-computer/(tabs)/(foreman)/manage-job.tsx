import { useCallback } from 'react';
import { TEXT } from '@/constants/text';

import { RepairComputerJobListScreen } from '@/components/repair-computer-job-list-screen';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import { listForemanManageJob } from '@/services/repairComputerService';

export default function ForemanManageJobScreen() {
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;
  const loadPage = useCallback((start: number, length: number) => {
    return listForemanManageJob(staffId, start, length);
  }, [staffId]);

  return (
    <RepairComputerJobListScreen
      title={TEXT.MANAGE_JOB}
      emptyMessage={TEXT.NO_JOBS_TO_MANAGE}
      errorMessage={TEXT.UNABLE_TO_LOAD_MANAGE_JOBS}
      loadingTitle={TEXT.LOADING_MANAGE_JOBS}
      loadPage={loadPage}
      detailBackHref="/repair-computer/manage-job"
    />
  );
}
