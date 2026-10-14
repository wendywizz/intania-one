/**
 * การลงเวลา — the demo account is general staff (stampRole 'staff'), so the
 * reviewer sees the face-scan stamp: the camera, the blink, and the result.
 * The scan always passes and the stamp is held in memory for the session.
 */
import {
  DEMO_DEPT,
  DEMO_NAME,
  DEMO_POSITION,
  addDays,
  hms,
  ok,
  pad,
  saved,
  weekdayOnOrBefore,
  ymd,
  type DemoRoute,
} from './helpers';

const FENCE_RADIUS_M = 300;
const DEMO_DISTANCE_M = 42;

/** Today's stamp, as the face scans so far have left it. */
const today = { date: '', inTime: '', outTime: '' };

function todayStamp() {
  const date = ymd(new Date());
  if (today.date !== date) {
    today.date = date;
    today.inTime = '';
    today.outTime = '';
  }
  return today;
}

function staffStatus(created = false) {
  const now = new Date();
  const stamp = todayStamp();
  const weekend = now.getDay() === 0 || now.getDay() === 6;
  const done = Boolean(stamp.inTime && stamp.outTime);
  const kind = stamp.inTime ? 'out' : 'in';

  return {
    staffId: '',
    role: 'staff',
    isStaff: true,
    stamp: stamp.inTime ? { date: stamp.date, inTime: stamp.inTime, outTime: stamp.outTime, isLate: false } : null,
    nextStamp: done ? '' : kind,
    stampKind: done ? '' : kind,
    needsConfirm: false,
    confirmMessage: '',
    outFrom: '16:30',
    canStamp: !done && !weekend,
    distanceM: DEMO_DISTANCE_M,
    radiusM: FENCE_RADIUS_M,
    atSite: true,
    reason: weekend ? 'weekend' : done ? 'already_complete' : '',
    message: weekend
      ? 'วันนี้เป็นวันหยุด ไม่ต้องลงเวลา'
      : done
        ? 'ลงเวลาครบแล้วสำหรับวันนี้'
        : 'อยู่ในพื้นที่คณะ พร้อมลงเวลา',
    faceRegistered: true,
    faceEnroll: { remaining: 3, dryRun: false },
    created,
    serverDate: ymd(now),
    serverTime: hms(now),
  };
}

function calendarDays(year: number, month: number) {
  const now = new Date();
  const last = new Date(year, month, 0).getDate();
  const days = [];
  for (let d = 1; d <= last; d++) {
    const date = new Date(year, month - 1, d);
    const weekday = date.getDay();
    const row: Record<string, unknown> = { date: ymd(date), day: d, inTime: '', outTime: '', status: '', note: '' };
    const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isToday = ymd(date) === ymd(now);

    if (weekday !== 0 && weekday !== 6 && isPast) {
      row.inTime = `08:${pad(2 + ((d * 7) % 26))}`;
      row.outTime = `16:${pad(31 + ((d * 5) % 25))}`;
      if (d % 11 === 6) {
        row.inTime = '08:47';
        row.isLate = true;
      }
      if (d % 13 === 8) {
        row.outTime = '';
        row.status = 'incomplete';
        row.canRequest = true;
      }
      if (d % 17 === 2) {
        row.inTime = '';
        row.outTime = '';
        row.isLeave = true;
        row.leaveType = '4';
      }
    } else if (isToday) {
      const stamp = todayStamp();
      row.inTime = stamp.inTime.slice(0, 5);
      row.outTime = stamp.outTime.slice(0, 5);
    }
    days.push(row);
  }
  return days;
}

const forgotDay = () => ymd(weekdayOnOrBefore(addDays(-1)));

const history = () => [
  {
    forget_id: '7001',
    stamp_date: ymd(weekdayOnOrBefore(addDays(-12))),
    stamp_type: 'out',
    status: '1',
    reason: 'ลืมสแกนออกเนื่องจากออกไปประชุมนอกคณะ',
    approve_name: 'หัวหน้างาน ตัวอย่าง',
  },
  {
    forget_id: '7002',
    stamp_date: ymd(weekdayOnOrBefore(addDays(-25))),
    stamp_type: 'in',
    status: '1',
    reason: 'เครื่องสแกนหน้าอาคารขัดข้อง',
    approve_name: 'หัวหน้างาน ตัวอย่าง',
  },
];

const recordDetail = (forgetId: string) => {
  const item = history().find((h) => h.forget_id === forgetId) ?? history()[0];
  return {
    forgetId: item.forget_id,
    approveId: '1',
    name: DEMO_NAME,
    fullname: DEMO_NAME,
    positionName: DEMO_POSITION,
    deptName: DEMO_DEPT,
    approverName: item.approve_name,
    approverPositionName: 'หัวหน้างาน',
    approveName: item.approve_name,
    stampType: item.stamp_type,
    stampDate: item.stamp_date,
    writeDate: item.stamp_date,
    inTime: item.stamp_type === 'in' ? '08:15' : null,
    outTime: item.stamp_type === 'out' ? '16:40' : null,
    reason: item.reason,
    status: '1',
    statusName: 'อนุมัติ',
    decisionDate: item.stamp_date,
    decisionReason: null,
  };
};

export const timestampRoutes: DemoRoute[] = [
  [/\/api\/timestamp\/staff\/stamp$/, () => {
    const stamp = todayStamp();
    const now = hms(new Date());
    if (!stamp.inTime) stamp.inTime = now;
    else if (!stamp.outTime) stamp.outTime = now;
    return ok({
      passed: true,
      reason: '',
      message: 'ลงเวลาเรียบร้อย',
      similarity: 0.93,
      status: staffStatus(true),
      created: true,
      dryRun: false,
    });
  }, 'POST'],
  [/\/api\/timestamp\/staff\/face-enroll$/, () =>
    ok({ enrolled: true, reason: '', message: 'ลงทะเบียนใบหน้าเรียบร้อย', remaining: 2, dryRun: false }), 'POST'],
  [/\/api\/timestamp\/staff$/, () => ok(staffStatus())],
  [/\/api\/timestamp\/calendar$/, ({ query }) => {
    const now = new Date();
    const year = Number(query.year) || now.getFullYear();
    const month = Number(query.month) || now.getMonth() + 1;
    return ok({ year, month, days: calendarDays(year, month) });
  }],
  [/\/api\/timestamp\/history$/, () => ok(history())],
  [/\/api\/timestamp\/(detail|view)$/, ({ query }) => ok(recordDetail(query.forget_id || query.id || ''))],
  [/\/api\/timestamp\/init$/, ({ query }) =>
    ok({ staff_id: query.staff_id, timestamp: query.timestamp, type: query.type, in_time: '08:20', out_time: '' })],
  [/\/api\/timestamp\/waiting$/, () => ({ ...ok([]), show: false })],
  [/\/api\/timestamp\/approved$/, () => ok([])],
  [/\/api\/timestamp$/, () => ok([{ date: forgotDay(), stamp_type: 'out', is_edit: true, status: '0' }]), 'GET'],
  [/\/api\/timestamp$/, () => saved()],
];
