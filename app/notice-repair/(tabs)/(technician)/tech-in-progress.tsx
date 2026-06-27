import { NoticeRepairListScreen } from '@/components/notice-repair/notice-repair-list-screen';
import { TEXT } from '@/constants/text';
import { useNoticeRepairRole } from '@/context/NoticeRepairRoleContext';

export default function Screen() {
  const { staffId } = useNoticeRepairRole();
  return <NoticeRepairListScreen title={TEXT.PR_TAB_IN_PROGRESS} listType="technician_in_progress" staffId={staffId} />;
}
