import { RepairInformForm } from '@/components/notice-repair/repair-inform-form';
import { TEXT } from '@/constants/text';
import { useNoticeRepairRole } from '@/context/NoticeRepairRoleContext';
import { router } from 'expo-router';

export default function InformScreen() {
  const { staffId } = useNoticeRepairRole();

  return (
    <RepairInformForm
      mode="create"
      staffId={staffId}
      backHref="/notice-repair/informer-current"
      title={TEXT.NOTICE_REPAIR_FORM_NEW_TITLE}
      submitLabel={TEXT.NOTICE_REPAIR_FORM_SUBMIT}
      successMessage={TEXT.NOTICE_REPAIR_FORM_SUCCESS}
      errorMessage={TEXT.NOTICE_REPAIR_FORM_ERROR}
      confirmBeforeSubmit
      confirmTitle={TEXT.NOTICE_REPAIR_FORM_CONFIRM_TITLE}
      confirmMessage={TEXT.NOTICE_REPAIR_FORM_CONFIRM_MESSAGE}
      onSuccess={() => router.replace('/notice-repair/informer-current')}
      resetOnFocus
    />
  );
}
