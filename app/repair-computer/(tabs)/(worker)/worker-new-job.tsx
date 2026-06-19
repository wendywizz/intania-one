import { useCallback } from "react";

import { RepairComputerJobListScreen } from "@/components/repair-computer-job-list-screen";
import { TEXT } from "@/constants/text";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import { listWorkerNewJob } from "@/services/repairComputerService";

export default function WorkerNewJobScreen() {
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;
  const loadPage = useCallback(
    (start: number, length: number) => {
      return listWorkerNewJob(staffId, start, length);
    },
    [staffId],
  );

  return (
    <RepairComputerJobListScreen
      title={TEXT.REPAIR_COMPUTER_NEW_JOB}
      description={TEXT.REPAIR_COMPUTER_VIEW_NEW_WORKER_JOBS_DESCRIPTION}
      emptyMessage={TEXT.REPAIR_COMPUTER_NO_NEW_JOBS}
      errorMessage={TEXT.REPAIR_COMPUTER_UNABLE_TO_LOAD_NEW_JOBS}
      loadingTitle={TEXT.REPAIR_COMPUTER_LOADING_NEW_JOBS}
      loadPage={loadPage}
      detailBackHref="/repair-computer/worker-new-job"
      detailPathname="/repair-computer/worker-job-detail"
    />
  );
}
