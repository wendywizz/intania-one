/**
 * แจ้งซ่อมคอมพิวเตอร์ — the demo account is a plain user: it may file a job
 * and follow its own, one open and two closed.
 */
import { DEMO_DEPT, DEMO_NAME, addDays, ok, ymd, type DemoRoute } from './helpers';

function job(id: string, status: string, statusName: string, repairType: string, supply: string, detail: string, daysAgo: number, worker = '') {
  return {
    id,
    jobId: id,
    status,
    statusName,
    repairTypeName: repairType,
    supplyCode: supply,
    detail,
    phone: '1234',
    informDateTime: `${ymd(addDays(-daysAgo))} 09:30:00`,
    staffFullname: DEMO_NAME,
    deptName: DEMO_DEPT,
    workerFullname: worker,
    foremanFullname: worker ? 'หัวหน้าช่าง ตัวอย่าง' : '',
  };
}

const current = () => [
  job('8803', '4', 'กำลังดำเนินการ', 'เครื่องคอมพิวเตอร์', '7440-001-0001/66', 'เปิดเครื่องไม่ติด มีเสียงดังจากพัดลม', 1, 'ช่างคอม ตัวอย่าง'),
];

const history = () => [
  job('8802', '5', 'เสร็จสิ้น', 'เครื่องพิมพ์', '7430-002-0045/64', 'เครื่องพิมพ์กระดาษติดบ่อย', 15, 'ช่างคอม ตัวอย่าง'),
  job('8801', '5', 'เสร็จสิ้น', 'ระบบเครือข่าย', '-', 'เชื่อมต่อ Wi-Fi ในห้องทำงานไม่ได้', 40, 'ช่างคอม ตัวอย่าง'),
];

export const repairComputerRoutes: DemoRoute[] = [
  [/\/api\/repair-computer\/privilege$/, () => ok('user')],
  [/\/api\/repair-computer\/inform\/check_can_inform$/, () => ok({ canInform: true })],
  [/\/api\/repair-computer\/inform\/current$/, () => ok(current())],
  [/\/api\/repair-computer\/inform\/history$/, () => ok(history())],
  [/\/api\/repair-computer\/inform$/, ({ query }) =>
    ok([...current(), ...history()].find((j) => j.id === query.id) ?? current()[0]), 'GET'],
];
