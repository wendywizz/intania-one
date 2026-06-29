import { NoticeRepairListScreen } from '@/components/notice-repair/notice-repair-list-screen';
import { TEXT } from '@/constants/text';
import { useNoticeRepairRole } from '@/context/NoticeRepairRoleContext';

export default function Screen() {
  const { staffId } = useNoticeRepairRole();
  return <NoticeRepairListScreen title={TEXT.NOTICE_REPAIR_TAB_DONE} listType="admin_finished" staffId={staffId} />;
}
