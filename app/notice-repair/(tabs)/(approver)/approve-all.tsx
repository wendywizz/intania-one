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
        {
          label: TEXT.NOTICE_REPAIR_REPAIRABLE,
          listType: 'approve_history_repairable',
          emptyMessage: TEXT.NOTICE_REPAIR_EMPTY_APPROVED_REPAIRABLE,
          emptyPreset: 'history',
        },
        {
          label: TEXT.NOTICE_REPAIR_UNREPAIRABLE,
          listType: 'approve_history_unrepairable',
          emptyMessage: TEXT.NOTICE_REPAIR_EMPTY_APPROVED_UNREPAIRABLE,
          emptyPreset: 'history',
        },
      ]}
    />
  );
}
