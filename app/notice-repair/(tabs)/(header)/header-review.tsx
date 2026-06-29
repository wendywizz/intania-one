import { NoticeRepairListScreen } from '@/components/notice-repair/notice-repair-list-screen';
import { TEXT } from '@/constants/text';
import { useNoticeRepairRole } from '@/context/NoticeRepairRoleContext';

export default function Screen() {
  const { staffId } = useNoticeRepairRole();
  return (
    <NoticeRepairListScreen
      title={TEXT.NOTICE_REPAIR_TAB_REVIEW}
      staffId={staffId}
      segments={[
        { label: TEXT.NOTICE_REPAIR_TAB_REPAIR_RECORD, listType: 'header_repair_record', title: 'บันทึกการซ่อม', description: 'รายการบันทึกผลการซ่อม' },
        { label: TEXT.NOTICE_REPAIR_TAB_ACCEPTANCE, listType: 'header_acceptance', title: 'ตรวจรับงาน', description: 'รายการที่รอตรวจรับงาน' },
        { label: TEXT.NOTICE_REPAIR_TAB_REJECT_CANNOT_REPAIR, listType: 'header_reject_cannot_repair', title: 'งานที่ซ่อมไม่ได้', description: 'รายการที่ไม่สามารถซ่อมได้' },
      ]}
    />
  );
}
