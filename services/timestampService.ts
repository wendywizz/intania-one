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

// Candidate field names for the company attendance-cycle start / end dates that
// the response's `data` object may carry alongside the `item` array.
const CYCLE_START_FIELDS = [
  "date_start", "dateStart", "start_date", "startDate",
  "cycle_start", "cycleStart", "begin_date", "beginDate", "from_date", "fromDate",
];
const CYCLE_END_FIELDS = [
  "date_end", "dateEnd", "end_date", "endDate",
  "cycle_end", "cycleEnd", "finish_date", "finishDate", "to_date", "toDate",
];

function pickDateField(data: unknown, fields: string[]): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "";
  const record = data as Record<string, unknown>;
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && value) return String(value);
  }
  return "";
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

  const raw = jsonData.data;
  return {
    data: normalizeTimestampData(raw),
    cycleStart: pickDateField(raw, CYCLE_START_FIELDS),
    cycleEnd: pickDateField(raw, CYCLE_END_FIELDS),
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

/**
 * The last answer /waiting gave, kept for whoever asks next.
 *
 * Two places need it within a second of each other — the home screen's approval
 * card and the timestamp tab bar, which uses `show` to decide whether the
 * approval tab exists. Holding the previous answer lets the tab bar draw the
 * right tabs on its first frame instead of blocking on the network to find out.
 *
 * Not time-based on purpose: every caller still fetches and overwrites this, so
 * what it holds is at worst one navigation stale, and nothing renders from it
 * that a wrong guess would make unsafe — the worst case is one tab appearing a
 * moment later than it could have.
 */
let lastForgetApprovalWaiting: {
  staffId: string;
  value: TimestampApprovalWaiting;
} | null = null;

/** The cached answer for `staffId`, or null if nobody has asked yet. */
export function peekForgetApprovalWaiting(
  staffId: string,
): TimestampApprovalWaiting | null {
  return lastForgetApprovalWaiting?.staffId === staffId
    ? lastForgetApprovalWaiting.value
    : null;
}

// Miss-timestamp requests awaiting THIS user's approval. `show` = true means the
// user is a boss/approver and the client should reveal the approval bottom tab.
export async function getForgetApprovalWaiting(
  staffId: string,
): Promise<TimestampApprovalWaiting> {
  const url = createTimestampUrl("/waiting", { staff_id: staffId });
  const jsonData = await requestJson<JsonMap>(url, { method: "GET" });
  ensureSuccess(jsonData);

  const value: TimestampApprovalWaiting = {
    show: jsonData.show === true,
    data: Array.isArray(jsonData.data)
      ? (jsonData.data as TimestampApproval[])
      : [],
    message: String(jsonData.message ?? ""),
  };

  lastForgetApprovalWaiting = { staffId, value };

  return value;
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

/* -------------------------------------------------------------------------- */
/* ลงเวลาปฏิบัติราชการของอาจารย์ (lecturer stamping)                            */
/*                                                                            */
/* A feature of this module, not one of its own: to a user it is one more      */
/* thing the "การลงเวลา" screen does. It reaches a different upstream          */
/* application on the gateway's far side, but from here it is two more paths   */
/* under /api/timestamp.                                                      */
/*                                                                            */
/* Every rule about who may stamp, when, and from where is the gateway's and   */
/* the upstream's; nothing below knows any of them and must not start          */
/* guessing, or the screen and the server would disagree about the same day.   */
/* -------------------------------------------------------------------------- */

export type LectTimestampStamp = {
  /** 'YYYY-MM-DD' */
  date: string;
  /** Always 08:00:00 — a lecturer records the day, not the hour they arrived. */
  inTime: string;
  /** Always 16:30:00, for the same reason. */
  outTime: string;
  /** When they actually tapped, 'HH:MM:SS'. Empty on older rows. */
  stampedAt: string;
};

export type LectTimestampStatus = {
  staffId: string;
  isLecturer: boolean;
  /** Whether a row exists for today. */
  stamped: boolean;
  /** Whether a stamp would be accepted right now. */
  canStamp: boolean;
  /** '' | 'not_lecturer' | 'already_stamped' | 'weekend' | 'outside_hours' | 'off_network' */
  reason: string;
  /**
   * The sentence to show for `reason`. Never empty, and it comes from the
   * gateway (`config/text.js`) rather than from constants/text.ts here — the
   * wording and the rule that produced it then cannot drift apart, and it can
   * change without a new build.
   */
  message: string;
  stamp: LectTimestampStamp | null;
  serverDate: string;
  serverTime: string;
  /** Only meaningful on `stampToday()`: whether this call wrote the row. */
  created: boolean;
};

function toLectStatus(json: JsonMap): LectTimestampStatus {
  const data = (json?.data ?? {}) as Record<string, unknown>;
  const stamp = data.stamp as Record<string, unknown> | null | undefined;
  const str = (value: unknown) => (value == null ? "" : String(value));

  return {
    staffId: str(data.staffId),
    isLecturer: data.isLecturer === true,
    stamped: data.stamped === true,
    canStamp: data.canStamp === true,
    reason: str(data.reason),
    message: str(data.message),
    stamp: stamp
      ? {
          date: str(stamp.date),
          inTime: str(stamp.inTime),
          outTime: str(stamp.outTime),
          stampedAt: str(stamp.stampedAt),
        }
      : null,
    serverDate: str(data.serverDate),
    serverTime: str(data.serverTime),
    created: data.created === true,
  };
}

/**
 * What today looks like for this lecturer.
 *
 * Safe to call on every screen focus: it writes nothing and changes nothing
 * about what a later stamp will do.
 */
export async function getLectTimestampStatus(
  staffId: string,
): Promise<LectTimestampStatus> {
  const url = createTimestampUrl("/lecturer", { staff_id: staffId });
  const jsonData = await requestJson<JsonMap>(url, { method: "GET" });
  ensureSuccess(jsonData);

  return toLectStatus(jsonData);
}

/**
 * Stamp today.
 *
 * A refusal is a resolved value, not a throw: `created` false with a `reason`
 * and a `message` covers "you already stamped", "it is Saturday" and "you are
 * not on the faculty network" alike, and the screen shows the message either
 * way. Only a broken request or an unreachable gateway rejects.
 *
 * Which network the phone is on is decided by the gateway, which can see the
 * connection — deliberately not sent from here, where it could be typed.
 */
export async function stampToday(staffId: string): Promise<LectTimestampStatus> {
  const url = createTimestampUrl("/lecturer/stamp");
  const jsonData = await requestJson<JsonMap>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staff_id: staffId }),
  });
  ensureSuccess(jsonData);

  return toLectStatus(jsonData);
}
