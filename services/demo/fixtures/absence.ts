/**
 * การลา — leave forms (with an approver and stand-in list), one request
 * waiting for approval, a short history, and the year's leave statistics.
 */
import { DEMO_DEPT, DEMO_NAME, addDays, ok, saved, weekdayOnOrBefore, ymd, type DemoRoute } from './helpers';

const approverList = [
  { staffId: '0999911', uniStaffId: '0999911', positionId: '9101', prefixNameTH: 'ผศ.', firstNameTH: 'วิภา', lastNameTH: 'ตัวอย่าง', positionName: 'หัวหน้าภาควิชา' },
  { staffId: '0999912', uniStaffId: '0999912', positionId: '9102', prefixNameTH: 'นาง', firstNameTH: 'สมศรี', lastNameTH: 'ทดสอบ', positionName: 'หัวหน้างานบริหารทั่วไป' },
];

const agentList = [
  { staffId: '0999921', uniStaffId: '0999921', prefixNameTH: 'นาย', firstNameTH: 'ประเสริฐ', lastNameTH: 'ทดสอบ', positionName: 'นักวิชาการคอมพิวเตอร์' },
  { staffId: '0999922', uniStaffId: '0999922', prefixNameTH: 'นางสาว', firstNameTH: 'กมลา', lastNameTH: 'ตัวอย่าง', positionName: 'เจ้าหน้าที่บริหารงานทั่วไป' },
];

const init = (type: string) => ({
  staffId: '',
  name: DEMO_NAME,
  deptId: '9001',
  deptName: DEMO_DEPT,
  step: '1',
  absenceStatus: '0',
  absentTime: '1',
  writeDate: ymd(new Date()),
  type,
  approverList,
  agentList,
});

function leave(id: string, type: string, typeName: string, start: Date, end: Date, statusName: string, status: string, reason: string) {
  return {
    id,
    absentType: type,
    absentTypeName: typeName,
    startDate: ymd(start),
    endDate: ymd(end),
    writeDate: ymd(addDays(-1, start)),
    statusName,
    status,
    reason,
    approverName: 'ผศ.วิภา ตัวอย่าง',
    approverPositionName: 'หัวหน้าภาควิชา',
    name: DEMO_NAME,
    contact: '08x-xxx-xxxx',
    partFlag: '0',
    days: Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
  };
}

const waiting = () =>
  leave('5003', '4', 'ลาพักผ่อน', weekdayOnOrBefore(addDays(9)), weekdayOnOrBefore(addDays(10)), 'รออนุมัติ', '0', 'พักผ่อนประจำปี');

const history = () => [
  leave('5002', '1', 'ลาป่วย', weekdayOnOrBefore(addDays(-8)), weekdayOnOrBefore(addDays(-8)), 'อนุมัติ', '1', 'มีไข้ พักฟื้นที่บ้าน'),
  leave('5001', '2', 'ลากิจส่วนตัว', weekdayOnOrBefore(addDays(-30)), weekdayOnOrBefore(addDays(-29)), 'อนุมัติ', '1', 'ติดต่อธุระราชการ'),
];

function stats() {
  const now = new Date();
  const budgetStart = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    staffId: '',
    servantAge: 9,
    budgetStartDate: `${budgetStart}-10-01`,
    budgetEndDate: `${budgetStart + 1}-09-30`,
    absenceLimitCount: 23,
    absenceLimitDays: 60,
    absenceUsedCount: 2,
    absenceUsedDays: 3,
    sickUsedCount: 1,
    sickUsedDays: 1,
    businessUsedCount: 1,
    businessUsedDays: 2,
    birthUsedCount: 0,
    relaxStoreDays: 10,
    relaxTotalYearDays: 20,
    relaxUsedDays: 0,
    relaxRemainDays: 30,
    relaxLimitDays: 30,
    lateLimitCount: 9,
    lateUsedCount: 1,
  };
}

export const absenceRoutes: DemoRoute[] = [
  [/\/api\/absence\/init$/, ({ query }) => ok(init(query.type ?? ''))],
  [/\/api\/absence\/waiting$/, () => ({ ...ok(null), remain: waiting(), cancel: null })],
  [/\/api\/absence\/history$/, () => ok(history())],
  [/\/api\/absence\/stats$/, () => ok(stats())],
  [/\/api\/absence\/approving$/, () => ({ ...ok([]), show: false })],
  [/\/api\/absence\/approving-history$/, () => ok([])],
  [/\/api\/absence$/, ({ query }) => {
    const item = [waiting(), ...history()].find((row) => row.id === query.id);
    return ok(item ? { ...item, approverList, agentList } : null);
  }, 'GET'],
  [/\/api\/absence$/, () => saved()],
];
