import { PublicRepairListScreen } from '@/components/public-repair-list-screen';
import { TEXT } from '@/constants/text';
import { usePublicRepairRole } from '@/context/PublicRepairRoleContext';

export default function Screen() {
  const { staffId } = usePublicRepairRole();
  return <PublicRepairListScreen title={TEXT.PR_TAB_IN_PROGRESS} listType="admin_in_progress" staffId={staffId} />;
}
