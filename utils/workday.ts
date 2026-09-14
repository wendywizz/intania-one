import { TEXT } from '@/constants/text';

/**
 * The official working day, 08:30-16:30, as minutes since midnight.
 *
 * One definition for both ลงเวลา screens, so the staff and lecturer bars fill
 * against the same day. It is the day as the faculty states it, not the readers'
 * stamping windows, which open earlier and close later on purpose.
 */
export const WORKDAY_START_MIN = 8 * 60 + 30;
export const WORKDAY_END_MIN = 16 * 60 + 30;

/** 'HH:MM' or 'HH:MM:SS' -> minutes since midnight. -1 when there is no time. */
export function minutesOfDay(time: string) {
  if (!time) return -1;

  const [h, m] = time.split(':').map(Number);

  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : -1;
}

/** A Date's wall-clock time as minutes since midnight. */
export function minutesOf(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * How far through the working day `atMinutes` is, from 0 at 08:30 to 1 at
 * 16:30. Clamped both ends: the bar is empty before the day starts and full
 * once it is over, however early someone arrived or late they stayed.
 */
export function workdayProgress(atMinutes: number) {
  const span = WORKDAY_END_MIN - WORKDAY_START_MIN;

  return Math.min(1, Math.max(0, (atMinutes - WORKDAY_START_MIN) / span));
}

/**
 * How long the person has been at work: from the arrival stamp to the departure
 * one, or to `nowMinutes` while the day is still open. Null until there is an
 * arrival - there is nothing to measure from before that.
 */
export function workedMinutes(inTime: string, outTime: string, nowMinutes: number) {
  const start = minutesOfDay(inTime);
  if (start < 0) return null;

  const out = minutesOfDay(outTime);
  const end = out >= 0 ? out : nowMinutes;

  return Math.max(0, end - start);
}

/** 338 -> 'ทำงานแล้ว 5 ชม. 38 น.' */
export function workedLabel(minutes: number) {
  return TEXT.STAFF_TIMESTAMP_WORKED
    .replace('{h}', String(Math.floor(minutes / 60)))
    .replace('{m}', String(minutes % 60).padStart(2, '0'));
}
