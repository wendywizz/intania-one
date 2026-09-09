/**
 * ลงเวลาบุคลากรทั่วไป — the contract the stamping screen relies on.
 *
 * Tested at `getStaffTimestampStatus()`, the boundary the screens import. The
 * gateway is stubbed at `requestJson`, which is the only thing this module uses
 * to reach the network; everything else — URL building, the envelope check,
 * the shape it hands back — is the real code under test.
 *
 * Nothing here re-derives an expected value the way the source does. The
 * payloads below are real shapes seen from `/api/timestamp/staff`, and the
 * expectations are written out by hand from what the screen must be able to
 * show.
 */
import { getStaffTimestampStatus } from '@/services/timestampService';

jest.mock('@/services/api', () => ({
  ...jest.requireActual('@/services/api'),
  requestJson: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { requestJson } = require('@/services/api') as { requestJson: jest.Mock };

/** What the gateway answers next. */
function gatewayAnswers(data: Record<string, unknown>) {
  requestJson.mockResolvedValueOnce({ data, message: 'ok' });
}

beforeEach(() => {
  requestJson.mockReset();
});

describe('getStaffTimestampStatus', () => {
  it('reports someone who has arrived but not left, so the screen can offer the departure', async () => {
    // The commonest state in production: every reader row written this morning
    // has flag_out = 0 until people go home.
    gatewayAnswers({
      staffId: '0042764',
      role: 'staff',
      isStaff: true,
      stamp: { date: '2026-09-08', inTime: '07:01:12', outTime: '', isLate: false },
      nextStamp: 'out',
      canStamp: true,
      reason: '',
      message: 'พร้อมลงเวลาออกงาน',
      serverDate: '2026-09-08',
      serverTime: '16:40:00',
    });

    const status = await getStaffTimestampStatus('0042764');

    expect(status.role).toBe('staff');
    expect(status.nextStamp).toBe('out');
    expect(status.canStamp).toBe(true);
    expect(status.stamp).toEqual({
      date: '2026-09-08',
      inTime: '07:01:12',
      // Empty, not '00:00:00': the screen renders a dash for "not left yet",
      // and a zero time would read as midnight.
      outTime: '',
      isLate: false,
    });
  });

  it('treats a zero departure time as "not left yet", whoever sent it', async () => {
    // ABSENCE.timestamp stores 00:00:00 for a day that has no departure yet, and
    // the reader rows carry it verbatim. The gateway blanks it — but "not left"
    // is what the screen renders a dash for, and a time of 00:00 would read as
    // midnight, so the boundary the screen imports has to mean the same thing
    // whichever side of it did the blanking.
    gatewayAnswers({
      staffId: '0042764',
      role: 'staff',
      isStaff: true,
      stamp: { date: '2026-09-08', inTime: '07:01:12', outTime: '00:00:00', isLate: false },
      nextStamp: 'out',
      canStamp: false,
      reason: 'outside_hours',
      message: 'ขณะนี้อยู่นอกช่วงเวลาลงเวลา',
      serverDate: '2026-09-08',
      serverTime: '10:30:00',
    });

    const status = await getStaffTimestampStatus('0042764');

    expect(status.stamp?.outTime).toBe('');
  });

  it('treats a zero arrival time as "no arrival recorded"', async () => {
    // A real state, not a hypothetical: f_out_stamp_not_in() in the readers'
    // own code inserts in_time = 00:00:00 with flag_in = 0 for somebody who
    // left without an arrival on record. Reading that back as 00:00 would put
    // a specific, wrong arrival time on the screen instead of a dash.
    gatewayAnswers({
      staffId: '0042764',
      role: 'staff',
      isStaff: true,
      stamp: { date: '2026-09-08', inTime: '00:00:00', outTime: '16:35:02', isLate: false },
      nextStamp: '',
      canStamp: false,
      reason: 'outside_hours',
      message: 'ขณะนี้อยู่นอกช่วงเวลาลงเวลา',
      serverDate: '2026-09-08',
      serverTime: '17:00:00',
    });

    const status = await getStaffTimestampStatus('0042764');

    expect(status.stamp?.inTime).toBe('');
    expect(status.stamp?.outTime).toBe('16:35:02');
  });
});
