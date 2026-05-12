import { useCallback } from 'react';

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
      title="Manage Job"
      emptyMessage="No jobs to manage"
      errorMessage="Unable to load manage jobs"
      loadingTitle="Loading manage jobs"
      loadPage={loadPage}
      detailBackHref="/repair-computer/manage-job"
    />
  );
}
