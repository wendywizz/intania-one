import { ENDPOINTS } from '../constants/endpoints';
import { fetchWithTimeout, MESSAGE_SERVER_ERROR } from './api';

/**
 * Computer-lab OT duty roster (เวรห้องคอมพิวเตอร์, scooba-comp-ot — dept 209
 * only). Mirrors examinarService.ts's shape: the gateway controller returns a
 * bare `{ data }` envelope (no `success` field), so responses are unwrapped by
 * hand here rather than through ensureSuccess()/rowRequest().
 */

export type CompOtShiftType = 'after_hours' | 'lunch' | 'holiday' | 'unknown';

export type CompOtShiftConfig = {
  cid: number;
  title: string;
  shift_type: CompOtShiftType;
  start_time: string;
  end_time: string;
  /** ISO weekday numbers, 1=จันทร์ .. 7=อาทิตย์. */
  on_day: number[];
  holiday: boolean;
  /** Minutes on each side of start_time (stamp-in) / end_time (stamp-out) the
   * shift may be stamped within — see Ot_Controller::stamp() on the PHP side. */
  login_period: number;
};

export type CompOtEvent = {
  event_id: string;
  cid: number;
  shift_type: CompOtShiftType;
  date: string;
  start_time: string;
  end_time: string;
  /** `${date} ${start_time}` — the shift's actual start, for sorting/labels. */
  start_at: string;
  flag_in: boolean;
  flag_out: boolean;
  in_time: string | null;
  out_time: string | null;
  /** UNI_STAFF_ID of whoever is on this shift, or null if unresolved. */
  staff_id: string | null;
  staff_name: string | null;
  /** True when this row belongs to the staff_id the request was made for. */
  is_mine: boolean;
};

export type CompOtSchedule = {
  shift_types: CompOtShiftConfig[];
  events: CompOtEvent[];
};

export type CompOtScope = 'mine' | 'dept';

function createCompOtUrl(base: string, query: Record<string, string | number | undefined | null>) {
  const url = new URL(base);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

/**
 * One call to the gateway's comp-ot routes.
 *
 * Not the shared requestJson(): that turns every non-2xx into
 * "เซิร์ฟเวอร์ขัดข้อง", and this module's refusals are business answers with a
 * Thai reason from the PHP API ("ต้องดำเนินการก่อนถึงเวลาเข้าเวรอย่างน้อย 1
 * ชั่วโมง", "พ้นเวลาที่สามารถลงเวลาได้แล้ว ...") - hiding them made a refused
 * sale look like a broken server. A 4xx keeps the gateway's wording; a 5xx
 * still gets the generic message, so internals never reach the screen. Same
 * rule as submitStaffFaceStamp() in timestampService.ts.
 */
async function requestJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetchWithTimeout(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const text = await response.text();

  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok || json === null) {
    const reason = extractError(json);
    throw new Error(response.status < 500 && reason ? reason : MESSAGE_SERVER_ERROR);
  }

  return json;
}

function extractObject<T>(json: unknown): T | null {
  if (!json || typeof json !== 'object') return null;
  const obj = json as Record<string, unknown>;
  if (obj.data && typeof obj.data === 'object') return obj.data as T;
  return null;
}

