import { RepairComputerTabContent } from '@/components/repair-computer-tab-content';
import { TEXT } from '@/constants/text';

export default function WorkerNewJobScreen() {
  return (
    <RepairComputerTabContent
      title={TEXT.NEW_JOB}
      description={TEXT.VIEW_NEW_REPAIR_COMPUTER_JOBS_ASSIGNED_TO_WORKERS}
    />
  );
}
