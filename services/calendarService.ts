import { ENDPOINTS } from '../constants/endpoints';
import { buildHttpsUrl, fetchWithApiDelay } from './api';

const SCHEDULE_TYPE_EXECUTIVE = 'exc';

type ScoobaScheduleItem = {
  attributes?: {
    name?: string | null;
    source?: string | null;
  };
};

type GoogleCalendarDate = {
  date?: string;
  dateTime?: string;
};

type GoogleCalendarItem = {
  id?: string;
  summary?: string;
  start?: GoogleCalendarDate;
  end?: GoogleCalendarDate;
  location?: string;
  status?: string;
};

export type CalendarSource = {
  name: string;
  source: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  status: string;
  isAllDay: boolean;
};

function getEnv(name: string) {
  switch (name) {
    case 'EXPO_PUBLIC_SCOOBA_API_TOKEN':
      return process.env.EXPO_PUBLIC_SCOOBA_API_TOKEN ?? '';
    case 'EXPO_PUBLIC_GOOGLE_API_KEY':
      return process.env.EXPO_PUBLIC_GOOGLE_API_KEY ?? '';
    default:
      return '';
  }
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthRange(dateKey: string) {
  const [year, month] = dateKey.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  return {
    timeMin: `${toDateKey(firstDay)}T00:00:00Z`,
    timeMax: `${toDateKey(lastDay)}T23:59:59Z`,
  };
}

function formatCalendarDate(value?: GoogleCalendarDate, fallback = '') {
  if (!value) {
    return fallback;
  }

  if (value.dateTime) {
    return toDateKey(new Date(value.dateTime));
  }

  return value.date ?? fallback;
}

function formatCalendarTime(value?: GoogleCalendarDate) {
  if (!value?.dateTime) {
    return '';
  }

  return new Date(value.dateTime).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function mapCalendarEvent(item: GoogleCalendarItem): CalendarEvent {
  const startDate = formatCalendarDate(item.start);
  const isAllDay = Boolean(item.start?.date && !item.start?.dateTime);

  return {
    id: item.id ?? `${startDate}-${item.summary ?? ''}`,
    title: item.summary ?? '',
    date: startDate,
    startTime: formatCalendarTime(item.start),
    endTime: formatCalendarTime(item.end),
    location: item.location ?? '',
    status: item.status ?? '',
    isAllDay,
  };
}

export async function getExecutiveCalendarSources(): Promise<CalendarSource[]> {
  const token = getEnv('EXPO_PUBLIC_SCOOBA_API_TOKEN').trim();

  if (!token) {
    throw new Error('Missing EXPO_PUBLIC_SCOOBA_API_TOKEN');
  }

  const response = await fetchWithApiDelay(
    buildHttpsUrl(ENDPOINTS.scooba_dev, '/scooba/api/schedules/', {
      'filters[type][$eq]': SCHEDULE_TYPE_EXECUTIVE,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Unable to load calendar sources (${response.status})`);
  }

  const json = (await response.json()) as {data?: ScoobaScheduleItem[]};
  return (json.data ?? [])
    .map((item) => ({
      name: item.attributes?.name ?? '',
      source: item.attributes?.source ?? '',
    }))
    .filter((item) => item.name && item.source);
}

export async function getCalendarEventsOfMonth(
  googleCalendarId: string,
  activeDateKey: string,
): Promise<CalendarEvent[]> {
  const apiKey = getEnv('EXPO_PUBLIC_GOOGLE_API_KEY');
  const {timeMin, timeMax} = monthRange(activeDateKey);
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin,
    timeMax,
  });

  if (apiKey) {
    params.set('key', apiKey);
  }

  const response = await fetchWithApiDelay(
    buildHttpsUrl(
      ENDPOINTS.scooba_dev,
      `/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events`,
      Object.fromEntries(params),
    ),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Unable to load calendar events');
  }

  const json = (await response.json()) as {items?: GoogleCalendarItem[]};
  return (json.items ?? []).map(mapCalendarEvent).filter((item) => item.date);
}
