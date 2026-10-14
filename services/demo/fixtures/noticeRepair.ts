/**
 * แจ้งซ่อมทั่วไป — the demo account is an informer: it can file a repair
 * request (the form's categories and buildings are here) and follow its own
 * jobs, three open and one closed.
 */
import { DEMO_DEPT, DEMO_NAME, DEMO_POSITION, addDays, ok, ymd, type DemoRoute } from './helpers';

const workCategories = [
  { work_category_id: 1, work_category_name: 'ไฟฟ้า' },
  { work_category_id: 2, work_category_name: 'ประปา' },
  { work_category_id: 3, work_category_name: 'เครื่องปรับอากาศ' },
  { work_category_id: 4, work_category_name: 'อาคารสถานที่' },
  { work_category_id: 5, work_category_name: 'เฟอร์นิเจอร์' },
];

const buildings = [
  { building_id: 1, building_name: 'อาคารเรียนรวม' },
  { building_id: 2, building_name: 'อาคารปฏิบัติการ' },
  { building_id: 3, building_name: 'อาคารสำนักงาน' },
];

function job(id: number, number: string, status: string, statusName: string, category: number, place: string, building: number, inform: string, daysAgo: number) {
  const informed = addDays(-daysAgo);
  return {
    repair_id: id,
    repair_number: number,
    repair_status: status,
    repair_status_name: statusName,
    repair_work_category: category,
    work_category_name: workCategories.find((c) => c.work_category_id === category)?.work_category_name,
    repair_place: place,
    repair_building: building,
    building_name: buildings.find((b) => b.building_id === building)?.building_name,
    repair_inform: inform,
    repair_tel: '1234',
    repair_inform_date: `${ymd(informed)} 10:15:00`,
    repair_inform_staff: 0,
    informer_name: DEMO_NAME,
    repair_inform_dept_name: DEMO_DEPT,
    lastupdate: `${ymd(informed)} 10:15:00`,
  };
}

const current = () => [
  job(9103, '69/0143', '003', 'ดำเนินการ', 1, 'ห้องปฏิบัติการ 3', 2, 'หลอดไฟในห้องกะพริบและดับเป็นระยะ', 2),
  job(9102, '69/0141', '001', 'รอรับเรื่อง', 3, 'ห้องทำงาน 412', 1, 'เครื่องปรับอากาศไม่เย็น มีน้ำหยด', 4),
];

const finished = () => [
  { ...job(9101, '69/0137', '008', 'เสร็จสิ้น', 2, 'ห้องน้ำชั้น 2', 1, 'ก๊อกน้ำอ่างล้างมือรั่ว', 9), repair_examine: 'y' },
];

function detail(id: number) {
  const item = [...current(), ...finished()].find((j) => j.repair_id === id) ?? current()[0];
  return {
    ...item,
    informer: {
      FNAME_TH: 'สมชาย',
      SNAME_TH: 'ใจดี',
      POSITION_NAME: DEMO_POSITION,
      DEPT_NAME_TH: DEMO_DEPT,
    },
    header: item.repair_status === '001' ? null : {
      header_name: 'นายช่าง ตัวอย่าง',
      header_date_start: ymd(addDays(-1)),
      repair_detail: 'ตรวจสอบเบื้องต้นแล้ว อยู่ระหว่างดำเนินการ',
    },
    technicians: item.repair_status === '001' ? [] : [{ type: 'staff', name: 'นายช่าง ตัวอย่าง' }],
    requisitions: [],
    approve_staff_name: 'ผศ.วิภา ตัวอย่าง',
  };
}

export const noticeRepairRoutes: DemoRoute[] = [
  [/\/api\/role\/check$/, () => ok({ roles: [], work_category_ids: [], approve_dept_ids: [], fullname_th: DEMO_NAME })],
  [/\/api\/notice-repair\/work_categories$/, () => ok(workCategories)],
  [/\/api\/notice-repair\/buildings$/, () => ok(buildings)],
  [/\/api\/repair\/informer_current$/, () => ({ ...ok(current()), total: current().length })],
  [/\/api\/repair\/informer_finished$/, () => ({ ...ok(finished()), total: finished().length })],
  [/\/api\/repair\/(detail|header_detail|full_detail)$/, ({ query }) => ok(detail(Number(query.repair_id)))],
];
