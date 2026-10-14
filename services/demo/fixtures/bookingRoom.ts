/**
 * จองห้อง — computer-lab booking (by day, by term, by period) and
 * meeting-room requests. The demo account teaches one subject so every lab
 * booking form has something to book for; every room is free.
 */
import { DEMO_NAME, addDays, ok, pad, weekdayOnOrBefore, ymd, type DemoRoute } from './helpers';

const rooms = [
  { id: '1', name: 'ห้องปฏิบัติการคอมพิวเตอร์ 101', capacity: 60, projector: true, mic: true, status: '1', building_id: '1' },
  { id: '2', name: 'ห้องปฏิบัติการคอมพิวเตอร์ 204', capacity: 40, projector: true, mic: false, status: '1', building_id: '1' },
  { id: '3', name: 'ห้องปฏิบัติการคอมพิวเตอร์ 305', capacity: 30, projector: true, mic: false, status: '1', building_id: '2' },
];

function term() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 28);
  return { term: '1', year: String(now.getFullYear() + 543), startdate: ymd(start), enddate: ymd(end) };
}

const subjects = () => [
  { subject_id: '242-101', subject_name: 'การเขียนโปรแกรมคอมพิวเตอร์', section: '01', term: '1', year: term().year, subj_key: 'S242101' },
];

const times = (() => {
  const out: string[] = [];
  for (let h = 8; h <= 20; h++) {
    out.push(`${pad(h)}:00`, `${pad(h)}:30`);
  }
  return out;
})();

function weekOf(dateText?: string) {
  const base = dateText ? new Date(`${dateText}T00:00:00`) : new Date();
  const monday = addDays(-((base.getDay() + 6) % 7), base);
  return Array.from({ length: 7 }, (_, i) => ymd(addDays(i, monday)));
}

const booking = (id: number, date: string, start: string, end: string, subject: string, section: string, teacher: string, color: string, booker: string) => ({
  detail_id: id, book_id: id, date, start_time: start, end_time: end, subject_id: subject, section,
  objective: '', teacher, bgcolor: color, term: '1', year: term().year, booker_name: booker,
});

const daysInfo = () => [
  { day: '2', label: 'จันทร์', date_count: 12, past_count: 4, first_date: term().startdate, last_date: term().enddate },
  { day: '4', label: 'พุธ', date_count: 12, past_count: 4, first_date: term().startdate, last_date: term().enddate },
];

const myBooking = () => {
  const date = ymd(weekdayOnOrBefore(addDays(4)));
  return {
    book_id: 4401,
    booktype: { id: 1, code: 'DAY' as const, label: 'จองรายวัน' },
    subject_id: '242-101',
    subj_key: 'S242101',
    section: '01',
    term: '1',
    year: term().year,
    objective: 'สอบปฏิบัติการเขียนโปรแกรม',
    teacher: DEMO_NAME,
    bgcolor: '#3498DB',
    software: '',
    booked_at: `${ymd(addDays(-2))} 10:00:00`,
    start_date: date,
    end_date: date,
    first_date: date,
    last_date: date,
    slot_count: 1,
    rooms: [rooms[0].name],
  };
};

const createdDays = (input: Record<string, unknown>) =>
  (Array.isArray(input.days) ? input.days : []).map((d: Record<string, unknown>) => ({
    day: String(d.day ?? ''),
    label: daysInfo().find((x) => x.day === d.day)?.label ?? '',
    start_time: String(d.start_time ?? ''),
    end_time: String(d.end_time ?? ''),
    room: rooms.find((r) => r.id === d.room_id) ?? rooms[0],
    date_count: 12,
  }));

// ── meeting rooms ───────────────────────────────────────────────────────────

const meetingRooms = [
  { id: 11, name: 'ห้องประชุม 1 อาคารสำนักงาน', sname: 'ห้องประชุม 1', arrangements: [{ room_id: '11', type: 1, capacity: 20, detail: 'โต๊ะประชุม' }] },
  { id: 12, name: 'ห้องประชุมใหญ่', sname: 'ห้องประชุมใหญ่', arrangements: [{ room_id: '12', type: 1, capacity: 120, detail: 'แบบเธียเตอร์' }, { room_id: '12', type: 2, capacity: 60, detail: 'แบบห้องเรียน' }] },
];

const meetingRequest = () => {
  const date = ymd(weekdayOnOrBefore(addDays(5)));
  return {
    order_id: 3301,
    detail: 'ประชุมคณะทำงานพัฒนาระบบสารสนเทศ',
    type_id: 1,
    type_name: 'ประชุม',
    total_man: 12,
    total_day: 1,
    room_id: 11,
    room_name: meetingRooms[0].name,
    status: 1,
    status_label: 'รออนุมัติ',
    startdate: date,
    enddate: date,
    request_date: ymd(addDays(-1)),
    comment: '',
  };
};

