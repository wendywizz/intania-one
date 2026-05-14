import { RepairComputerTabContent } from '@/components/repair-computer-tab-content';
import { TEXT } from '@/constants/text';

export default function ForemanApprovementScreen() {
  return (
    <RepairComputerTabContent
      title={TEXT.REPAIR_COMPUTER_APPROVEMENT}
      description={TEXT.REPAIR_COMPUTER_APPROVEMENT_DESCRIPTION}
    />
  );
}
