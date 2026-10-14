/**
 * การประชุม and ตารางคุมสอบ — today's and upcoming meetings with an agenda,
 * and two invigilation duties next week. Agenda items carry no PDF: there is
 * no real document to show.
 */
import { addDays, ok, weekdayOnOrBefore, ymd, type DemoRoute } from './helpers';

function meeting(id: number, name: string, date: Date, time: string, room: string, no: string) {
  return {
    id: String(id),
    m_id: String(id),
    main_id: String(id),
    name,
    m_lastdate: ymd(date),
    meetingTime: time,
    room,
    m_no: no,
  };
}

const today = () => [
  meeting(601, 'ประชุมคณะกรรมการประจำภาควิชา', new Date(), '13:30 - 15:30', 'ห้องประชุม 1 อาคารสำนักงาน', 'ครั้งที่ 10/2569'),
];

const incoming = () => [
  meeting(602, 'ประชุมคณะทำงานพัฒนาระบบสารสนเทศ', weekdayOnOrBefore(addDays(3)), '09:30 - 11:00', 'ห้องประชุม 2 อาคารสำนักงาน', 'ครั้งที่ 4/2569'),
  meeting(603, 'ประชุมบุคลากรสายสนับสนุน', weekdayOnOrBefore(addDays(8)), '14:00 - 16:00', 'ห้องประชุมใหญ่', 'ครั้งที่ 3/2569'),
];

const past = () => [
  meeting(600, 'ประชุมคณะกรรมการประจำภาควิชา', weekdayOnOrBefore(addDays(-27)), '13:30 - 15:30', 'ห้องประชุม 1 อาคารสำนักงาน', 'ครั้งที่ 9/2569'),
];

const topics = [
  { record_id: 1, index: '1', topic: 'เรื่องที่ประธานแจ้งให้ที่ประชุมทราบ', has_pdf: false, subtopics: [] },
  { record_id: 2, index: '2', topic: 'รับรองรายงานการประชุมครั้งที่ผ่านมา', has_pdf: false, subtopics: [] },
  {
    record_id: 3,
    index: '3',
    topic: 'เรื่องเพื่อพิจารณา',
    has_pdf: false,
    subtopics: [
      { record_id: 31, index: '3.1', topic: 'แผนการจัดซื้อครุภัณฑ์ประจำปี', has_pdf: false, items: [] },
      { record_id: 32, index: '3.2', topic: 'การปรับปรุงห้องปฏิบัติการคอมพิวเตอร์', has_pdf: false, items: [] },
    ],
  },
  { record_id: 4, index: '4', topic: 'เรื่องอื่น ๆ', has_pdf: false, subtopics: [] },
];

function examParams() {
  const now = new Date();
  const year = String(now.getFullYear());
  return { year, year_be: String(now.getFullYear() + 543), term: '1', period: 'final' as const };
}

const exams = () => [
  { room_id: 'R101', room: 'อาคารเรียนรวม 101', date: ymd(weekdayOnOrBefore(addDays(6))), time_from: '09:00', time_to: '12:00', period: 'final', status: '0' },
  { room_id: 'R204', room: 'อาคารเรียนรวม 204', date: ymd(weekdayOnOrBefore(addDays(8))), time_from: '13:30', time_to: '16:30', period: 'final', status: '0' },
];

export const meetingExamRoutes: DemoRoute[] = [
  [/\/api\/meeting\/topics$/, () => ok(topics)],
  [/\/api\/meeting$/, ({ query }) => ok(query.type === 't' ? today() : query.type === 'c' ? incoming() : past())],
  [/\/api\/examinar\/rounds$/, () => {
    const p = examParams();
    const round = { time_id: 1, ...p, label: `ปลายภาค ${p.term}/${p.year_be}`, announced: true, has_duty: true };
    return ok({ current: round, default: round, rounds: [round] });
  }],
  [/\/api\/examinar\/detail$/, ({ query }) => {
    const exam = exams().find((e) => e.room_id === query.room_id) ?? exams()[0];
    return ok({
      ...exam,
      ...examParams(),
      class_data: [
        { subject_key: '1', subject_id: '242-101', subject_name: 'การเขียนโปรแกรมคอมพิวเตอร์', section: '01', std_count: 48 },
      ],
      staff_data: [
        { staff_id: '', name: 'สมชาย ใจดี', department: 'ภาควิชาวิศวกรรมคอมพิวเตอร์' },
        { staff_id: '0999931', name: 'อ.ประเสริฐ ทดสอบ', department: 'ภาควิชาวิศวกรรมไฟฟ้า' },
      ],
    });
  }],
  [/\/api\/examinar$/, () => ({ ...ok(exams()), announced: true })],
];
