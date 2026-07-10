import { ENDPOINTS } from "../constants/endpoints";
import type { JsonMap } from "./api";
import { ensureSuccess, requestJson } from "./api";

export type Timestamp = {
  id?: string;
  [key: string]: unknown;
};

export type TimestampHistory = {
  id?: string;
  [key: string]: unknown;
};

export type TimestampCalendarDay = {
  date: string;
  day: number | null;
  inTime: string;
  outTime: string;
  status: string;
  note: string;
  stampType?: string;
  canRequest?: boolean;
  isHoliday?: boolean;
  holidayName?: string;
  isLeave?: boolean;
  leaveType?: string;
  // true when the scan-in was flagged late (ABSENCE.timestamp.flag_in = 2)
  isLate?: boolean;
};

export type TimestampCalendar = {
  year: number;
  month: number;
  days: TimestampCalendarDay[];
};

export type SubmitTimestampData = {
  id?: string;
  staff_id: string;
  timestamp: string;
  type: string;
  approver_position: string;
  reason: string;
  in_time: string;
  out_time: string;
};

function createTimestampUrl(
  path = "",
  query?: Record<string, string | number | undefined | null>,
) {
  const url = new URL(`${ENDPOINTS.timestamp}${path}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function normalizeTimestampData(data: unknown): Timestamp[] {
  if (Array.isArray(data)) {
    return data as Timestamp[];
  }

  if (data && typeof data === "object") {
    const item = (data as { item?: unknown }).item;

    if (Array.isArray(item)) {
      return item as Timestamp[];
    }

    if (item && typeof item === "object") {
      return [item as Timestamp];
    }
  }

  return [];
}

function normalizeTimestampHistoryData(
  data: unknown,
): TimestampHistory[] {
  if (Array.isArray(data)) {
    return data as TimestampHistory[];
  }

  if (data && typeof data === "object") {
    const item = (data as { item?: unknown }).item;

    if (Array.isArray(item)) {
      return item as TimestampHistory[];
    }

    if (item && typeof item === "object") {
      return [item as TimestampHistory];
    }
  }

  return [];
}

function normalizeTimestampItem(data: unknown): Timestamp {
  if (Array.isArray(data)) {
    const [firstItem] = data;

    return firstItem && typeof firstItem === "object"
      ? (firstItem as Timestamp)
      : {};
  }

  if (data && typeof data === "object") {
    const item = (data as { item?: unknown }).item;

    if (Array.isArray(item)) {
      const [firstItem] = item;

      return firstItem && typeof firstItem === "object"
        ? (firstItem as Timestamp)
        : {};
    }

    if (item && typeof item === "object") {
      return item as Timestamp;
    }

    return data as Timestamp;
  }

  return {};
}

export async function getTimestampData(
  staffId: string,
  currentYear: number,
) {
  const url = createTimestampUrl("", {
    staff_id: staffId,
    current_year: currentYear,
  });
  const jsonData = await requestJson<JsonMap>(url, { method: "GET" });
  ensureSuccess(jsonData);

  return {
    data: normalizeTimestampData(jsonData.data),
    message: String(jsonData.message ?? ""),
  };
}

export async function getTimestampCalendar(
  staffId: string,
  year: number,
  month: number,
): Promise<TimestampCalendar> {
  const url = createTimestampUrl("/calendar", {
    staff_id: staffId,
    year,
    month,
  });
  const jsonData = await requestJson<JsonMap>(url, { method: "GET" });
  ensureSuccess(jsonData);

  const data = (jsonData.data ?? {}) as Partial<TimestampCalendar>;
  return {
    year: Number(data.year ?? year),
    month: Number(data.month ?? month),
    days: Array.isArray(data.days) ? (data.days as TimestampCalendarDay[]) : [],
  };
}

export async function getTimestampHistoryData(
  staffId: string,
  currentYear: number,
) {
  const url = createTimestampUrl("/history", {
    staff_id: staffId,
    current_year: currentYear,
  });
  const jsonData = await requestJson<JsonMap>(url, { method: "GET" });
  ensureSuccess(jsonData);

  return {
    data: normalizeTimestampHistoryData(jsonData.data),
    message: String(jsonData.message ?? ""),
  };
}

export async function getTimestampViewData(
  forgetId: string,
) {
  const url = createTimestampUrl("/view", {
    id: forgetId,
  });
  const jsonData = await requestJson<JsonMap>(url, { method: "GET" });
  ensureSuccess(jsonData);

  return {
    data: normalizeTimestampItem(jsonData.data),
    message: String(jsonData.message ?? ""),
  };
}

export async function getTimestampInitData(
  staffId: string,
  timestamp: string,
  type: string,
) {
  const url = createTimestampUrl("/init", {
    staff_id: staffId,
    timestamp,
    type,
  });
  const jsonData = await requestJson<JsonMap>(url, { method: "GET" });
  ensureSuccess(jsonData);

  return {
    data: normalizeTimestampItem(jsonData.data),
    message: String(jsonData.message ?? ""),
  };
}

export async function submitTimestamp(
  data: SubmitTimestampData,
  method: "POST" | "PUT" = "POST",
) {
  const url = ENDPOINTS.timestamp;
  const jsonData = await requestJson<JsonMap>(url, {
    method,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(data).toString(),
  });
  ensureSuccess(jsonData);

  return {
    data: jsonData.data,
    message: String(jsonData.message ?? ""),
  };
}

export async function removeTimestamp(id: string) {
  const url = ENDPOINTS.timestamp;
  const jsonData = await requestJson<JsonMap>(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ id, forget_id: id }).toString(),
  });
  ensureSuccess(jsonData);

  return {
    data: jsonData.data,
    message: String(jsonData.message ?? ""),
  };
}

// A single miss-timestamp request awaiting the boss's approval (boss inbox row).
export type TimestampApproval = {
  id: string;
  forgetId?: string | number;
  staffId?: string | number;
  uniStaffId?: string | number;
  name?: string;
  approveName?: string;
  writeDate?: string;
  stampDate?: string;
  inTime?: string | null;
  outTime?: string | null;
  type?: string;
  [key: string]: unknown;
};

export type TimestampApprovalWaiting = {
  show: boolean;
  data: TimestampApproval[];
  message: string;
};

export type TimestampApproveDetail = {
  forgetId?: string | number;
  approveId?: string | number;
  name?: string;
  fullname?: string;
  deptName?: string;
  positionName?: string;
  approverPositionName?: string;
  approveName?: string;
  stampType?: string;
  stampDate?: string;
  writeDate?: string;
  inTime?: string;
  outTime?: string;
  reason?: string;
  [key: string]: unknown;
};

export type SubmitTimestampApproveData = {
  forget_id: string;
  approve_id: string;
  status: "1" | "2";
  reason?: string;
  intime?: string;
  outtime?: string;
  // Requester's staff_id, forwarded so the server can notify them of the result.
  request_staff_id?: string;
};

// Miss-timestamp requests awaiting THIS user's approval. `show` = true means the
// user is a boss/approver and the client should reveal the approval bottom tab.
export async function getForgetApprovalWaiting(
  staffId: string,
): Promise<TimestampApprovalWaiting> {
  const url = createTimestampUrl("/waiting", { staff_id: staffId });
  const jsonData = await requestJson<JsonMap>(url, { method: "GET" });
  ensureSuccess(jsonData);

  return {
    show: jsonData.show === true,
    data: Array.isArray(jsonData.data)
      ? (jsonData.data as TimestampApproval[])
      : [],
    message: String(jsonData.message ?? ""),
  };
}

// A miss-timestamp request the boss has already decided (approved/rejected).
export type TimestampApproved = {
  id: string;
  forgetId?: string | number;
  staffId?: string | number;
  uniStaffId?: string | number;
  name?: string;
  approveName?: string;
  stampDate?: string;
  decisionDate?: string;
  inTime?: string | null;
  outTime?: string | null;
  status?: string;
  statusName?: string;
  reason?: string;
  type?: string;
  [key: string]: unknown;
};

// History of miss-timestamp requests THIS user already decided.
export async function getForgetApprovedHistory(
  staffId: string,
): Promise<TimestampApproved[]> {
  const url = createTimestampUrl("/approved", { staff_id: staffId });
  const jsonData = await requestJson<JsonMap>(url, { method: "GET" });
  ensureSuccess(jsonData);

  return Array.isArray(jsonData.data)
    ? (jsonData.data as TimestampApproved[])
    : [];
}

// Read-only full detail of one miss-timestamp request (any status), incl. the
// approver's decision. Used by the approval-history detail screen.
export type TimestampRecordDetail = {
  forgetId?: string | number;
  approveId?: string | number;
  staffId?: string | number;
  uniStaffId?: string | number;
  name?: string;
  fullname?: string;
  positionName?: string;
  deptName?: string;
  approverName?: string | null;
  approverUniStaffId?: string | number;
  approverPositionName?: string;
  approveName?: string;
  stampType?: string;
  stampDate?: string;
  writeDate?: string;
  inTime?: string | null;
  outTime?: string | null;
  reason?: string;
  status?: string;
  statusName?: string;
  decisionDate?: string | null;
  decisionReason?: string | null;
  [key: string]: unknown;
};

export async function getForgetRecordDetail(
  forgetId: string,
): Promise<TimestampRecordDetail> {
  const url = createTimestampUrl("/detail", { forget_id: forgetId });
  const jsonData = await requestJson<JsonMap>(url, { method: "GET" });
  ensureSuccess(jsonData);

  return (jsonData.data ?? {}) as TimestampRecordDetail;
}

export async function getForgetApproveDetail(
  forgetId: string,
): Promise<TimestampApproveDetail> {
  const url = createTimestampUrl("/approve-view", { forget_id: forgetId });
  const jsonData = await requestJson<JsonMap>(url, { method: "GET" });
  ensureSuccess(jsonData);

  return (jsonData.data ?? {}) as TimestampApproveDetail;
}

export async function submitForgetApprove(data: SubmitTimestampApproveData) {
  const url = createTimestampUrl("/approve-submit");
  const jsonData = await requestJson<JsonMap>(url, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  ensureSuccess(jsonData);

  return {
    data: jsonData.data,
    message: String(jsonData.message ?? ""),
  };
}
