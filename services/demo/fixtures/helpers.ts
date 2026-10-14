/**
 * Shared bits for the demo fixtures. Every name, id, room and record in this
 * folder is invented; dates are built from today so the demo never looks stale.
 */
import type { DemoResult } from '../demoApi';

export type DemoRequest = {
  path: string;
  method: string;
  query: Record<string, string>;
  body: Record<string, unknown>;
};

export type DemoHandler = (request: DemoRequest) => DemoResult | undefined;

/** [path pattern, handler, method — omitted = any]. */
export type DemoRoute = [RegExp, DemoHandler, string?];

export const pad = (n: number) => String(n).padStart(2, '0');

export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function addDays(n: number, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + n);
  return d;
}

/** The nearest weekday on or before `d`. */
export function weekdayOnOrBefore(d: Date) {
  const out = new Date(d);
  while (out.getDay() === 0 || out.getDay() === 6) out.setDate(out.getDate() - 1);
  return out;
}

export const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const hms = (d: Date) => `${hm(d)}:${pad(d.getSeconds())}`;

/** The gateway's usual success envelope. */
export function ok(data: unknown, extra: Record<string, unknown> = {}) {
  return {
    success: true,
    message: '',
    data,
    ...(Array.isArray(data) ? { total_count: data.length } : {}),
    ...extra,
  };
}

export const saved = (data: unknown = {}) => ({ success: true, message: 'บันทึกข้อมูลเรียบร้อย', data });

export const DEMO_NAME = 'สมชาย ใจดี';
export const DEMO_DEPT = 'ภาควิชาวิศวกรรมคอมพิวเตอร์';
export const DEMO_POSITION = 'นักวิชาการคอมพิวเตอร์';
