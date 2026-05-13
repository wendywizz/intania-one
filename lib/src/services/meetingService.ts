import {ENDPOINTS} from '../constants/endpoints';
import type {Meeting, Result} from '../models/types';
import {buildHttpsUrl} from './api';
import {PROCESS} from '../constants/domain';

export async function listMeeting(
  userId = '',
  type = '',
): Promise<Result<Meeting[]>> {
  try {
    const url = buildHttpsUrl(ENDPOINTS.phoenix, '/meetingv2/api/index.php/meeting/list', {
      user_id: userId,
      type,
    });
    const response = await fetch(url, {headers: {'Content-Type': 'application/json'}});
    const json = await response.json();
    const data = Array.isArray(json.data) ? json.data : [];
    return {
      processType: PROCESS.success,
      data,
      totalCount: data.length,
      message: json.message ?? '',
    };
  } catch (error) {
    return {
      processType: PROCESS.error,
      data: [],
      totalCount: 0,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
