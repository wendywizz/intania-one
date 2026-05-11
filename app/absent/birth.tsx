import { AbsentRequestScreen } from '@/components/absent-request-screen';

export default function BirthScreen() {
  return (
    <AbsentRequestScreen
      title="ลาคลอด"
      description="ยื่นคำขอลาคลอด"
      fields={['วันที่คลอดบุตร', 'วันที่เริ่มต้น', 'วันที่สิ้นสุด', 'เอกสารประกอบ']}
    />
  );
}
