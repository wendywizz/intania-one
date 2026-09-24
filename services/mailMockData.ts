import type { MailFolderKey, MailReadFilter } from '@/constants/mailFolders';
import type { ComposePayload, MailMessage, MailRecipient } from '@/services/mailService';

/**
 * Fixture mailbox for `MAIL_MOCK_ENABLED` (see constants/mailAuth.ts) — lets
 * the mail screens be designed and clicked through on `expo start --web`
 * without a real Entra connection or a running scooba-service. Only reached
 * from branches already gated on `MAIL_MOCK_ENABLED`, which is hard-`false`
 * outside development, so none of it runs in a real build.
 *
 * Mutable, in memory: sending, saving a draft or opening an unread message
 * changes it for the rest of the session, so those flows can be checked end to
 * end. A page reload puts it back.
 *
 * Only types come back from services/mailService.ts (erased at compile time)
 * — mailService.ts calls into this file, not the other way round, so there is
 * no runtime import cycle.
 */

export const MOCK_ACCOUNT = { displayName: 'ไกรสุวรรณ หยางทกูร', mail: 'kraisuwan.y@psu.ac.th' };
const ME: MailRecipient = { name: MOCK_ACCOUNT.displayName, address: MOCK_ACCOUNT.mail };

const PEOPLE: MailRecipient[] = [
  { name: 'Narongchai Duangthet (ณรงค์ชัย ดวงเทศ)', address: 'narongchai.du@psu.ac.th' },
  { name: 'งานบริหารทั่วไป คณะวิศวกรรมศาสตร์', address: 'eng-admin@group.psu.ac.th' },
  { name: 'สำนักงานบริหารการวิจัย มหาวิทยาลัยสงขลานครินทร์', address: 'research@psu.ac.th' },
  { name: 'IT Center PSU', address: 'itc@psu.ac.th' },
  { name: 'งานบริหารบุคคล คณะวิศวกรรมศาสตร์', address: 'hr.eng@psu.ac.th' },
  { name: 'สมชาย ใจดี', address: 'somchai.j@psu.ac.th' },
  { name: 'สุภาพร แก้วมณี', address: 'supaporn.k@psu.ac.th' },
  { name: 'วิทยา ศรีสุข', address: 'wittaya.s@psu.ac.th' },
  { name: 'ทีมพัฒนาระบบ Intania One', address: 'intania-dev@group.psu.ac.th' },
];

const INBOX_SUBJECTS = [
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
];

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

const HOUR = 3600 * 1000;
let nextId = 1;

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * HOUR).toISOString();
}

function textMessage(fields: Partial<MailMessage> & { subject: string; content: string }): MailMessage {
  const { content, ...rest } = fields;
  return {
    id: `mock-${nextId++}`,
    from: ME,
    toRecipients: [ME],
    ccRecipients: [],
    receivedDateTime: hoursAgo(1),
    isRead: true,
    isDraft: false,
    bodyPreview: content.split('\n').find(Boolean) ?? '',
    body: { contentType: 'text', content },
    ...rest,
  };
}

function buildInbox(): MailMessage[] {
  return INBOX_SUBJECTS.map((subject, index) => {
    const sender = PEOPLE[index % 5]!;
    const isPlainText = index % 4 === 3;
    if (isPlainText) {
      return textMessage({
        subject,
        content: PLAIN_TEXT_BODY,
        from: sender,
        toRecipients: [ME],
        isRead: index % 3 !== 0,
        receivedDateTime: hoursAgo(index * 6),
      });
    }
    return {
      id: `mock-${nextId++}`,
      subject,
      from: sender,
      toRecipients: [ME],
      ccRecipients: index === 0 ? [PEOPLE[5]!, PEOPLE[6]!] : [],
      receivedDateTime: hoursAgo(index * 6),
      isRead: index % 3 !== 0,
      isDraft: false,
      bodyPreview: 'เรียน คุณไกรสุวรรณ หยางทกูร สารบรรณ องค์กรสร้างสุข กลุ่มงานบริหารและบุคคล ได้ส่งเอกสารถึงตัวท่าน...',
      body: { contentType: 'html', content: OFFICIAL_LETTER_HTML(subject, sender.name) },
    };
  });
}

