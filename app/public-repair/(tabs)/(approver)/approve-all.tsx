import { PublicRepairListScreen } from '@/components/public-repair-list-screen';
import { TEXT } from '@/constants/text';
import { usePublicRepairRole } from '@/context/PublicRepairRoleContext';

export default function Screen() {
  const { staffId } = usePublicRepairRole();
  return (
    <PublicRepairListScreen
      title={TEXT.PR_TAB_HISTORY}
      staffId={staffId}
      segments={[
        { label: TEXT.PR_REPAIRABLE, listType: 'approve_history_repairable' },
        { label: TEXT.PR_UNREPAIRABLE, listType: 'approve_history_unrepairable' },
      ]}
    />
  );
}
