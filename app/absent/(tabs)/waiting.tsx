import { AbsentTabContent } from '@/components/absent-tab-content';

export default function WaitingScreen() {
  return (
    <AbsentTabContent
      title="รออนุมัติ"
      description="รายการคำขอที่อยู่ระหว่างรอการอนุมัติ"
      items={['รออนุมัติจากหัวหน้าภาควิชา', 'รออนุมัติจากฝ่ายบุคคล']}
    />
  );
}
