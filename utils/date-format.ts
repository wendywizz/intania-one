import moment from 'moment';

const DATE_TIME_FORMAT = 'DD MMMM YYYY - H:mm';
const FULL_DATE_FORMAT = 'DD MMMM YYYY';
const DATE_FORMAT = 'D MMMM YYYY';
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

export function formatDateOnly(value: string) {
  const parsedDate = parseDateTime(value);

  if (!parsedDate) {
    return value.split(/[T ]/)[0] || value;
  }

  return parsedDate.format(DATE_FORMAT);
}

export function formatFullDate(value: string) {
  const parsedDate = parseDateTime(value);

  if (!parsedDate) {
    return value.split(/[T ]/)[0] || value;
  }

  return parsedDate.format(FULL_DATE_FORMAT);
}

export function formatDateRange(startDate: string, endDate: string) {
  if (!startDate && !endDate) {
    return '';
  }

  if (!startDate || !endDate) {
    return formatDateOnly(startDate || endDate);
  }

  const parsedStartDate = parseDateTime(startDate);
  const parsedEndDate = parseDateTime(endDate);

  if (!parsedStartDate || !parsedEndDate) {
    const formattedStartDate = formatDateOnly(startDate);
    const formattedEndDate = formatDateOnly(endDate);
    return formattedStartDate === formattedEndDate ? formattedStartDate : `${formattedStartDate} - ${formattedEndDate}`;
  }

  if (parsedStartDate.isSame(parsedEndDate, 'day')) {
    return parsedStartDate.format(DATE_FORMAT);
  }

  if (parsedStartDate.isSame(parsedEndDate, 'month')) {
    return `${parsedStartDate.format('D')} - ${parsedEndDate.format(DATE_FORMAT)}`;
  }

  if (parsedStartDate.isSame(parsedEndDate, 'year')) {
    return `${parsedStartDate.format('D MMMM')} - ${parsedEndDate.format(DATE_FORMAT)}`;
  }

  return `${parsedStartDate.format(DATE_FORMAT)} - ${parsedEndDate.format(DATE_FORMAT)}`;
}

export function formatDateAndTime(dateValue: string, timeValue: string) {
  const value = [dateValue, timeValue].filter(Boolean).join(' ');
  return value ? formatDateTime(value) : '';
}
