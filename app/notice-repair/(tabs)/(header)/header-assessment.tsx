import { NoticeRepairListScreen } from '@/components/notice-repair/notice-repair-list-screen';
import { TEXT } from '@/constants/text';
import { useNoticeRepairRole } from '@/context/NoticeRepairRoleContext';

export default function Screen() {
  const { staffId } = useNoticeRepairRole();
  return (
    <NoticeRepairListScreen
      title={TEXT.NOTICE_REPAIR_TAB_ASSESSMENT}
      staffId={staffId}
      segments={[
        {
          label: TEXT.NOTICE_REPAIR_TAB_WAITING_ESTIMATE,
          listType: 'header_waiting_estimate',
          detailPathname: '/notice-repair/header-estimate-detail',
          emptyMessage: TEXT.NOTICE_REPAIR_EMPTY_WAITING_ESTIMATE,
        },
        {
          label: TEXT.NOTICE_REPAIR_TAB_ESTIMATED,
          listType: 'header_estimated',
          emptyMessage: TEXT.NOTICE_REPAIR_EMPTY_ESTIMATED,
        },
      ]}
    />
  );
}
