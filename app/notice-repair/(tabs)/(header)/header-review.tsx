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
        {
          label: TEXT.NOTICE_REPAIR_TAB_REPAIR_RECORD,
          listType: 'header_repair_record',
          emptyMessage: TEXT.NOTICE_REPAIR_EMPTY_REPAIR_RECORD,
        },
        {
          label: TEXT.NOTICE_REPAIR_TAB_ACCEPTANCE,
          listType: 'header_acceptance',
          emptyMessage: TEXT.NOTICE_REPAIR_EMPTY_ACCEPTANCE,
        },
        {
          label: TEXT.NOTICE_REPAIR_TAB_REJECT_CANNOT_REPAIR,
          listType: 'header_reject_cannot_repair',
          emptyMessage: TEXT.NOTICE_REPAIR_EMPTY_CANNOT_REPAIR,
        },
      ]}
    />
  );
}
