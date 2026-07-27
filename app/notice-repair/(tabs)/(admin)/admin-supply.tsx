import { NoticeRepairListScreen } from '@/components/notice-repair/notice-repair-list-screen';
import { TEXT } from '@/constants/text';
import { useNoticeRepairRole } from '@/context/NoticeRepairRoleContext';

export default function Screen() {
  const { staffId } = useNoticeRepairRole();

  return (
    <NoticeRepairListScreen
      title={TEXT.NOTICE_REPAIR_TAB_SUPPLY}
      staffId={staffId}
      segments={[
        {
          label: TEXT.NOTICE_REPAIR_TAB_SUPPLY_MATERIAL,
          listType: 'supply_material',
        },
        {
          label: TEXT.NOTICE_REPAIR_TAB_DEPT_SUPPLY,
          listType: 'dept_supply_response',
        },
      ]}
    />
  );
}
