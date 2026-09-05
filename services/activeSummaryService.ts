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

/**
 * Today's room-and-time slots — one entry per slot, not per booking, so a term
 * booking counts once for each of today's periods rather than once for the term.
 */
export type ActiveSummaryBookingRoom = {
  success: boolean;
  items: Record<string, unknown>[];
  date: string;
  error?: string;
};

/**
 * Whether the signed-in lecturer has stamped today.
 *
 * No `items`, unlike its neighbours: there is exactly one row a day and the
 * home screen only needs to know whether it exists. `isLecturer` false is a
 * real answer — the gateway asks for everybody, because it has no cheaper way
 * to tell who is teaching staff — and the home screen leaves the card out on it.
 */
export type ActiveSummaryLectTimestamp = {
  success: boolean;
  isLecturer: boolean;
  stamped: boolean;
  date: string;
  error?: string;
};

export type ActiveSummaryData = {
  repairComputer: ActiveSummaryRepairComputer;
  absence: ActiveSummaryAbsence;
  meeting: ActiveSummaryMeeting;
  timestamp: ActiveSummaryTimestamp;
  bookingRoom: ActiveSummaryBookingRoom;
  lectTimestamp: ActiveSummaryLectTimestamp;
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
