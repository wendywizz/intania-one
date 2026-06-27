import { NoticeRepairListScreen } from '@/components/notice-repair/notice-repair-list-screen';
import { TEXT } from '@/constants/text';
import { useNoticeRepairRole } from '@/context/NoticeRepairRoleContext';

export default function Screen() {
  const { staffId } = useNoticeRepairRole();
  return (
    <NoticeRepairListScreen
      title={TEXT.PR_TAB_HISTORY}
      staffId={staffId}
      segments={[
        { label: TEXT.PR_REPAIRABLE, listType: 'approve_history_repairable' },
        { label: TEXT.PR_UNREPAIRABLE, listType: 'approve_history_unrepairable' },
      ]}
    />
  );
}