const store: Record<MailFolderKey, MailMessage[]> = {
  inbox: buildInbox(),
  drafts: [
    textMessage({
      subject: 'ขออนุมัติเดินทางไปราชการ กรุงเทพฯ 2-3 ต.ค.',
      content: 'เรียน หัวหน้างาน\n\nขออนุมัติเดินทางไปราชการเพื่อเข้าร่วมสัมมนา...',
      toRecipients: [PEOPLE[4]!],
      isDraft: true,
      receivedDateTime: hoursAgo(3),
    }),
    textMessage({
      subject: '',
      content: 'ร่างข้อความ ยังไม่ได้ระบุผู้รับ',
      toRecipients: [],
      isDraft: true,
      receivedDateTime: hoursAgo(30),
    }),
  ],
  sentitems: [
    textMessage({
      subject: 'RE: Reminder: การประชุมทีมพัฒนาระบบ ประจำสัปดาห์',
      content: 'รับทราบครับ จะเข้าร่วมตามเวลาครับ',
      toRecipients: [PEOPLE[8]!],
      receivedDateTime: hoursAgo(2),
    }),
    textMessage({
      subject: 'ส่งรายงานความคืบหน้าโครงการ เดือนกันยายน',
      content: 'เรียน อาจารย์ทุกท่าน\n\nแนบรายงานความคืบหน้าโครงการประจำเดือนมาพร้อมนี้ครับ',
      toRecipients: [PEOPLE[5]!, PEOPLE[6]!, PEOPLE[7]!],
      ccRecipients: [PEOPLE[0]!],
      receivedDateTime: hoursAgo(20),
    }),
    textMessage({
      subject: 'สอบถามการเบิกค่าเดินทาง',
      content: 'สวัสดีครับ ขอสอบถามขั้นตอนการเบิกค่าเดินทางไปราชการครับ',
      toRecipients: [PEOPLE[4]!],
      receivedDateTime: hoursAgo(50),
    }),
  ],
  deleteditems: [
    textMessage({
      subject: 'โปรโมชั่นร้านถ่ายเอกสารหน้ามหาวิทยาลัย',
      content: 'ลดราคาพิเศษ ถ่ายเอกสาร เข้าเล่ม ทำปก',
      from: { name: 'Copy Center', address: 'promo@copycenter.example' },
      receivedDateTime: hoursAgo(40),
    }),
    textMessage({
      subject: 'แจ้งเตือน: ระบบ e-Leave ปิดปรับปรุง (ยกเลิกแล้ว)',
      content: 'ประกาศนี้ถูกยกเลิก',
      from: PEOPLE[3]!,
      receivedDateTime: hoursAgo(100),
    }),
  ],
  junkemail: [
    textMessage({
      subject: 'Your mailbox is almost full — verify your account now',
      content: 'Click here to keep your mailbox active. Failure to verify within 24 hours will suspend your account.',
      from: { name: 'Mail Administrator', address: 'admin@psu-mail-verify.example' },
      isRead: false,
      receivedDateTime: hoursAgo(5),
    }),
    textMessage({
      subject: 'ยินดีด้วย! คุณได้รับรางวัล iPhone 17 Pro',
      content: 'กรอกข้อมูลเพื่อรับรางวัลภายในวันนี้',
      from: { name: 'Lucky Draw', address: 'win@lucky-prize.example' },
      receivedDateTime: hoursAgo(26),
    }),
  ],
};

// A little artificial latency so loading spinners, pull-to-refresh and the
// search indicator all have something real to show during UI work — an
// instant resolve would make every loading state impossible to check.
const MOCK_LATENCY_MS = 400;

