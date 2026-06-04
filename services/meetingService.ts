import { ENDPOINTS } from '../constants/endpoints';
import type { Meeting } from '../models/types';
import { ensureSuccess, requestJson, type JsonMap } from './api';

function createMeetingUrl(
  query?: Record<string, string | number | undefined | null>,
) {
  const url = new URL(ENDPOINTS.meeting);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

export async function listMeeting(
  userId = '',
  type = '',
): Promise<Meeting[]> {
  const url = createMeetingUrl({
    user_id: userId,
    type,
  });
  const json = await requestJson<JsonMap>(url);
  ensureSuccess(json);

  return Array.isArray(json.data) ? (json.data as Meeting[]) : [];
}
