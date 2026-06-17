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

  const parsedDate = moment(trimmedValue, PARSE_FORMATS, true);
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
  return dateStr(m);
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
