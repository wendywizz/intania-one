import { useCallback } from 'react';

import { RepairComputerJobListScreen } from '@/components/repair-computer-job-list-screen';
import { listForemanNewJob } from '@/services/repairComputerService';

export default function ForemanNewJobScreen() {
  const loadPage = useCallback((start: number, length: number) => {
    return listForemanNewJob(start, length);
  }, []);

  return (
    <RepairComputerJobListScreen
      title="New Job"
      emptyMessage="No new jobs"
      errorMessage="Unable to load new jobs"
      loadingTitle="Loading new jobs"
      loadPage={loadPage}
      detailBackHref="/repair-computer/foreman-new-job"
      detailPathname="/repair-computer/foreman-job-detail"
    />
  );
}
