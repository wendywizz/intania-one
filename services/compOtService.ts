import { ENDPOINTS } from '../constants/endpoints';
import { requestJson } from './api';

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
