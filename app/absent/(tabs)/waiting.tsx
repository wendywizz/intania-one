import { AbsentTabContent } from '@/components/absent-tab-content';
import { TEXT } from '@/constants/text';

export default function WaitingScreen() {
  return (
    <AbsentTabContent
      title={TEXT.TITLE_7}
      description="รายการคำขอที่อยู่ระหว่างรอการอนุมัติ"
      items={['รออนุมัติจากหัวหน้าภาควิชา', 'รออนุมัติจากฝ่ายบุคคล']}
    />
  );
}
