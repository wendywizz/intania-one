import { AbsentRequestScreen } from '@/components/absent-request-screen';
import { TEXT } from '@/constants/text';

export default function BirthScreen() {
  return (
    <AbsentRequestScreen
      title={TEXT.TITLE_5}
      description="ยื่นคำขอลาคลอด"
      fields={['วันที่คลอดบุตร', 'วันที่เริ่มต้น', 'วันที่สิ้นสุด', 'เอกสารประกอบ']}
    />
  );
}
