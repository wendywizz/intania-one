import { AbsentRequestScreen } from '@/components/absent-request-screen';

export default function BusinessScreen() {
  return (
    <AbsentRequestScreen
      title="ไปราชการ"
      description="ยื่นคำขอไปราชการ"
      fields={['สถานที่', 'วันที่เริ่มต้น', 'วันที่สิ้นสุด', 'วัตถุประสงค์']}
    />
  );
}
