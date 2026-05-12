import { RepairComputerTabContent } from '@/components/repair-computer-tab-content';
import { TEXT } from '@/constants/text';

export default function WorkerCurrentJobScreen() {
  return (
    <RepairComputerTabContent
      title={TEXT.CURRENT_JOB}
      description={TEXT.VIEW_WORKER_JOBS_CURRENTLY_IN_PROGRESS}
    />
  );
}
