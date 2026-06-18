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
      title={TEXT.REPAIR_COMPUTER_NEW_JOB}
      description={TEXT.REPAIR_COMPUTER_VIEW_FOREMAN_NEW_JOBS_DESCRIPTION}
      emptyMessage={TEXT.REPAIR_COMPUTER_NO_NEW_JOBS}
      errorMessage={TEXT.REPAIR_COMPUTER_UNABLE_TO_LOAD_NEW_JOBS}
      loadingTitle={TEXT.REPAIR_COMPUTER_LOADING_NEW_JOBS}
      loadPage={loadPage}
      detailBackHref="/repair-computer/foreman-new-job"
      detailPathname="/repair-computer/foreman-job-detail"
    />
  );
}
