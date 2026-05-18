import type { Meeting } from '../models/types';
import { createPhoenixUrl, ensureSuccess, requestJson, type JsonMap } from './api';

export async function listMeeting(
  userId = '',
  type = '',
): Promise<Meeting[]> {
  const url = createPhoenixUrl('/meetingv2/api/index.php/meeting/list', {
    user_id: userId,
    type,
  });
  const json = await requestJson<JsonMap>(url);
  ensureSuccess(json);

  return Array.isArray(json.data) ? (json.data as Meeting[]) : [];
}
