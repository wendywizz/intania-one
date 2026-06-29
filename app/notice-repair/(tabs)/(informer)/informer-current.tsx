import { NoticeRepairListScreen } from '@/components/notice-repair/notice-repair-list-screen';
import { TEXT } from '@/constants/text';
import { useNoticeRepairRole } from '@/context/NoticeRepairRoleContext';
import { navPush } from '@/utils/navigation';

export default function Screen() {
  const { staffId } = useNoticeRepairRole();
  return (
    <NoticeRepairListScreen
      title={TEXT.NOTICE_REPAIR_TAB_CURRENT}
      listType="informer_current"
      staffId={staffId}
      onAddPress={() => navPush('/notice-repair/inform' as Parameters<typeof navPush>[0])}
      addLabel={TEXT.NOTICE_REPAIR_TAB_INFORM}
    />
  );
}