function extractError(json: unknown): string {
  if (!json || typeof json !== 'object') return '';
  const err = (json as Record<string, unknown>).error;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const message = (err as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  return '';
}

/**
 * The "ตารางเวร" screen's data: the 3 shift-type configs for dept 209, plus
 * events for one month — either the caller's own (scope=mine, default) or
 * everyone's across all 3 types (scope=dept, the "เพื่อนร่วมแผนก" toggle).
 */
export async function getCompOtSchedule(params: {
  staffId: string;
  month: number;
  year: number;
  scope?: CompOtScope;
}): Promise<CompOtSchedule> {
  const url = createCompOtUrl(ENDPOINTS.compOt, {
    staff_id: params.staffId,
    month: params.month,
    year: params.year,
    scope: params.scope ?? 'mine',
  });

  const json = await requestJson(url);
  const data = extractObject<CompOtSchedule>(json);
  if (!data) {
    throw new Error(extractError(json) || 'โหลดตารางเวรไม่สำเร็จ');
  }

  return {
    shift_types: Array.isArray(data.shift_types) ? data.shift_types : [],
    events: Array.isArray(data.events) ? data.events : [],
  };
}

export type CompOtStampFlag = 'in' | 'out';

/**
 * The clock-time window a shift may be stamped within: start_time (flag "in")
 * or end_time (flag "out") expanded by `loginPeriodMinutes` on each side —
 * same formula the PHP side enforces (Ot_Controller::stamp()), so a client
 * check here can only ever be stricter-or-equal to what the server allows,
 * never looser.
 */
export function getCompOtStampWindow(
  event: Pick<CompOtEvent, 'date' | 'start_time' | 'end_time'>,
  loginPeriodMinutes: number,
  flag: CompOtStampFlag,
): { start: Date; end: Date } {
  const anchorTime = flag === 'in' ? event.start_time : event.end_time;
  const anchor = new Date(`${event.date}T${anchorTime}`);
  const spanMs = Math.max(0, loginPeriodMinutes) * 60000;
  return { start: new Date(anchor.getTime() - spanMs), end: new Date(anchor.getTime() + spanMs) };
}

export type CompOtStampResult = {
  event_id: string;
  flag: CompOtStampFlag;
  time: string;
  amount: number | string;
};

/** ลงเวลาเข้า/ออกเวร — writes flag_in/out on the upstream event row. */
export async function stampCompOtEvent(params: {
  staffId: string;
  eventId: string;
  flag: CompOtStampFlag;
  amount: number | string;
}): Promise<CompOtStampResult> {
  const json = await requestJson(ENDPOINTS.compOtStamp, {
    method: 'POST',
    body: JSON.stringify({
      staff_id: params.staffId,
      event_id: params.eventId,
      flag: params.flag,
      amount: params.amount,
    }),
  });

  const data = extractObject<CompOtStampResult>(json);
  if (!data) {
    throw new Error(extractError(json) || 'บันทึกการลงเวลาไม่สำเร็จ');
  }

  return data;
}

/* -------------------------------------------------------------------------- */
/* แลกเวร / ขายเวร — the rules are enforced by the PHP API (Swap_Rules); what   */
/* is here only decides what to offer the user, and relays their choice.       */
/* -------------------------------------------------------------------------- */

export type CompOtSwapType = 'ex' | 'sell';

export type CompOtSwapPerson = {
  /** UNI_STAFF_ID */
  staff_id: string | null;
  staff_name: string | null;
};

export type CompOtSwapRequest = {
  request_id: string;
  /** 'ex' = exchange shifts with each other, 'sell' = hand the shift over. */
  type: CompOtSwapType;
  /** incoming = addressed to the caller, outgoing = made by the caller. */
  direction: 'incoming' | 'outgoing';
  /** The shift being offered. Null only if an admin deleted it since. */
  source_event: CompOtEvent | null;
  /** The shift asked for in return — exchange only. */
  target_event: CompOtEvent | null;
  from: CompOtSwapPerson;
  to: CompOtSwapPerson;
  /** Why the request can no longer be carried out (a shift moved on, or is
   * about to start), or null while it can. Such a request can still be
   * declined or cancelled, never accepted. */
  invalid_reason: string | null;
};

export type CompOtSwapStatus = 'offered' | 'accepted' | 'declined' | 'cancelled';

export type CompOtSwapResult = {
  status: CompOtSwapStatus;
  request: CompOtSwapRequest;
};

export type CompOtSwapCandidates =
  | { type: 'ex'; events: CompOtEvent[] }
  | { type: 'sell'; staff: CompOtSwapPerson[] };

/** A shift can change hands only until this long before it starts. Same value
 * as Swap_Rules::LEAD_MINUTES on the PHP side, which is what actually enforces it. */
const SWAP_LEAD_MINUTES = 60;

/**
 * Whether it is still worth showing "แลกเวร / ขายเวร" for a shift: not yet
 * stamped, and more than an hour from starting. The server checks the same
 * thing, so this only stops the button appearing where it can never work.
 */
export function canOfferCompOtEvent(
  event: Pick<CompOtEvent, 'date' | 'start_time' | 'flag_in' | 'flag_out'>,
  now: Date = new Date(),
): boolean {
  if (event.flag_in || event.flag_out) return false;
  const start = new Date(`${event.date}T${event.start_time}`);
  return start.getTime() - SWAP_LEAD_MINUTES * 60000 > now.getTime();
}

async function postCompOtSwapAction(
  url: string,
  payload: Record<string, unknown>,
  fallbackError: string,
): Promise<CompOtSwapResult> {
  const json = await requestJson(url, { method: 'POST', body: JSON.stringify(payload) });
  const data = extractObject<CompOtSwapResult>(json);
  if (!data) {
    throw new Error(extractError(json) || fallbackError);
  }
  return data;
}

/** Pending requests the caller sent or was sent, newest first. */
export async function getCompOtSwaps(staffId: string): Promise<CompOtSwapRequest[]> {
  const json = await requestJson(createCompOtUrl(ENDPOINTS.compOtSwaps, { staff_id: staffId }));
  const data = extractObject<{ requests?: CompOtSwapRequest[] }>(json);
  if (!data) {
    throw new Error(extractError(json) || 'โหลดคำขอแลกเวร/ขายเวรไม่สำเร็จ');
  }
  return Array.isArray(data.requests) ? data.requests : [];
}

/** Who a shift can be offered to: other people's later shifts (ex) or colleagues on the same roster (sell). */
export async function getCompOtSwapCandidates(params: {
  staffId: string;
  eventId: string;
  type: CompOtSwapType;
}): Promise<CompOtSwapCandidates> {
  const json = await requestJson(
    createCompOtUrl(ENDPOINTS.compOtSwapCandidates, {
      staff_id: params.staffId,
      event_id: params.eventId,
      type: params.type,
    }),
  );
  const data = extractObject<{ events?: CompOtEvent[]; staff?: CompOtSwapPerson[] }>(json);
  if (!data) {
    throw new Error(extractError(json) || 'โหลดรายชื่อไม่สำเร็จ');
  }
  return params.type === 'ex'
    ? { type: 'ex', events: Array.isArray(data.events) ? data.events : [] }
    : { type: 'sell', staff: Array.isArray(data.staff) ? data.staff : [] };
}

/** Offer the caller's shift: to swap for `targetEventId` (ex) or hand over to `targetStaffId` (sell). */
export function offerCompOtSwap(params: {
  staffId: string;
  eventId: string;
  type: CompOtSwapType;
  targetEventId?: string;
  targetStaffId?: string;
}): Promise<CompOtSwapResult> {
  return postCompOtSwapAction(
    ENDPOINTS.compOtSwaps,
    {
      staff_id: params.staffId,
      event_id: params.eventId,
      type: params.type,
      target_event_id: params.targetEventId,
      target_staff_id: params.targetStaffId,
    },
    'ส่งคำขอไม่สำเร็จ',
  );
}

/** Answer a request addressed to the caller. */
export function respondCompOtSwap(params: {
  staffId: string;
  requestId: string;
  action: 'accept' | 'decline';
}): Promise<CompOtSwapResult> {
  return postCompOtSwapAction(
    ENDPOINTS.compOtSwapRespond,
    { staff_id: params.staffId, request_id: params.requestId, action: params.action },
    'ตอบกลับคำขอไม่สำเร็จ',
  );
}

/** Withdraw a request the caller made, while it is still pending. */
export function cancelCompOtSwap(params: { staffId: string; requestId: string }): Promise<CompOtSwapResult> {
  return postCompOtSwapAction(
    ENDPOINTS.compOtSwapCancel,
    { staff_id: params.staffId, request_id: params.requestId },
    'ยกเลิกคำขอไม่สำเร็จ',
  );
}
