import moment from 'moment';

const DATE_TIME_FORMAT = 'DD MMMM YYYY - H:mm';
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

export function formatDateTime(value: string) {
  const parsedDate = parseDateTime(value);

  if (!parsedDate) {
    return value;
  }

  return parsedDate.format(DATE_TIME_FORMAT);
}

export function formatDateAndTime(dateValue: string, timeValue: string) {
  const value = [dateValue, timeValue].filter(Boolean).join(' ');
  return value ? formatDateTime(value) : '';
}
