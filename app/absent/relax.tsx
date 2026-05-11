import { AbsentRequestScreen } from '@/components/absent-request-screen';

export default function RelaxScreen() {
  return (
    <AbsentRequestScreen
      title="ลาพักผ่อน"
      description="ยื่นคำขอลาพักผ่อน"
      fields={['วันที่เริ่มต้น', 'วันที่สิ้นสุด', 'ช่องทางติดต่อระหว่างลา', 'เหตุผล']}
    />
  );
}
