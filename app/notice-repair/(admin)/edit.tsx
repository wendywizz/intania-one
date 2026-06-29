import { RepairInformForm } from '@/components/notice-repair/repair-inform-form';
import { TEXT } from '@/constants/text';
import { useAuth } from '@/context/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';

export default function NoticeRepairEditScreen() {
  const { repair_id, staff_id: paramStaff, role, source } = useLocalSearchParams<{
    repair_id: string; staff_id: string; role?: string; source?: string;
  }>();
  const { user } = useAuth();
  const staffId = paramStaff ?? user?.staffId ?? '';

  return (
    <RepairInformForm
      mode="edit"
      staffId={staffId}
      repairId={repair_id}
      title={TEXT.NOTICE_REPAIR_EDIT_TITLE}
      submitLabel={TEXT.NOTICE_REPAIR_EDIT_SUBMIT}
      successMessage={TEXT.NOTICE_REPAIR_EDIT_SUCCESS}
      errorMessage={TEXT.NOTICE_REPAIR_EDIT_ERROR}
      loadErrorMessage={TEXT.NOTICE_REPAIR_EDIT_LOAD_ERROR}
      confirmBeforeSubmit
      confirmTitle={TEXT.NOTICE_REPAIR_EDIT_CONFIRM_TITLE}
      confirmMessage={TEXT.NOTICE_REPAIR_EDIT_CONFIRM_MESSAGE}
      onSuccess={() => {
        router.replace({
          pathname: '/notice-repair/detail',
          params: { repair_id, staff_id: staffId, role, source },
        } as Parameters<typeof router.replace>[0]);
      }}
    />
  );
}
