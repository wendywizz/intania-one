import { RepairComputerTabContent } from '@/components/repair-computer-tab-content';
import { TEXT } from '@/constants/text';

export default function ForemanApprovementScreen() {
  return (
    <RepairComputerTabContent
      title={TEXT.APPROVEMENT}
      description={TEXT.APPROVE_REPAIR_COMPUTER_JOB_OUTCOMES}
    />
  );
}
