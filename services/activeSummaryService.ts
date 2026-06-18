import { createApiUrl, requestJson } from './api';

export type ActiveSummaryRepairComputer = {
  success: boolean;
  items: Record<string, unknown>[];
  totalCount: number;
  error?: string;
};

export type ActiveSummaryAbsence = {
  success: boolean;
  pending: Record<string, unknown>[];
  cancelled: Record<string, unknown>[];
  error?: string;
};

export type ActiveSummaryMeeting = {
  success: boolean;
  items: Record<string, unknown>[];
  date: string;
  error?: string;
};

export type ActiveSummaryForgotTimestamp = {
  success: boolean;
  items: Record<string, unknown>[];
  year: number;
  error?: string;
};

export type ActiveSummaryData = {
  repairComputer: ActiveSummaryRepairComputer;
  absence: ActiveSummaryAbsence;
  meeting: ActiveSummaryMeeting;
  forgotTimestamp: ActiveSummaryForgotTimestamp;
};

type ApiResponse = {
  data: ActiveSummaryData;
  message: string;
};

export async function getActiveSummary(
  staffId: string,
  userId?: string,
): Promise<ActiveSummaryData> {
  const url = createApiUrl('/api/active-summary', {
    staff_id: staffId,
    user_id: userId || staffId,
  });
  const json = await requestJson<ApiResponse>(url);
  return json.data;
}
