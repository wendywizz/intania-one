import { useCallback } from 'react';
import { TEXT } from '@/constants/text';

import { RepairComputerJobListScreen } from '@/components/repair-computer-job-list-screen';
import { listForemanNewJob } from '@/services/repairComputerService';

export default function ForemanNewJobScreen() {
  const loadPage = useCallback((start: number, length: number) => {
    return listForemanNewJob(start, length);
  }, []);

  return (
    <RepairComputerJobListScreen
      title={TEXT.NEW_JOB}
      emptyMessage={TEXT.NO_NEW_JOBS}
      errorMessage={TEXT.UNABLE_TO_LOAD_NEW_JOBS}
      loadingTitle={TEXT.LOADING_NEW_JOBS}
      loadPage={loadPage}
      detailBackHref="/repair-computer/foreman-new-job"
      detailPathname="/repair-computer/foreman-job-detail"
    />
  );
}
