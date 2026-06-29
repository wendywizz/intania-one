import { RepairInformForm } from '@/components/notice-repair/repair-inform-form';
import { TEXT } from '@/constants/text';
import { useNoticeRepairRole } from '@/context/NoticeRepairRoleContext';

export default function InformScreen() {
  const { staffId } = useNoticeRepairRole();

  return (
    <RepairInformForm
      mode="create"
      staffId={staffId}
      title={TEXT.NOTICE_REPAIR__TITLE}
      heading={TEXT.NOTICE_REPAIR_FORM_NEW_TITLE}
      subtitle={TEXT.NOTICE_REPAIR_FORM_NEW_SUBTITLE}
      submitLabel={TEXT.NOTICE_REPAIR_FORM_SUBMIT}
      submitIconName="paperplane.fill"
      successMessage={TEXT.NOTICE_REPAIR_FORM_SUCCESS}
      errorMessage={TEXT.NOTICE_REPAIR_FORM_ERROR}
      resetOnFocus
    />
  );
}
