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

/** The bar and its label for one person's day. */
export type WorkdayState = {
  /** 0 to 1: how much of the track is filled. */
  fill: number;
  /** Minutes worked so far, or null when there is no figure to show. */
  worked: number | null;
  /** Nothing is running any more: draw the bar grey. */
  spent: boolean;
};

/**
 * Where one person's day stands, against the faculty's 08:30-16:30.
 *
 * The rules it encodes, all of them the faculty's:
 *  - arriving early does not start the day early: 07:50 still counts from 08:30;
 *  - the departure stamp ends it: the total and the bar stop there and go grey,
 *    because that person's day is over whatever the clock says;
 *  - 16:30 ends it too, whether or not a departure stamp came - past that hour
 *    there is no running total left to show, and the bar sits full and grey,
 *    which is also the honest answer for a day whose stamp never came;
 *  - with no arrival stamp nothing of theirs has started at all: empty and grey,
 *    however far through the day the clock is.
 */
export function workdayState(inTime: string, outTime: string, nowMinutes: number): WorkdayState {
  const arrived = minutesOfDay(inTime);

  if (arrived < 0) return { fill: 0, worked: null, spent: true };

  if (nowMinutes >= WORKDAY_END_MIN) return { fill: 1, worked: null, spent: true };

  const from = Math.max(arrived, WORKDAY_START_MIN);
  // Stopped at the departure stamp, still running at the current minute.
  const left = minutesOfDay(outTime);
  const to = left >= 0 ? left : nowMinutes;

  return {
    fill: workdayProgress(to),
    worked: Math.max(0, to - from),
    spent: left >= 0,
  };
}

/** 338 -> 'ทำงานแล้ว 5 ชม. 38 น.' */
export function workedLabel(minutes: number) {
  return TEXT.STAFF_TIMESTAMP_WORKED
    .replace('{h}', String(Math.floor(minutes / 60)))
    .replace('{m}', String(minutes % 60).padStart(2, '0'));
}
