import { AbsentTabContent } from '@/components/absent-tab-content';
import { TEXT } from '@/constants/text';

export default function HistoryScreen() {
  return (
    <AbsentTabContent
      title={TEXT.TITLE}
      description="รายการคำขอในอดีตและผลการอนุมัติ"
      items={['รายการที่อนุมัติแล้ว', 'รายการที่ไม่อนุมัติ', 'รายการที่ยกเลิก']}
    />
  );
}
