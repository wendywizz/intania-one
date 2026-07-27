import { NoticeRepairListScreen } from '@/components/notice-repair/notice-repair-list-screen';
import { TEXT } from '@/constants/text';
import { useNoticeRepairRole } from '@/context/NoticeRepairRoleContext';
import { getPrivilege } from '@/services/noticeRepairService';
import { useEffect, useState } from 'react';

export default function Screen() {
  const { staffId } = useNoticeRepairRole();
  // header_repairing is filtered by the header's work category (from privilege).
  const [workCategory, setWorkCategory] = useState<number | undefined>(undefined);

  useEffect(() => {
    let active = true;
    getPrivilege(staffId)
      .then((p) => { if (active) setWorkCategory((p.work_category_ids ?? [])[0]); })
      .catch(() => { /* leave undefined — endpoint then returns unfiltered */ });
    return () => { active = false; };
  }, [staffId]);

  return (
    <NoticeRepairListScreen
      title={TEXT.NOTICE_REPAIR_TAB_REPAIR_LIST}
      staffId={staffId}
      segments={[
        { label: TEXT.NOTICE_REPAIR_TAB_CURRENT, listType: 'header_current', workCategory },
        { label: TEXT.NOTICE_REPAIR_TAB_DONE, listType: 'header_done', workCategory },
      ]}
    />
  );
}
