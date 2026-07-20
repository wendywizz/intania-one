import { ENDPOINTS } from '../constants/endpoints';
import { ENV } from '../constants/config';
import { buildHttpsUrl, fetchWithApiDelay } from './api';

const SCHEDULE_TYPE_EXECUTIVE = 'exc';
const GOOGLE_CALENDAR_API_BASE_URL = 'https://www.googleapis.com';

type ScoobaScheduleItem = {
  attributes?: {
    name?: string | null;
    source?: string | null;
    // Executive's university staff id — accept the common casings so the app
    // works whatever exact key the content type uses.
    UNI_ID?: string | number | null;
    uni_id?: string | number | null;
    uniId?: string | number | null;
    UNI_STAFF_ID?: string | number | null;
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
  // University staff id of the executive who owns this calendar; used to build
  // the profile-photo URL (photoBase + uniId + ".jpg").
  uniId: string;
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

function dedupeCalendarSources(sources: CalendarSource[]) {
  const uniqueSources = new Map<string, CalendarSource>();

  sources.forEach((source) => {
    const name = source.name.trim();
    const calendarSource = source.source.trim().replace(/^"+|"+$/g, '');
    const key = calendarSource.toLowerCase();

    if (name && calendarSource && !uniqueSources.has(key)) {
      uniqueSources.set(key, {
        name,
        source: calendarSource,
        uniId: source.uniId,
      });
    }
  });

  return Array.from(uniqueSources.values());
}

export async function getExecutiveCalendarSources(): Promise<CalendarSource[]> {
  const apiKey = ENV.scoobaApiKey.trim();

  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_SCOOBA_API_KEY');
  }

  const response = await fetchWithApiDelay(
    buildHttpsUrl(ENDPOINTS.scooba_dev, ENDPOINTS.execCalendar, {
      'filters[type][$eq]': SCHEDULE_TYPE_EXECUTIVE,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Unable to load calendar sources (${response.status})`);
  }

  const json = (await response.json()) as {data?: ScoobaScheduleItem[]};
  return dedupeCalendarSources((json.data ?? [])
    .map((item) => {
      const attrs = item.attributes;
      const rawUniId =
        attrs?.UNI_ID ?? attrs?.uni_id ?? attrs?.uniId ?? attrs?.UNI_STAFF_ID;
      return {
        name: attrs?.name ?? '',
        source: attrs?.source ?? '',
        uniId: rawUniId != null ? String(rawUniId).trim() : '',
      };
    })
    .filter((item) => item.name && item.source));
}

export async function getCalendarEventsOfMonth(
  googleCalendarId: string,
  activeDateKey: string,
): Promise<CalendarEvent[]> {
  const apiKey = ENV.googleApiKey;
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
      GOOGLE_CALENDAR_API_BASE_URL,
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