function delay<T>(value: T, ms = MOCK_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function newestFirst(list: MailMessage[]) {
  return [...list].sort((a, b) => b.receivedDateTime.localeCompare(a.receivedDateTime));
}

function locate(id: string): { folder: MailFolderKey; index: number } | null {
  for (const folder of Object.keys(store) as MailFolderKey[]) {
    const index = store[folder].findIndex((message) => message.id === id);
    if (index !== -1) return { folder, index };
  }
  return null;
}

function matches(message: MailMessage, q: string) {
  const people = [message.from, ...message.toRecipients];
  return (
    message.subject.toLowerCase().includes(q) ||
    message.bodyPreview.toLowerCase().includes(q) ||
    people.some((person) => person.name.toLowerCase().includes(q) || person.address.toLowerCase().includes(q))
  );
}

export async function mockListMessages(
  folder: MailFolderKey,
  { filter = 'all', top = 25, cursor = 0 }: { filter?: MailReadFilter; top?: number; cursor?: number },
): Promise<{ messages: MailMessage[]; nextCursor?: number }> {
  const all = newestFirst(store[folder]).filter(
    (message) => filter === 'all' || message.isRead === (filter === 'read'),
  );
  const page = all.slice(cursor, cursor + top);
  const nextCursor = cursor + top < all.length ? cursor + top : undefined;
  return delay({ messages: page, nextCursor });
}

export async function mockSearchMessages(folder: MailFolderKey, query: string): Promise<{ messages: MailMessage[] }> {
  const q = query.trim().toLowerCase();
  if (!q) return delay({ messages: [] });
  return delay({ messages: newestFirst(store[folder]).filter((message) => matches(message, q)) });
}

export async function mockGetMessage(id: string): Promise<MailMessage> {
  const found = locate(id);
  if (!found) throw new Error('ไม่พบอีเมลที่เลือก (mock)');
  return delay(store[found.folder][found.index]!);
}

export async function mockInboxUnreadCount(): Promise<number> {
  return delay(store.inbox.filter((message) => !message.isRead).length, 150);
}

export async function mockMarkRead(id: string): Promise<void> {
  const found = locate(id);
  if (found) store[found.folder][found.index] = { ...store[found.folder][found.index]!, isRead: true };
  return delay(undefined, 150);
}

function removeDraft(draftId?: string) {
  if (!draftId) return;
  store.drafts = store.drafts.filter((message) => message.id !== draftId);
}

export async function mockSend(payload: ComposePayload): Promise<void> {
  let content = payload.body;
  if (payload.sourceId && payload.mode !== 'new' && payload.mode !== 'draft') {
    const found = locate(payload.sourceId);
    const original = found ? store[found.folder][found.index] : undefined;
    if (original) {
      content += `\n\n----- ข้อความเดิม -----\nจาก: ${original.from.name} <${original.from.address}>\n${original.bodyPreview}`;
    }
  }

  removeDraft(payload.draftId);
  store.sentitems.unshift(
    textMessage({
      subject: payload.subject,
      content,
      toRecipients: payload.to,
      ccRecipients: payload.cc,
      receivedDateTime: new Date().toISOString(),
    }),
  );
  return delay(undefined, 700);
}

export async function mockSaveDraft(payload: ComposePayload): Promise<string> {
  const existing = payload.draftId ? store.drafts.find((message) => message.id === payload.draftId) : undefined;
  const draft = textMessage({
    subject: payload.subject,
    content: payload.keepBody && existing?.body ? existing.body.content : payload.body,
    toRecipients: payload.to,
    ccRecipients: payload.cc,
    isDraft: true,
    receivedDateTime: new Date().toISOString(),
    ...(existing ? { id: existing.id } : {}),
  });
  removeDraft(existing?.id);
  store.drafts.unshift(draft);
  return delay(draft.id, 500);
}

export async function mockDeleteDraft(draftId: string): Promise<void> {
  const draft = store.drafts.find((message) => message.id === draftId);
  removeDraft(draftId);
  if (draft) store.deleteditems.unshift(draft);
  return delay(undefined, 300);
}

export async function mockSuggestRecipients(term: string): Promise<MailRecipient[]> {
  const q = term.trim().toLowerCase();
  if (!q) return [];
  return delay(
    PEOPLE.filter((person) => person.name.toLowerCase().includes(q) || person.address.toLowerCase().includes(q)).slice(0, 8),
    200,
  );
}
