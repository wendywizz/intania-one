import moment from 'moment';
import 'moment/locale/th';

import { TEXT } from '@/constants/text';
import type { CompOtEvent, CompOtShiftType } from '@/services/compOtService';
import { getLanguage } from '@/i18n/language';
import { displayYear, timeSuffix } from '@/i18n/locale';

/** "อ. 30 กันยายน 2569" / "Wed 30 September 2026" from a plain YYYY-MM-DD. */
export function formatCompOtDate(dateStr: string) {
  const m = moment(dateStr, 'YYYY-MM-DD').locale(getLanguage());
  return m.isValid() ? `${m.format('ddd D MMMM')} ${displayYear(m.year())}` : dateStr;
}

/** "อ. 30 กันยายน 2569 16:30 - 20:30 น." (the น. is Thai only) */
export function formatCompOtShift(event: Pick<CompOtEvent, 'date' | 'start_time' | 'end_time'>) {
  return `${formatCompOtDate(event.date)} ${event.start_time.slice(0, 5)} - ${event.end_time.slice(0, 5)}${timeSuffix()}`;
}

export function compOtShiftTypeLabel(type: CompOtShiftType) {
  switch (type) {
    case 'after_hours':
      return TEXT.COMP_OT_SHIFT_AFTER_HOURS;
    case 'lunch':
      return TEXT.COMP_OT_SHIFT_LUNCH;
    case 'holiday':
      return TEXT.COMP_OT_SHIFT_HOLIDAY;
    default:
      return '';
  }
}
