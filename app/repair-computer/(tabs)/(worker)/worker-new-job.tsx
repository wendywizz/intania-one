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
      title={TEXT.NEW_JOB}
      emptyMessage={TEXT.NO_NEW_JOBS}
      errorMessage={TEXT.UNABLE_TO_LOAD_NEW_JOBS}
      loadingTitle={TEXT.LOADING_NEW_JOBS}
      loadPage={loadPage}
      detailBackHref="/repair-computer/worker-new-job"
    />
  );
}
