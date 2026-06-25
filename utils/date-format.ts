import moment from 'moment';
import 'moment/locale/th';

moment.locale('th');

const PARSE_FORMATS = [
  moment.ISO_8601,
  'YYYY-MM-DD HH:mm:ss',
  'YYYY-MM-DD HH:mm',
  'YYYY-MM-DD',
  'DD/MM/YYYY HH:mm:ss',
  'DD/MM/YYYY HH:mm',
  'DD/MM/YYYY',
  'DD-MM-YYYY HH:mm:ss',
  'DD-MM-YYYY HH:mm',
  'DD-MM-YYYY',
];

export function parseDateTime(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  // Phoenix API returns Buddhist Era years (e.g. 2569 = CE 2026). Convert to CE before parsing.
  const normalized = trimmedValue.replace(/^(\d{4})/, (_, y) => {
    const n = parseInt(y, 10);
    return n > 2400 ? String(n - 543) : y;
  });

  const parsedDate = moment(normalized, PARSE_FORMATS, true);
  return parsedDate.isValid() ? parsedDate : null;
}

function beYear(m: moment.Moment) {
  return m.year() + 543;
}

function dateStr(m: moment.Moment) {
  return `${m.format('DD MMMM')} ${beYear(m)}`;
}

function dateTimeStr(m: moment.Moment) {
  return `${m.format('DD MMMM')} ${beYear(m)} - ${m.format('H:mm')}`;
}

export function formatDateTime(value: string) {
  const m = parseDateTime(value);
  if (!m) return value;
  return dateTimeStr(m);
}

export function formatNewsDate(value: string) {
  const m = parseDateTime(value);
  if (!m) return value;
  const base = m.locale('en').format('D MMMM YYYY');
  const hasTime = /\d{1,2}:\d{2}/.test(value.trim());
  return hasTime ? `${base} - ${m.format('HH:mm')}` : base;
}

export function formatDateOnly(value: string) {
  const m = parseDateTime(value);
  if (!m) return value.split(/[T ]/)[0] || value;
  return dateStr(m);
}

export function formatFullDate(value: string) {
  const m = parseDateTime(value);
  if (!m) return value.split(/[T ]/)[0] || value;
  return dateStr(m);
}

export function formatDateRange(startDate: string, endDate: string) {
  if (!startDate && !endDate) return '';
  if (!startDate || !endDate) return formatDateOnly(startDate || endDate);

  const s = parseDateTime(startDate);
  const e = parseDateTime(endDate);

  if (!s || !e) {
    const fs = formatDateOnly(startDate);
    const fe = formatDateOnly(endDate);
    return fs === fe ? fs : `${fs} - ${fe}`;
  }

  if (s.isSame(e, 'day')) {
    return dateStr(s);
  }

  if (s.isSame(e, 'month')) {
    return `${s.format('DD')} - ${e.format('DD')} ${e.format('MMMM')} ${beYear(e)}`;
  }

  if (s.isSame(e, 'year')) {
    return `${s.format('DD MMMM')} - ${e.format('DD MMMM')} ${beYear(e)}`;
  }

  return `${dateStr(s)} - ${dateStr(e)}`;
}

export function formatDateAndTime(dateValue: string, timeValue: string) {
  const value = [dateValue, timeValue].filter(Boolean).join(' ');
  return value ? formatDateTime(value) : '';
}

export function formatMeetingDetailDate(value: string): string {
  const m = parseDateTime(value);
  if (!m) return value;
  const hasTime = /\d{1,2}:\d{2}/.test(value.trim());
  const dayName = m.format('dddd');
  const fullDayName = dayName.startsWith('วัน') ? dayName : `วัน${dayName}`;
  const datePart = `${fullDayName}ที่ ${m.format('D MMMM')} พ.ศ. ${beYear(m)}`;
  const timePart = hasTime ? ` • ${m.format('HH:mm')} น.` : '';
  return `${datePart}${timePart}`;
}

export function formatTimeOnly(value: string): string {
  if (!value || !/\d{1,2}:\d{2}/.test(value)) return '';
  const m = parseDateTime(value);
  if (m) return m.format('H:mm');
  const match = value.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : '';
}
