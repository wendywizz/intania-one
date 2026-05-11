import { AbsentTabContent } from '@/components/absent-tab-content';

export default function HistoryScreen() {
  return (
    <AbsentTabContent
      title="ประวัติการลา"
      description="รายการคำขอในอดีตและผลการอนุมัติ"
      items={['รายการที่อนุมัติแล้ว', 'รายการที่ไม่อนุมัติ', 'รายการที่ยกเลิก']}
    />
  );
}
