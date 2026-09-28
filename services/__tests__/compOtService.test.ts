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
import {
  canOfferCompOtEvent,
  cancelCompOtSwap,
  getCompOtSwapCandidates,
  getCompOtSwaps,
  getCompOtStampWindow,
  offerCompOtSwap,
  respondCompOtSwap,
  stampCompOtEvent,
} from '@/services/compOtService';

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

describe('canOfferCompOtEvent', () => {
  // Mirrors Swap_Rules::event_error() on the PHP side: a shift can change hands
  // only until 60 minutes before it starts, and never once it has been stamped.
  const shift = { date: '2026-09-30', start_time: '16:30:00', flag_in: false, flag_out: false };

  it('allows an upcoming, unstamped shift', () => {
    expect(canOfferCompOtEvent(shift, new Date(2026, 8, 28, 10, 0, 0))).toBe(true);
  });

  it('closes 60 minutes before the shift starts', () => {
    const today = { ...shift, date: '2026-09-28' };

    expect(canOfferCompOtEvent(today, new Date(2026, 8, 28, 15, 29, 0))).toBe(true);
    expect(canOfferCompOtEvent(today, new Date(2026, 8, 28, 15, 31, 0))).toBe(false);
  });

  it('is closed for a shift that has been stamped in', () => {
    expect(canOfferCompOtEvent({ ...shift, flag_in: true }, new Date(2026, 8, 28, 10, 0, 0))).toBe(false);
  });

  it('is closed for a shift that already happened', () => {
    expect(canOfferCompOtEvent({ ...shift, date: '2026-09-01' }, new Date(2026, 8, 28, 10, 0, 0))).toBe(false);
  });
});

describe('duty exchange / sale requests', () => {
  const request = {
    request_id: '9',
    type: 'ex',
    direction: 'incoming',
    source_event: null,
    target_event: null,
    from: { staff_id: '0000001', staff_name: 'ผู้เสนอ' },
    to: { staff_id: '0000002', staff_name: 'ผู้รับ' },
    invalid_reason: null,
  };

  it('lists the requests the caller sent or received', async () => {
    requestJson.mockResolvedValueOnce({ data: { requests: [request] } });

    const result = await getCompOtSwaps('0000002');

    expect(result).toEqual([request]);
    expect(requestJson.mock.calls[0][0]).toContain('/api/comp-ot/swaps?staff_id=0000002');
  });

  it('treats a reply with no requests as an empty list', async () => {
    requestJson.mockResolvedValueOnce({ data: {} });

    expect(await getCompOtSwaps('0000002')).toEqual([]);
  });

  it('asks for exchange candidates as shifts and sale candidates as colleagues', async () => {
    requestJson.mockResolvedValueOnce({ data: { type: 'ex', events: [{ event_id: 'e2' }] } });
    requestJson.mockResolvedValueOnce({ data: { type: 'sell', staff: [{ staff_id: '0000002', staff_name: 'ผู้รับ' }] } });

    const swap = await getCompOtSwapCandidates({ staffId: '0000001', eventId: 'e1', type: 'ex' });
    const sell = await getCompOtSwapCandidates({ staffId: '0000001', eventId: 'e1', type: 'sell' });

    expect(swap).toEqual({ type: 'ex', events: [{ event_id: 'e2' }] });
    expect(sell).toEqual({ type: 'sell', staff: [{ staff_id: '0000002', staff_name: 'ผู้รับ' }] });
    expect(requestJson.mock.calls[0][0]).toMatch(/swaps\/candidates\?.*event_id=e1/);
    expect(requestJson.mock.calls[0][0]).toContain('type=ex');
  });

  it('posts an exchange offer naming the shift being asked for', async () => {
    requestJson.mockResolvedValueOnce({ data: { status: 'offered', request } });

    const result = await offerCompOtSwap({ staffId: '0000001', eventId: 'e1', type: 'ex', targetEventId: 'e2' });

    expect(result.status).toBe('offered');
    const [url, options] = requestJson.mock.calls[0];
    expect(url).toContain('/api/comp-ot/swaps');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ staff_id: '0000001', event_id: 'e1', type: 'ex', target_event_id: 'e2' });
  });

  it('posts a sale offer naming the colleague it goes to', async () => {
    requestJson.mockResolvedValueOnce({ data: { status: 'offered', request } });

    await offerCompOtSwap({ staffId: '0000001', eventId: 'e1', type: 'sell', targetStaffId: '0000002' });

    expect(JSON.parse(requestJson.mock.calls[0][1].body)).toEqual({
      staff_id: '0000001', event_id: 'e1', type: 'sell', target_staff_id: '0000002',
    });
  });

  it('posts an accept or decline against a request id', async () => {
    requestJson.mockResolvedValue({ data: { status: 'accepted', request } });

    await respondCompOtSwap({ staffId: '0000002', requestId: '9', action: 'accept' });

    const [url, options] = requestJson.mock.calls[0];
    expect(url).toContain('/api/comp-ot/swaps/respond');
    expect(JSON.parse(options.body)).toEqual({ staff_id: '0000002', request_id: '9', action: 'accept' });
  });

  it('posts a cancel against a request id', async () => {
    requestJson.mockResolvedValueOnce({ data: { status: 'cancelled', request } });

    await cancelCompOtSwap({ staffId: '0000001', requestId: '9' });

    const [url, options] = requestJson.mock.calls[0];
    expect(url).toContain('/api/comp-ot/swaps/cancel');
    expect(JSON.parse(options.body)).toEqual({ staff_id: '0000001', request_id: '9' });
  });

  it('surfaces the reason the PHP API gives when it refuses an action', async () => {
    requestJson.mockResolvedValueOnce({ error: { message: 'เวรนี้ไม่ใช่ของท่าน', details: null } });

    await expect(
      offerCompOtSwap({ staffId: '0000001', eventId: 'e1', type: 'sell', targetStaffId: '0000002' }),
    ).rejects.toThrow('เวรนี้ไม่ใช่ของท่าน');
  });
});
