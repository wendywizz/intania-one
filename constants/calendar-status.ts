import type { AppColors } from '@/constants/theme';

/**
 * Day-status colours shared by every calendar. The timestamp calendar is the
 * visual source of truth, so both the timestamp grid and the absence
 * date-picker reference this one mapping (no duplicated hex, no local
 * light/dark branching in the components themselves — the actual colour
 * values live as variables on `AppColors` in constants/theme.ts).
 */
export type DayStatus =
  | 'present'
  | 'incomplete'
  | 'absent'
  | 'leave'
  | 'holiday'
  | 'none';

type DayStatusStyle = { bg: string; dot: string };
type DayStatusStyles = Record<DayStatus, DayStatusStyle>;

/** The day-status swatch set for the current theme — pass the palette from
 *  `useColors()`. present/incomplete/absent reuse the success/warning/danger
 *  soft-bg + on-soft-text pairs; leave/holiday get their own since they
 *  aren't a success/warning/danger concept. */
export function getDayStatusStyle(c: AppColors): DayStatusStyles {
  return {
    present: { bg: c.successSoft, dot: c.successOnSoft },
    incomplete: { bg: c.warningSoft, dot: c.warningOnSoft },
    absent: { bg: c.dangerSoft, dot: c.dangerOnSoft },
    leave: { bg: c.leaveSoft, dot: c.leaveOnSoft },
    // Weekends fold into "holiday" in the timestamp calendar — both use this grey.
    holiday: { bg: c.holidaySoft, dot: c.holidayOnSoft },
    none: { bg: 'transparent', dot: 'transparent' },
  };
}
