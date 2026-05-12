import { RepairComputerTabContent } from '@/components/repair-computer-tab-content';
import { TEXT } from '@/constants/text';

export default function WorkerHistoryScreen() {
  return (
    <RepairComputerTabContent
      title={TEXT.HISTORY}
      description={TEXT.VIEW_WORKER_REPAIR_COMPUTER_JOB_HISTORY}
    />
  );
}
