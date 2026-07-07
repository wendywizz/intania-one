import { createApiUrl, requestJson } from './api';

export type RepairComputerRoleKey = 'user' | 'foreman' | 'worker';

export type ActiveSummaryRepairTask = {
  // Stable task key mapped to a label on the client (see index.tsx REPAIR_TASK_LABELS).
  key: string;
  count: number;
};

export type ActiveSummaryRepairComputer = {
  success: boolean;
  role: RepairComputerRoleKey;
  tasks: ActiveSummaryRepairTask[];
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

export type ActiveSummaryTimestamp = {
  success: boolean;
  items: Record<string, unknown>[];
  year: number;
  error?: string;
};

export type ActiveSummaryData = {
  repairComputer: ActiveSummaryRepairComputer;
  absence: ActiveSummaryAbsence;
  meeting: ActiveSummaryMeeting;
  timestamp: ActiveSummaryTimestamp;
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
