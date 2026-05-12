import { useCallback } from 'react';

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
      title="History"
      emptyMessage="No history"
      errorMessage="Unable to load history"
      loadingTitle="Loading history"
      loadPage={loadPage}
      detailBackHref="/repair-computer/foreman-history"
    />
  );
}
