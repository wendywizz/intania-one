/*
 * Sample data for the store screenshots. Loaded BEFORE mock-api.js, so it only
 * declares window.__FIXTURES__ and window.__routes__; mock-api.js does the
 * answering. Everything here is invented — names, ids, rooms, news.
 */
(() => {
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const day = (n) => { const d = new Date(now); d.setDate(d.getDate() + n); return d; };
  const rfc = (d) => d.toUTCString().replace('GMT', '+0000');

  window.__FIXTURES__ = {
    news: [
      { title: 'ประกาศ: ปรับปรุงระบบไฟฟ้าอาคารเรียนรวม ช่วงวันหยุดสุดสัปดาห์', link: 'https://example.com/n/1', guid: 'n1', description: '', category: 'ประกาศ', pubDate: rfc(day(-1)) },
      { title: 'เชิญร่วมกิจกรรมสัมมนาวิชาการประจำปีของคณะ', link: 'https://example.com/n/2', guid: 'n2', description: '', category: 'กิจกรรม', pubDate: rfc(day(-3)) },
      { title: 'แจ้งกำหนดการตรวจสุขภาพประจำปีสำหรับบุคลากร', link: 'https://example.com/n/3', guid: 'n3', description: '', category: 'ประกาศ', pubDate: rfc(day(-5)) },
    ],
    activeSummary: {
      repairComputer: { success: true, role: 'user', tasks: [{ key: 'user-current-job', count: 1 }] },
      noticeRepair: { success: true, tasks: [{ key: 'informer-current', count: 2 }] },
      absence: { success: true, pending: [{ id: 1 }], cancelled: [] },
      meeting: { success: true, items: [{ id: 1 }, { id: 2 }], date: ymd(now) },
      timestamp: { success: true, items: [], year: now.getFullYear() },
      bookingRoom: { success: true, items: [{ id: 1 }], date: ymd(now) },
      lectTimestamp: { success: true, isLecturer: false, stamped: false, date: ymd(now) },
    },
  };
  const ok = (data) => ({ success: true, message: '', data, total_count: Array.isArray(data) ? data.length : undefined });

  // ── Timestamp calendar: the current month, built from today's date ─────────
  const calendarDays = () => {
    const y = now.getFullYear(), m = now.getMonth();
    const last = new Date(y, m + 1, 0).getDate();
    const out = [];
    for (let d = 1; d <= last; d++) {
      const date = new Date(y, m, d);
      const wd = date.getDay();
      const row = { date: ymd(date), day: d, inTime: '', outTime: '', status: '', note: '' };
      // Real Thai public holidays that fall in October.
      if (m === 9 && d === 13) { row.isHoliday = true; row.holidayName = 'วันคล้ายวันสวรรคต ร.9'; }
      else if (m === 9 && d === 23) { row.isHoliday = true; row.holidayName = 'วันปิยมหาราช'; }
      else if (wd !== 0 && wd !== 6 && date < new Date(y, m, now.getDate())) {
        row.inTime = '08:' + pad(2 + ((d * 7) % 26)); row.outTime = '16:' + pad(31 + ((d * 5) % 25));
        if (d === 6) { row.inTime = '08:47'; row.isLate = true; }
        if (d === 8) { row.outTime = ''; row.status = 'incomplete'; row.canRequest = true; }
        if (d === 2 || d === 5) { row.inTime = ''; row.outTime = ''; row.isLeave = true; row.leaveType = '4'; }
      } else if (d === now.getDate() && wd !== 0 && wd !== 6) {
        row.inTime = '08:05';
      }
      out.push(row);
    }
    return out;
  };

  const week = () => {
    const mon = day(-((now.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => ymd(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i)));
  };
  const today = ymd(now);
  const roomBooking = (id, date, s, e, subject, section, teacher, color, booker) =>
    ({ detail_id: id, book_id: id, date, start_time: s, end_time: e, subject_id: subject, section, objective: '', teacher, bgcolor: color, term: '1', year: String(now.getFullYear()), booker_name: booker });

  window.__routes__ = [
    [/\/api\/examinar$/, () => ({ data: [
      { room_id: 'R1', room: 'อาคารเรียนรวม 101', date: ymd(day(6)), time_from: '09:00', time_to: '12:00', period: 'mid', status: '0' },
      { room_id: 'R2', room: 'อาคารเรียนรวม 204', date: ymd(day(8)), time_from: '13:00', time_to: '16:00', period: 'mid', status: '0' },
    ] })],
    [/\/api\/timestamp\/calendar$/, ({ query }) => ok({ year: Number(query.year), month: Number(query.month), days: calendarDays() })],
    [/\/api\/absence\/stats$/, () => ok({
      staffId: '900001', servantAge: 9, budgetStartDate: `${now.getFullYear() - 1}-10-01`, budgetEndDate: `${now.getFullYear()}-09-30`,
      absenceLimitCount: 23, absenceLimitDays: 60, absenceUsedCount: 3, absenceUsedDays: 5,
      sickUsedCount: 2, sickUsedDays: 3, businessUsedCount: 1, businessUsedDays: 2, birthUsedCount: 0,
      relaxStoreDays: 10, relaxTotalYearDays: 20, relaxUsedDays: 5, relaxRemainDays: 25, relaxLimitDays: 30,
      lateLimitCount: 9, lateUsedCount: 2,
    })],
    [/\/api\/repair\/informer_current$/, () => ({ success: true, total: 3, data: [
      { repair_id: 3, repair_number: '69/0143', repair_status: '003', repair_status_name: 'ดำเนินการ', work_category_name: 'ไฟฟ้า', repair_place: 'ห้องปฏิบัติการ 3', building_name: 'อาคารปฏิบัติการ', repair_inform_date: `${ymd(day(-2))} 10:15:00`, repair_inform: 'หลอดไฟในห้องกะพริบและดับเป็นระยะ' },
      { repair_id: 2, repair_number: '69/0141', repair_status: '001', repair_status_name: 'รอรับเรื่อง', work_category_name: 'เครื่องปรับอากาศ', repair_place: 'ห้องทำงาน 412', building_name: 'อาคารเรียนรวม', repair_inform_date: `${ymd(day(-4))} 14:30:00`, repair_inform: 'เครื่องปรับอากาศไม่เย็น' },
      { repair_id: 1, repair_number: '69/0137', repair_status: '008', repair_status_name: 'เสร็จสิ้น', work_category_name: 'ประปา', repair_place: 'ห้องน้ำชั้น 2', building_name: 'อาคารเรียนรวม', repair_inform_date: `${ymd(day(-9))} 09:00:00`, repair_inform: 'ก๊อกน้ำรั่ว' },
    ] })],
    [/\/api\/booking-room\/rooms$/, () => ok([
      { id: '1', name: 'ห้องเรียน 101', capacity: 60, projector: true, mic: true, status: '1', building_id: '1' },
      { id: '2', name: 'ห้องเรียน 204', capacity: 40, projector: true, mic: false, status: '1', building_id: '1' },
    ])],
    [/\/api\/booking-room\/schedule$/, () => {
      const dates = week();
      return ok({
        room: { id: '1', name: 'ห้องเรียน 101', capacity: 60, projector: true, mic: true, status: '1', building_id: '1' },
        week: { start: dates[0], end: dates[6], dates },
        grid: { start_hour: 7, end_hour: 23, slot_minutes: 30 },
        bookings: [
          roomBooking(1, today, '08:30', '10:30', 'ENG 101', '1', 'อ.สมหญิง ตัวอย่าง', '#3498DB', 'สมหญิง ตัวอย่าง'),
          roomBooking(2, today, '13:00', '15:00', 'ENG 214', '2', 'อ.ประเสริฐ ทดสอบ', '#2ECC71', 'ประเสริฐ ทดสอบ'),
          roomBooking(3, today, '15:30', '17:00', 'กิจกรรมชมรม', '', '', '#F1C40F', 'สมชาย ใจดี'),
          roomBooking(4, dates[Math.min(6, ((now.getDay() + 6) % 7) + 1)], '09:00', '12:00', 'ENG 330', '1', 'อ.วิภา ตัวอย่าง', '#9B59B6', 'วิภา ตัวอย่าง'),
        ],
      });
    }],
  ];
})();