export const bookingRoomRoutes: DemoRoute[] = [
  [/\/api\/booking-room\/rooms$/, () => ok(rooms)],
  [/\/api\/booking-room\/schedule$/, ({ query }) => {
    const dates = weekOf(query.date);
    const room = rooms.find((r) => r.id === query.room_id) ?? rooms[0];
    return ok({
      room,
      week: { start: dates[0], end: dates[6], dates },
      grid: { start_hour: 7, end_hour: 21, slot_minutes: 30 },
      bookings: [
        booking(1, dates[0], '08:30', '10:30', '242-101', '01', 'อ.วิภา ตัวอย่าง', '#3498DB', 'วิภา ตัวอย่าง'),
        booking(2, dates[1], '13:00', '15:00', '242-214', '02', 'อ.ประเสริฐ ทดสอบ', '#2ECC71', 'ประเสริฐ ทดสอบ'),
        booking(3, dates[2], '09:00', '12:00', '242-330', '01', 'อ.กมลา ตัวอย่าง', '#9B59B6', 'กมลา ตัวอย่าง'),
        booking(4, dates[3], '15:30', '17:00', 'กิจกรรมชมรม', '', '', '#F1C40F', DEMO_NAME),
      ],
    });
  }],
  [/\/api\/booking-room\/my-bookings$/, ({ query }) => ok(query.scope === 'history' ? [] : [myBooking()])],
  [/\/api\/booking-room\/my-bookings\/detail$/, () => {
    const b = myBooking();
    return ok({
      ...b,
      owner: { id: '', username: 'appreview', fullname: DEMO_NAME },
      can_delete: true,
      slots: [{ detail_id: 4402, room_id: rooms[0].id, room_name: rooms[0].name, date: b.first_date, start_time: '13:00', end_time: '16:00' }],
    });
  }],
  [/\/api\/booking-room\/my-bookings\/delete$/, ({ body }) => ok({ book_id: Number(body.book_id) || 0, slot_count: 1 })],
  [/\/api\/booking-room\/my-bookings\/delete-slot$/, ({ body }) =>
    ok({ detail_id: Number(body.detail_id) || 0, book_id: 4401, remaining: 0, booking_deleted: true })],
  [/\/api\/booking-room\/book\/options$/, () =>
    ok({ term: term(), subjects: subjects(), times, teacher: DEMO_NAME, default_color: '#3498DB' })],
  [/\/api\/booking-room\/book\/check-date$/, ({ query }) => {
    const d = new Date(`${query.date}T00:00:00`);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    return ok({ bookable: true, reason: '', message: '', holiday_name: '', is_weekend: weekend });
  }],
  [/\/api\/booking-room\/book\/rooms$/, () => ok(rooms.map((r) => ({ ...r, available: true })))],
  [/\/api\/booking-room\/book\/create$/, ({ body }) => {
    const room = rooms.find((r) => r.id === body.room_id) ?? rooms[0];
    return ok({ book_id: 4410, date: body.date, start_time: body.start_time, end_time: body.end_time, room: { id: room.id, name: room.name } });
  }],
  [/\/api\/booking-room\/book\/term-options$/, () =>
    ok({ term: term(), days: daysInfo(), subjects: subjects(), times, teacher: DEMO_NAME, default_color: '#3498DB' })],
  [/\/api\/booking-room\/book\/(term|period)-rooms$/, () =>
    ok(rooms.map((r) => ({ ...r, available: true, shareable: false, conflicts: [] })))],
  [/\/api\/booking-room\/book\/term-create$/, ({ body }) => {
    const days = createdDays(body);
    return ok({ book_id: 4411, term: term(), slot_count: days.length * 12, days });
  }],
  [/\/api\/booking-room\/book\/period-options$/, () =>
    ok({ term: term(), subjects: subjects(), times, teacher: DEMO_NAME, default_color: '#3498DB', max_days: 120 })],
  [/\/api\/booking-room\/book\/period-days$/, ({ query }) => {
    const start = new Date(`${query.start_date}T00:00:00`);
    const end = new Date(`${query.end_date}T00:00:00`);
    const span = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    return ok({ ok: true, reason: '', message: '', day_span: span, days: daysInfo(), total: 8 });
  }],
  [/\/api\/booking-room\/book\/period-create$/, ({ body }) => {
    const days = createdDays(body);
    return ok({ book_id: 4412, start_date: body.start_date, end_date: body.end_date, slot_count: days.length * 4, days });
  }],

  [/\/api\/meeting-room\/options$/, () => ok({
    requester: { staff_id: 0, name: DEMO_NAME, dept_id: '9001' },
    request_types: [{ id: 1, name: 'ประชุม' }, { id: 2, name: 'สัมมนา / อบรม' }],
    rooms: meetingRooms,
    things_audio: [{ id: 1, detail: 'ไมโครโฟน' }, { id: 2, detail: 'โปรเจกเตอร์' }],
    things_food: [{ id: 3, detail: 'อาหารว่าง' }, { id: 4, detail: 'น้ำดื่ม' }],
    leaders: [{ staff_id: 0, uni_staff_id: null, name: 'ผศ.วิภา ตัวอย่าง' }],
  })],
  [/\/api\/meeting-room\/availability$/, () => ok({ available: true })],
  [/\/api\/meeting-room\/week$/, ({ query }) => {
    const dates = weekOf(query.date);
    const room = meetingRooms.find((r) => String(r.id) === query.room_id) ?? meetingRooms[0];
    return ok({
      room: { id: room.id, name: room.name },
      week: { start: dates[0], end: dates[6], dates },
      bookings: [{ date: dates[1], start_time: '09:00', end_time: '12:00', title: 'ประชุมคณะกรรมการบริหาร', requester: 'งานบริหารทั่วไป' }],
    });
  }],
  [/\/api\/meeting-room\/list$/, ({ query }) => ok(query.scope === 'history' ? [] : [meetingRequest()])],
  [/\/api\/meeting-room\/detail$/, () => {
    const r = meetingRequest();
    return ok({
      ...r,
      dates: [{ count: 1, date: r.startdate, start_time: '09:30', end_time: '11:00', status: 1 }],
      things: [{ thing_id: 1, thing_type: 1, total: 2, name: 'ไมโครโฟน' }],
      leader_name: 'ผศ.วิภา ตัวอย่าง',
    });
  }],
  [/\/api\/meeting-room\/create$/, () => ok({ order_id: 3302 })],
  [/\/api\/meeting-room\/cancel$/, () => ok({ result: 'cancelled' })],
];
