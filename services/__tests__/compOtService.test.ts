/**
 * scooba-comp-ot's client-side contracts — the two seams confirmed for this
 * module: `getCompOtStampWindow()` (pure — no mocking needed) and
 * `stampCompOtEvent()` (network, gateway stubbed at `requestJson`, same
 * pattern as staffTimestampService.test.ts).
 *
 * Expected values below are worked examples from the module's own spec (the
 * grilling session this module was built from), not values re-derived by the
 * same formula the source uses — a test that recomputed start ± period the
 * way getCompOtStampWindow() does would pass no matter what the formula was.
 */
import { getCompOtStampWindow, stampCompOtEvent } from '@/services/compOtService';

jest.mock('@/services/api', () => ({
  ...jest.requireActual('@/services/api'),
  requestJson: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { requestJson } = require('@/services/api') as { requestJson: jest.Mock };

beforeEach(() => {
  requestJson.mockReset();
});

describe('getCompOtStampWindow', () => {
  it('opens the check-in window 30 minutes on each side of a 16:30 start_time', () => {
    // The literal example this module was speced against: 16:30 start,
    // login_period=30 -> stampable 16:00 to 17:00.
    const event = { date: '2026-09-13', start_time: '16:30:00', end_time: '20:30:00' };

    const window = getCompOtStampWindow(event, 30, 'in');

    expect(window.start).toEqual(new Date(2026, 8, 13, 16, 0, 0));
    expect(window.end).toEqual(new Date(2026, 8, 13, 17, 0, 0));
  });

  it('anchors the check-out window on end_time instead of start_time', () => {
    // Same event, same login_period, but flag "out" - the window has to move
    // to the other end of the shift, not just re-expand start_time again.
    const event = { date: '2026-09-13', start_time: '16:30:00', end_time: '20:30:00' };

    const window = getCompOtStampWindow(event, 30, 'out');

    expect(window.start).toEqual(new Date(2026, 8, 13, 20, 0, 0));
    expect(window.end).toEqual(new Date(2026, 8, 13, 21, 0, 0));
  });

  it('collapses to the exact clock time when login_period is 0', () => {
    // A shift type with no configured grace period (or a missing column,
    // defaulted to 0 by the caller) must not silently open a window anyway.
    const event = { date: '2026-09-13', start_time: '12:00:00', end_time: '13:00:00' };

    const window = getCompOtStampWindow(event, 0, 'in');

    expect(window.start).toEqual(new Date(2026, 8, 13, 12, 0, 0));
    expect(window.end).toEqual(new Date(2026, 8, 13, 12, 0, 0));
  });

  it('treats a negative login_period the same as 0, never inverting the window', () => {
    // Defensive: a malformed config value must not flip start/end and widen
    // the window in the wrong direction.
    const event = { date: '2026-09-13', start_time: '12:00:00', end_time: '13:00:00' };

    const window = getCompOtStampWindow(event, -15, 'in');

    expect(window.start).toEqual(new Date(2026, 8, 13, 12, 0, 0));
    expect(window.end).toEqual(new Date(2026, 8, 13, 12, 0, 0));
  });
});

describe('stampCompOtEvent', () => {
  it('forwards staffId/eventId/flag/amount as staff_id/event_id/flag/amount and returns the upstream result', async () => {
    requestJson.mockResolvedValueOnce({
      data: { event_id: 'e1', flag: 'in', time: '16:31:02', amount: 0 },
    });

    const result = await stampCompOtEvent({ staffId: '0024028', eventId: 'e1', flag: 'in', amount: 0 });

    expect(result).toEqual({ event_id: 'e1', flag: 'in', time: '16:31:02', amount: 0 });

    const [, options] = requestJson.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      staff_id: '0024028',
      event_id: 'e1',
      flag: 'in',
      amount: 0,
    });
  });

  it('surfaces the upstream error message when the stamp is rejected', async () => {
    // The literal message Ot_Controller::stamp() sends for a closed window
    // (Y:\ln_OT\api\controller\ot_controller.php) — this is what a "you
    // missed the window" tap actually looks like end to end.
    requestJson.mockResolvedValueOnce({
      error: 'พ้นเวลาที่สามารถลงเวลาได้แล้ว (ปิดรับเวลา 17:00 น.)',
    });

    await expect(
      stampCompOtEvent({ staffId: '0024028', eventId: 'e1', flag: 'in', amount: 0 }),
    ).rejects.toThrow('พ้นเวลาที่สามารถลงเวลาได้แล้ว (ปิดรับเวลา 17:00 น.)');
  });
});
