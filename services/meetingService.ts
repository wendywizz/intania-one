import type { Meeting, Result } from '../models/types';
import { createPhoenixUrl, requestJson, toErrorListResult, toResultList, type JsonMap } from './api';

export async function listMeeting(
  userId = '',
  type = '',
): Promise<Result<Meeting[]>> {
  try {
    const url = createPhoenixUrl('/meetingv2/api/index.php/meeting/list', {
      user_id: userId,
      type,
    });
    const json = await requestJson<JsonMap>(url);
    return toResultList<Meeting>(json);
  } catch (error) {
    return toErrorListResult<Meeting>(error);
  }
}
