import type { MailMessage } from '@/services/mailService';

/**
 * Fixture Inbox for `MAIL_MOCK_ENABLED` (see constants/mailAuth.ts) — lets the
 * mail screens be designed and clicked through on `expo start --web` without
 * a real Entra connection or a running scooba-service. Never imported by
 * anything that isn't already gated on `MAIL_MOCK_ENABLED`, which is itself
 * hard-`false` outside development, so none of this ships in a real build.
 *
 * Only a type import comes back from services/mailService.ts (`MailMessage`,
 * erased at compile time) — mailService.ts calls into this file's functions,
 * not the other way around, so there is no runtime import cycle.
 */

const SENDERS = [
  { name: 'Narongchai Duangthet (ณรงค์ชัย ดวงเทศ)', address: 'narongchai.du@psu.ac.th' },
  { name: 'งานบริหารทั่วไป คณะวิศวกรรมศาสตร์', address: 'eng-admin@group.psu.ac.th' },
  { name: 'สำนักงานบริหารการวิจัย มหาวิทยาลัยสงขลานครินทร์', address: 'research@psu.ac.th' },
  { name: 'IT Center PSU', address: 'itc@psu.ac.th' },
  { name: 'งานบริหารบุคคล คณะวิศวกรรมศาสตร์', address: 'hr.eng@psu.ac.th' },
  { name: 'Google Calendar', address: 'calendar-notification@google.com' },
] as const;

const SUBJECTS = [
  '(DOCS) [มอ 101.2/69-3564] ขอเชิญร่วมกิจกรรมเนื่องในวันมหิดลและวันถือประโยชน์ของเพื่อนมนุษย์เป็นกิจที่หนึ่ง',
  'แจ้งปิดปรับปรุงระบบเครือข่ายอินเทอร์เน็ต วันเสาร์ที่ 27 กันยายน 2569',
  'ขอเชิญเข้าร่วมอบรมการใช้งาน Microsoft Teams สำหรับบุคลากรสายวิชาการ',
  'สรุปผลการประชุมคณะกรรมการบริหารคณะวิศวกรรมศาสตร์ ครั้งที่ 9/2569',
  'แจ้งกำหนดการสอบปลายภาค ภาคการศึกษาที่ 1 ปีการศึกษา 2569',
  'ขอความอนุเคราะห์ตอบแบบสอบถามความพึงพอใจต่อการให้บริการ',
  'ประกาศรายชื่อผู้มีสิทธิ์สอบสัมภาษณ์ ตำแหน่งนักวิชาการคอมพิวเตอร์',
  'Reminder: การประชุมทีมพัฒนาระบบ ประจำสัปดาห์',
  'แจ้งเวียนระเบียบการเบิกจ่ายค่าใช้จ่ายในการเดินทางไปราชการ',
  'ขอเชิญร่วมงานทำบุญตักบาตรเนื่องในโอกาสวันคล้ายวันสถาปนาคณะฯ',
  'แจ้งผลการพิจารณาทุนสนับสนุนการวิจัยประจำปี 2569',
  'Your weekly schedule — 5 events this week',
] as const;

