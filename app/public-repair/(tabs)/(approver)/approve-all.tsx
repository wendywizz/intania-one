import { PublicRepairListScreen } from '@/components/public-repair-list-screen';
import { TEXT } from '@/constants/text';
import { usePublicRepairRole } from '@/context/PublicRepairRoleContext';

export default function Screen() {
  const { staffId } = usePublicRepairRole();
  return <PublicRepairListScreen title={TEXT.PR_TAB_ALL} listType="all" staffId={staffId} />;
}
