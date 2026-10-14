/**
 * Every demo route, matched in order (first hit wins). Gateway routes match
 * the path after API_BASE_URL; routes for another host match `//host/path`.
 */
import { DEMO_DEPT, DEMO_NAME, DEMO_POSITION, addDays, ok, ymd, type DemoRoute } from './helpers';
import { absenceRoutes } from './absence';
import { bookingRoomRoutes } from './bookingRoom';
import { meetingExamRoutes } from './meetingExam';
import { noticeRepairRoutes } from './noticeRepair';
import { repairComputerRoutes } from './repairComputer';
import { timestampRoutes } from './timestamp';

export type { DemoRequest, DemoRoute } from './helpers';

const people = [
  { UNI_STAFF_ID: '0999911', P_NAME_TH: 'ผศ.', FNAME_TH: 'วิภา', SNAME_TH: 'ตัวอย่าง', DEPT_NAME_TH: DEMO_DEPT, OFFICE_TEL: '1101' },
  { UNI_STAFF_ID: '0999921', P_NAME_TH: 'นาย', FNAME_TH: 'ประเสริฐ', SNAME_TH: 'ทดสอบ', DEPT_NAME_TH: DEMO_DEPT, OFFICE_TEL: '1102' },
  { UNI_STAFF_ID: '0999922', P_NAME_TH: 'นางสาว', FNAME_TH: 'กมลา', SNAME_TH: 'ตัวอย่าง', DEPT_NAME_TH: 'งานบริหารทั่วไป', OFFICE_TEL: '1103' },
  { UNI_STAFF_ID: '0999912', P_NAME_TH: 'นาง', FNAME_TH: 'สมศรี', SNAME_TH: 'ทดสอบ', DEPT_NAME_TH: 'งานบริหารทั่วไป', OFFICE_TEL: '1104' },
];

const profile = {
  P_NAME_TH: 'นาย',
  FNAME_TH: 'สมชาย',
  SNAME_TH: 'ใจดี',
  P_SNAME_ENG: 'Mr.',
  FNAME_ENG: 'Somchai',
  SNAME_ENG: 'Jaidee',
  POSITION_NAME_TH: DEMO_POSITION,
  POSITION_NAME_ENG: 'Computer Technical Officer',
  DEPT_NAME_TH: DEMO_DEPT,
  EMAIL: 'demo.reviewer@example.com',
  OFFICE_TEL: '1100',
};

const DEMO_CALENDAR_ID = 'demo-executive-calendar';

function calendarEvents() {
  const at = (days: number, hour: number) => {
    const d = addDays(days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  return [
    { id: 'e1', summary: 'ประชุมคณะกรรมการประจำคณะ', start: { dateTime: at(0, 9) }, end: { dateTime: at(0, 12) }, location: 'ห้องประชุมใหญ่', status: 'confirmed' },
    { id: 'e2', summary: 'ต้อนรับคณะผู้เยี่ยมชมจากต่างประเทศ', start: { dateTime: at(2, 13) }, end: { dateTime: at(2, 15) }, location: 'อาคารสำนักงาน', status: 'confirmed' },
    { id: 'e3', summary: 'พิธีมอบรางวัลบุคลากรดีเด่น', start: { date: ymd(addDays(6)) }, end: { date: ymd(addDays(7)) }, location: 'หอประชุม', status: 'confirmed' },
  ];
}

const coreRoutes: DemoRoute[] = [
  [/\/api\/health$/, () => ({ data: { status: 'ok', service: 'scooba-service' } })],
  [/\/api\/staff-info$/, () => ok({
    staffId: '',
    name: DEMO_NAME,
    facultyId: '2',
    facultyName: 'คณะวิศวกรรมศาสตร์',
    departmentName: DEMO_DEPT,
    campusId: '1',
    positionId: '1',
    positionName: DEMO_POSITION,
    isLecturer: false,
    stampRole: 'staff',
    isCompOtEligible: false,
    eligible: true,
    reason: 'eligible',
  })],
  [/\/api\/active-summary$/, () => {
    const today = ymd(new Date());
    return ok({
      repairComputer: { success: true, role: 'user', tasks: [{ key: 'user-current-job', count: 1 }] },
      noticeRepair: { success: true, tasks: [{ key: 'informer-current', count: 2 }] },
      absence: { success: true, pending: [{ id: '5003' }], cancelled: [] },
      meeting: { success: true, items: [{ id: '601' }], date: today },
      timestamp: { success: true, items: [], year: new Date().getFullYear() },
      bookingRoom: { success: true, items: [], date: today },
      lectTimestamp: { success: true, isLecturer: false, stamped: false, date: today },
    });
  }],
  // Mail reads a real Microsoft 365 inbox, which a demo account does not have.
  [/\/api\/mail\/status$/, () => ({
    status: 503,
    body: { error: { name: 'ModuleDisabled', message: 'บัญชีทดสอบไม่มีกล่องอีเมล PSU Mail' } },
  })],
  [/\/api\/person\/search$/, ({ query }) => {
    const word = (query.searchword ?? '').trim();
    return ok(people.filter((p) => `${p.FNAME_TH} ${p.SNAME_TH} ${p.DEPT_NAME_TH}`.includes(word) || word.length < 2));
  }],
  [/\/api\/my-profile$/, () => ok(profile), 'GET'],
  [/\/api\/exec-calendars$/, () => ({
    data: [{ attributes: { name: 'คณบดี', source: DEMO_CALENDAR_ID, UNI_ID: '0999901' } }],
  })],
  [/^\/\/www\.googleapis\.com\/calendar\/v3\/calendars\/[^/]+\/events$/, () => ({ items: calendarEvents() })],
];

export const DEMO_ROUTES: DemoRoute[] = [
  ...coreRoutes,
  ...timestampRoutes,
  ...absenceRoutes,
  ...noticeRepairRoutes,
  ...repairComputerRoutes,
  ...meetingExamRoutes,
  ...bookingRoomRoutes,
];