const OFFICIAL_LETTER_HTML = (subject: string, senderName: string) => `
  <div style="font-family: 'TH Sarabun New', Tahoma, sans-serif; font-size: 16px; line-height: 1.9; color:#222;">
    <p style="text-align:center; margin:0 0 4px;"><b>บันทึกข้อความ</b></p>
    <p style="margin:0 0 16px;">ส่วนงาน&nbsp;&nbsp;คณะวิศวกรรมศาสตร์ มหาวิทยาลัยสงขลานครินทร์&nbsp;&nbsp;โทร. 0-7428-7000</p>
    <p style="margin:0 0 16px;">ที่&nbsp;&nbsp;มอ 101.2/69-3564&nbsp;&nbsp;&nbsp;&nbsp;วันที่&nbsp;&nbsp;23 กันยายน 2569</p>
    <p style="margin:0 0 16px;"><b>เรื่อง</b>&nbsp;&nbsp;${subject}</p>
    <p style="margin:0 0 16px;"><b>เรียน</b>&nbsp;&nbsp;คุณไกรสุวรรณ หยางทกูร</p>
    <p style="margin:0 0 16px;">
      สารบรรณ องค์กรสร้างสุข กลุ่มงานบริหารและบุคคล สำนักงานบริหารคณะ คณะวิศวกรรมศาสตร์
      วิทยาเขตหาดใหญ่ ได้ส่งเอกสารถึงตัวท่าน เรื่อง ${subject} ประจำปี 2569
      เมื่อวันที่ 23 กันยายน 2569 เวลา 9:41 น.
    </p>
    <table style="border-collapse:collapse; margin:0 0 16px; width:600px;">
      <tr>
        <td style="padding:6px 10px; border:1px solid #ccc; background:#f5f5f5;">วันที่จัดกิจกรรม</td>
        <td style="padding:6px 10px; border:1px solid #ccc;">1 ตุลาคม 2569</td>
      </tr>
      <tr>
        <td style="padding:6px 10px; border:1px solid #ccc; background:#f5f5f5;">สถานที่</td>
        <td style="padding:6px 10px; border:1px solid #ccc;">ห้องประชุมใหญ่ ชั้น 2 อาคารเรียนรวม</td>
      </tr>
    </table>
    <p style="margin:0 0 24px;">
      ท่านสามารถอ่านเอกสารเรื่องดังกล่าวได้ที่
      <a href="https://docs.psu.ac.th/view/b876a237">https://docs.psu.ac.th/view/b876a237</a>
    </p>
    <p style="margin:0;">ด้วยความนับถือ</p>
    <p style="margin:0;">${senderName}</p>
    <p style="margin:0; color:#666;">มหาวิทยาลัยสงขลานครินทร์</p>
  </div>
`;

const PLAIN_TEXT_BODY = [
  'เรียน ทีมพัฒนาระบบทุกท่าน',
  '',
  'ขอนัดประชุมทีมประจำสัปดาห์ วันพุธนี้ เวลา 13.30 น. ห้องประชุมชั้น 3',
  'วาระ: ความคืบหน้าโมดูลอีเมล, แผนทดสอบก่อนขึ้น production',
  '',
  'ขอบคุณครับ',
].join('\n');

function buildMockMessages(): MailMessage[] {
  const now = Date.now();

  return SUBJECTS.map((subject, index) => {
    const sender = SENDERS[index % SENDERS.length];
    const isRead = index % 3 !== 0;
    const isPlainText = index % 4 === 3;
    const receivedDateTime = new Date(now - index * 6 * 3600 * 1000).toISOString();

    return {
      id: `mock-${index + 1}`,
      subject,
      from: { name: sender.name, address: sender.address },
      receivedDateTime,
      isRead,
      bodyPreview: isPlainText
        ? PLAIN_TEXT_BODY.split('\n').filter(Boolean)[0]
        : `เรียน คุณไกรสุวรรณ หยางทกูร สารบรรณ องค์กรสร้างสุข กลุ่มงานบริหารและบุคคล ได้ส่งเอกสารถึงตัวท่าน...`,
      body: isPlainText
        ? { contentType: 'text', content: PLAIN_TEXT_BODY }
        : { contentType: 'html', content: OFFICIAL_LETTER_HTML(subject, sender.name) },
    };
  });
}

export const MOCK_MESSAGES: MailMessage[] = buildMockMessages();

// A little artificial latency so loading spinners, pull-to-refresh and the
// "กำลังค้นหา" indicator all have something real to show during UI work —
// an instant resolve would make every loading state invisible to check.
const MOCK_LATENCY_MS = 400;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS));
}

export async function mockListInbox({
  top = 25,
  cursor = 0,
}: { top?: number; cursor?: number } = {}): Promise<{ messages: MailMessage[]; nextCursor?: number }> {
  const page = MOCK_MESSAGES.slice(cursor, cursor + top);
  const nextCursor = cursor + top < MOCK_MESSAGES.length ? cursor + top : undefined;
  return delay({ messages: page, nextCursor });
}

export async function mockSearchInbox(query: string): Promise<{ messages: MailMessage[] }> {
  const q = query.trim().toLowerCase();
  if (!q) return delay({ messages: [] });

  const hits = MOCK_MESSAGES.filter(
    (message) =>
      message.subject.toLowerCase().includes(q) ||
      message.from.name.toLowerCase().includes(q) ||
      message.from.address.toLowerCase().includes(q) ||
      message.bodyPreview.toLowerCase().includes(q),
  );
  return delay({ messages: hits });
}

export async function mockGetMessage(id: string): Promise<MailMessage> {
  const found = MOCK_MESSAGES.find((message) => message.id === id);
  if (!found) throw new Error('ไม่พบอีเมลที่เลือก (mock)');
  return delay(found);
}
