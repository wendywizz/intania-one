/**
 * ลงเวลาบุคลากรทั่วไปด้วยการสแกนใบหน้า — the contract the scan screen relies on.
 *
 * Tested at the two functions the screen imports. The gateway is stubbed at
 * `requestJson` and `fetchWithTimeout`, the only ways this module reaches the
 * network; URL building, the multipart body and the mapping are the real code.
 * Payloads are the shapes /api/timestamp/staff and /staff/stamp answer with.
 */
import { getStaffTimestampStatus, submitStaffFaceStamp } from '@/services/timestampService';

jest.mock('@/services/api', () => ({
  ...jest.requireActual('@/services/api'),
  requestJson: jest.fn(),
  fetchWithTimeout: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const api = require('@/services/api') as { requestJson: jest.Mock; fetchWithTimeout: jest.Mock };

function gatewayAnswers(status: number, body: unknown) {
  api.fetchWithTimeout.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  });
}

const SCAN = { staffId: '0042764', photoUri: 'file:///cache/face.jpg', expectKind: 'in' as const };

beforeEach(() => {
  api.requestJson.mockReset();
  api.fetchWithTimeout.mockReset();
});

describe('getStaffTimestampStatus', () => {
  it('sends where the phone is and reads what a scan would record', async () => {
    api.requestJson.mockResolvedValueOnce({
      data: {
        staffId: '0042764', role: 'staff', isStaff: true,
        stamp: { date: '2026-09-11', inTime: '07:18:27', outTime: '', isLate: false },
        nextStamp: 'out', stampKind: 'noon_out', needsConfirm: true,
        confirmMessage: 'ตอนนี้เป็นช่วงพักเที่ยง หากสแกนใบหน้า ระบบจะบันทึกเป็นเวลาออกงาน ต้องการดำเนินการต่อหรือไม่',
        outFrom: '16:20', canStamp: true, reason: '', message: 'พร้อมลงเวลาออกงานช่วงพักเที่ยง',
        faceRegistered: true, serverDate: '2026-09-11', serverTime: '12:01:00',
      },
    });

    const status = await getStaffTimestampStatus('0042764', { lat: 7.0067544, lon: 100.5011083 });

    const url = new URL(api.requestJson.mock.calls[0][0]);
    expect(url.searchParams.get('lat')).toBe('7.0067544');
    expect(url.searchParams.get('lon')).toBe('100.5011083');
    expect(status.stampKind).toBe('noon_out');
    expect(status.needsConfirm).toBe(true);
    expect(status.outFrom).toBe('16:20');
    expect(status.faceRegistered).toBe(true);
  });

  it('treats a kind it cannot label as nothing to stamp, and an unreadable face registry as unknown', async () => {
    api.requestJson.mockResolvedValueOnce({
      data: { role: 'staff', isStaff: true, stampKind: 'sideways', canStamp: true, faceRegistered: null },
    });

    const status = await getStaffTimestampStatus('0042764');

    expect(status.stampKind).toBe('');
    // null, not false: false would hide the camera behind "go and register".
    expect(status.faceRegistered).toBeNull();
  });
});

describe('submitStaffFaceStamp', () => {
  it('reports a face that did not match, so the screen keeps scanning', async () => {
    gatewayAnswers(200, {
      data: {
        passed: false, reason: 'face_mismatch', message: 'ใบหน้าไม่ตรงกับผู้ใช้งาน กำลังสแกนใหม่',
        similarity: 48, status: null, created: false, dryRun: true,
      },
    });

    await expect(submitStaffFaceStamp(SCAN)).resolves.toEqual({
      passed: false, reason: 'face_mismatch', message: 'ใบหน้าไม่ตรงกับผู้ใช้งาน กำลังสแกนใหม่',
      similarity: 48, status: null, created: false, dryRun: true,
    });
  });

  it('posts the picture as multipart and returns the new times when the stamp landed', async () => {
    gatewayAnswers(200, {
      data: {
        passed: true, reason: 'already_in', message: 'ลงเวลาเข้างานเรียบร้อยแล้ว เวลา 07:58 น.',
        similarity: 71, created: true, dryRun: false,
        status: {
          staffId: '0042764', role: 'staff', isStaff: true,
          stamp: { date: '2026-09-11', inTime: '07:58:12', outTime: '00:00:00', isLate: false },
          stampKind: '', canStamp: false, reason: 'already_in', message: 'ลงเวลาเข้างานเรียบร้อยแล้ว เวลา 07:58 น.', created: true,
        },
      },
    });

    const result = await submitStaffFaceStamp({ ...SCAN, position: { lat: 7.0067544, lon: 100.5011083 } });

    expect(result.created).toBe(true);
    expect(result.similarity).toBe(71);
    expect(result.status?.stamp?.inTime).toBe('07:58:12');
    // 00:00:00 is "not left yet", not midnight.
    expect(result.status?.stamp?.outTime).toBe('');

    const [url, init] = api.fetchWithTimeout.mock.calls[0];
    expect(String(url)).toMatch(/\/staff\/stamp$/);
    expect(init.method).toBe('POST');
    // No Content-Type of our own: fetch has to set the multipart boundary.
    expect(init.headers).toBeUndefined();
    expect(typeof init.body.append).toBe('function');
  });

  it('shows the generic server message for a gateway fault, not its internals', async () => {
    gatewayAnswers(503, { error: { message: 'Staff timestamp service is temporarily unavailable' } });

    await expect(submitStaffFaceStamp(SCAN)).rejects.toThrow('เซิร์ฟเวอร์ขัดข้อง');
  });

  it('passes on the gateway wording for a request it refused', async () => {
    gatewayAnswers(400, { error: { code: 'bad_request', message: 'file must be a JPEG or PNG image' } });

    await expect(submitStaffFaceStamp(SCAN)).rejects.toThrow('file must be a JPEG or PNG image');
  });
});
