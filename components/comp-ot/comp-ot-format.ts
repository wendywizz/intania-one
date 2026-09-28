import moment from 'moment';
import 'moment/locale/th';

import { TEXT } from '@/constants/text';
import type { CompOtEvent, CompOtShiftType } from '@/services/compOtService';

/** "อ. 30 กันยายน 2569" from a plain YYYY-MM-DD, in Buddhist-era years. */
export function formatCompOtDate(dateStr: string) {
  const m = moment(dateStr, 'YYYY-MM-DD').locale('th');
  return m.isValid() ? `${m.format('ddd D MMMM')} ${m.year() + 543}` : dateStr;
}

/** "อ. 30 กันยายน 2569 16:30 - 20:30 น." */
export function formatCompOtShift(event: Pick<CompOtEvent, 'date' | 'start_time' | 'end_time'>) {
  return `${formatCompOtDate(event.date)} ${event.start_time.slice(0, 5)} - ${event.end_time.slice(0, 5)} น.`;
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
