/**
 * ลงเวลาบุคลากรทั่วไปด้วยการสแกนใบหน้า — the contract the scan screen relies on.
 *
 * Tested at the two functions the screen imports. The gateway is stubbed at
 * `requestJson` and `fetchWithTimeout`, the only ways this module reaches the
 * network; URL building, the multipart body and the mapping are the real code.
 * Payloads are the shapes /api/timestamp/staff and /staff/stamp answer with.
 */
import {
  getStaffTimestampStatus,
  submitStaffFaceEnroll,
  submitStaffFaceStamp,
} from '@/services/timestampService';

jest.mock('@/services/api', () => ({
  ...jest.requireActual('@/services/api'),
  requestJson: jest.fn(),
  fetchWithTimeout: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const api = require('@/services/api') as { requestJson: jest.Mock; fetchWithTimeout: jest.Mock };

// Expo's fetch reads a file part through the Blob interface, so the picture
// travels as an expo-file-system File. The real one talks to the native module;
// this stand-in only records which file was handed over.
jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
    async bytes() {
      return new Uint8Array();
    }
  },
}));

// The phone's network as expo-network reports it; each test sets its own.
const mockNetwork = { type: 'WIFI', ip: '172.30.12.34' };
jest.mock('expo-network', () => ({
  NetworkStateType: { WIFI: 'WIFI', CELLULAR: 'CELLULAR' },
  getNetworkStateAsync: async () => ({ type: mockNetwork.type, isConnected: true }),
  getIpAddressAsync: async () => mockNetwork.ip,
}));
// The patched ExpoNetwork module iOS reads the address from (jest-expo runs
// as iOS); see utils/wifi-ip.ts and patches/expo-network+57.0.2.patch.
jest.mock('expo-modules-core', () => ({
  ...jest.requireActual('expo-modules-core'),
  requireOptionalNativeModule: (name: string) =>
    name === 'ExpoNetwork'
      ? { getWifiIpAddressAsync: async () => mockNetwork.ip }
      : jest.requireActual('expo-modules-core').requireOptionalNativeModule(name),
}));

/** The value appended under `name`, or undefined when it was not sent. */
function partOf(name: string): unknown {
  const call = appendSpy.mock.calls.find(([part]) => part === name);

  return call ? call[1] : undefined;
}

/**
 * What was appended as `file`, read off FormData.append rather than out of the
 * form: a FormData that is not React Native's turns an unknown object into a
 * string, which would hide the very shape under test.
 */
function filePartOf(): { uri?: string; bytes?: unknown } {
  const call = appendSpy.mock.calls.find(([name]) => name === 'file');

  return (call ? call[1] : undefined) as never;
}

function gatewayAnswers(status: number, body: unknown) {
  api.fetchWithTimeout.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  });
}

const SCAN = { staffId: '0042764', photoUri: 'file:///cache/face.jpg', expectKind: 'in' as const };

const appendSpy = jest.spyOn(FormData.prototype, 'append');

beforeEach(() => {
  api.requestJson.mockReset();
  api.fetchWithTimeout.mockReset();
  appendSpy.mockClear();
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
    // An unreadable quota is unknown too - the button stays, the server decides.
    expect(status.faceEnroll).toEqual({ allowed: false, remaining: null, dryRun: false });
  });

  it('reads how many face registrations are left', async () => {
    api.requestJson.mockResolvedValueOnce({
      data: {
        role: 'staff', isStaff: true, faceRegistered: false,
        faceEnroll: { allowed: true, remaining: 2, dryRun: true },
      },
    });

    const status = await getStaffTimestampStatus('0042764');

    expect(status.faceEnroll).toEqual({ allowed: true, remaining: 2, dryRun: true });
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
    // A { uri } part is what React Native's fetch understood; Expo's fetch
    // throws "Unsupported FormDataPart implementation" on it.
    const file = filePartOf();
    expect(typeof file.bytes).toBe('function');
    expect(file.uri).toBe(SCAN.photoUri);
  });

  it("sends the phone's Wi-Fi address with the scan, and nothing on mobile data", async () => {
    const answer = { data: { passed: false, reason: 'face_mismatch', message: '' } };

    mockNetwork.type = 'WIFI';
    gatewayAnswers(200, answer);
    await submitStaffFaceStamp(SCAN);
    expect(partOf('wifi_ip')).toBe('172.30.12.34');

    appendSpy.mockClear();
    mockNetwork.type = 'CELLULAR';
    gatewayAnswers(200, answer);
    await submitStaffFaceStamp(SCAN);
    expect(partOf('wifi_ip')).toBeUndefined();
    mockNetwork.type = 'WIFI';
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

describe('submitStaffFaceEnroll', () => {
  const ENROLL = {
    staffId: '0042764',
    mode: 'first' as const,
    photoUris: ['file:///cache/a.jpg', 'file:///cache/b.jpg'] as [string, string],
  };

  it('posts both pictures and the mode, and reads the quota left', async () => {
    gatewayAnswers(200, {
      data: { enrolled: true, reason: 'enrolled', message: 'บันทึกใบหน้าเรียบร้อยแล้ว', remaining: 1, dryRun: false },
    });

    const result = await submitStaffFaceEnroll({ ...ENROLL, position: { lat: 7.0067544, lon: 100.5011083 } });

    expect(api.fetchWithTimeout.mock.calls[0][0]).toMatch(/\/staff\/face-enroll$/);
    expect(partOf('mode')).toBe('first');
    expect(partOf('staff_id')).toBe('0042764');
    expect((partOf('file1') as { uri: string }).uri).toBe('file:///cache/a.jpg');
    expect((partOf('file2') as { uri: string }).uri).toBe('file:///cache/b.jpg');
    expect(result).toEqual({
      enrolled: true,
      reason: 'enrolled',
      message: 'บันทึกใบหน้าเรียบร้อยแล้ว',
      remaining: 1,
      dryRun: false,
    });
  });

  it('resolves a refusal rather than throwing, so the screen can say why', async () => {
    gatewayAnswers(200, {
      data: { enrolled: false, reason: 'no_quota', message: 'ใช้สิทธิ์เก็บใบหน้าครบแล้ว', remaining: 0, dryRun: false },
    });

    const result = await submitStaffFaceEnroll({ ...ENROLL, mode: 'renew' });

    expect(partOf('mode')).toBe('renew');
    expect(result).toMatchObject({ enrolled: false, reason: 'no_quota', remaining: 0 });
  });

  it('passes on the gateway wording for somebody who is not general staff', async () => {
    gatewayAnswers(403, { error: { code: 'not_staff', message: 'เฉพาะบุคลากรสายสนับสนุน' } });

    await expect(submitStaffFaceEnroll(ENROLL)).rejects.toThrow('เฉพาะบุคลากรสายสนับสนุน');
  });
});
