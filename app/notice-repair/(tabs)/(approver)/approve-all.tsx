import { NoticeRepairListScreen } from '@/components/notice-repair/notice-repair-list-screen';
import { TEXT } from '@/constants/text';
import { useNoticeRepairRole } from '@/context/NoticeRepairRoleContext';

export default function Screen() {
  const { staffId } = useNoticeRepairRole();
  return (
    <NoticeRepairListScreen
      title={TEXT.NOTICE_REPAIR_TAB_HISTORY}
      staffId={staffId}
      segments={[
        { label: TEXT.NOTICE_REPAIR_REPAIRABLE, listType: 'approve_history_repairable' },
        { label: TEXT.NOTICE_REPAIR_UNREPAIRABLE, listType: 'approve_history_unrepairable' },
      ]}
    />
  );
}
