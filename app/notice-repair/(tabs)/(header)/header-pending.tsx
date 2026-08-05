import { NoticeRepairListScreen } from '@/components/notice-repair/notice-repair-list-screen';
import { TEXT } from '@/constants/text';
import { useNoticeRepairRole } from '@/context/NoticeRepairRoleContext';

export default function Screen() {
  const { staffId } = useNoticeRepairRole();
  return <NoticeRepairListScreen title={TEXT.NOTICE_REPAIR_TAB_PENDING_RECEIPT} listType="header_pending" staffId={staffId} emptyMessage={TEXT.NOTICE_REPAIR_EMPTY_PENDING_RECEIPT} />;
}
