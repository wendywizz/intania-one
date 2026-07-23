/**
 * Day-status colours shared by every calendar. The timestamp calendar is the
 * visual source of truth, so these live in one place and both the timestamp
 * grid and the absence date-picker reference them (no duplicated hex).
 *
 * These are fixed light swatches kept identical in light & dark on purpose — a
 * "holiday" or "leave" day should always read as the same tint across the app.
 */
export type DayStatus =
  | 'present'
  | 'incomplete'
  | 'absent'
  | 'leave'
  | 'holiday'
  | 'none';

export const DAY_STATUS_STYLE: Record<DayStatus, { bg: string; dot: string }> = {
  present: { bg: '#E6F4EA', dot: '#1E7E34' },
  incomplete: { bg: '#FEF3E2', dot: '#B45309' },
  absent: { bg: '#FDECEC', dot: '#B3261E' },
  leave: { bg: '#EEF0FF', dot: '#5B5BD6' },
  // Weekends fold into "holiday" in the timestamp calendar — both use this grey.
  holiday: { bg: '#EFF1F5', dot: '#9AA0AA' },
  none: { bg: 'transparent', dot: 'transparent' },
};
