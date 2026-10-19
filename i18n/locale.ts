import { getLanguage } from './language';

/**
 * Small language-dependent formatting rules that are not strings in `TEXT`: which
 * calendar year to print, which Intl locale to ask for, the time-of-day suffix.
 * Read at call time, never at module scope, for the same reason `TEXT` is.
 */

export function isThai(): boolean {
  return getLanguage() === 'th';
}

/** Thai readers expect the Buddhist Era (2569); English readers the Gregorian year (2026). */
export function displayYear(gregorianYear: number): number {
  return isThai() ? gregorianYear + 543 : gregorianYear;
}

/** `en-GB` rather than `en-US`: day before month, as Thai readers already expect. */
export function intlLocale(): 'th-TH' | 'en-GB' {
  return isThai() ? 'th-TH' : 'en-GB';
}

/** The "น." that Thai writes after a clock time ("16:30 น."); English writes nothing. */
export function timeSuffix(): string {
  return isThai() ? ' น.' : '';
}

/** Pick between two literals for the few strings that do not live in `TEXT`. */
export function pick<T>(thai: T, english: T): T {
  return isThai() ? thai : english;
}

/** "วันจันทร์" for Thai, where moment gives the bare "จันทร์"; English already reads "Monday". */
export function weekdayLabel(weekday: string): string {
  if (!isThai()) return weekday;
  return weekday.startsWith('วัน') ? weekday : `วัน${weekday}`;
}
