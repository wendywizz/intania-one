import { ENDPOINTS } from "../constants/endpoints";
import type { JsonMap } from "./api";
import { ensureSuccess, fetchWithTimeout, MESSAGE_SERVER_ERROR, requestJson } from "./api";

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

/** Where the phone is, for the geofence check. See services/deviceLocation.ts. */
export type LectPosition = { lat: number; lon: number };

/**
 * `lat`/`lon` for the request, or nothing at all when there is no usable fix.
 *
 * Omitted rather than sent empty or as 0,0 — the gateway and the upstream both
 * read an absent pair as "the device did not say" and answer `no_location`,
 * which is a different refusal from "you are too far away" and carries
 * different advice. Sending 0,0 would instead be measured against the faculty
 * and refused as `off_site`: the wrong reason, and the wrong instruction.
 */
function positionQuery(position?: LectPosition | null) {
  if (!position) return {};

  const lat = Number(position.lat);
  const lon = Number(position.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) {
    return {};
  }

  return { lat: String(lat), lon: String(lon) };
}

/**
 * What today looks like for this lecturer.
 *
 * Safe to call on every screen focus: it writes nothing and changes nothing
 * about what a later stamp will do.
 *
 * The position is passed on every read, not just on the stamp, so the screen
 * can show the true answer before the button is pressed — a card that says
 * "ลงเวลาได้" and then refuses on tap would be worse than no card.
 */
export async function getLectTimestampStatus(
  staffId: string,
  position?: LectPosition | null,
): Promise<LectTimestampStatus> {
  const url = createTimestampUrl("/lecturer", {
    staff_id: staffId,
    ...positionQuery(position),
  });
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
 *
 * The position is the exception, and only because there is no alternative: the
 * server cannot observe where the phone is, so it has to be told. It is
 * therefore the weakest of the three anti-fraud checks and is treated as one
 * more input to a server-side rule, never as a decision made here.
 */
export async function stampToday(
  staffId: string,
  position?: LectPosition | null,
): Promise<LectTimestampStatus> {
  const url = createTimestampUrl("/lecturer/stamp");
  const jsonData = await requestJson<JsonMap>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staff_id: staffId, ...positionQuery(position) }),
  });
  ensureSuccess(jsonData);

  return toLectStatus(jsonData);
}

/* -------------------------------------------------------------------------- */
/* ลงเวลาบุคลากรทั่วไป (general staff)                                          */
/*                                                                            */
/* คนละวันทำงานกับอาจารย์: ลงเข้าและลงออกแยกกัน ด้วยเวลาจริง และมีช่วงห้าม        */
/* ลงเวลาตาม ABSENCE.time_period                                              */
/*                                                                            */
/* ลงเวลาด้วยการสแกนใบหน้า: แอปส่งภาพเมื่อผู้ใช้กะพริบตา gateway ตรวจว่าเป็นหน้า   */
/* ของผู้ที่ล็อกอิน แล้วลงเวลาผ่านระบบเดียวกับเครื่องสแกนที่ประตู กฎทุกข้อตัดสินที่ */
/* server ฝั่งนี้แค่แสดงผล                                                     */
/* -------------------------------------------------------------------------- */

export type StaffStampRole = 'lecturer' | 'guard' | 'staff' | 'unknown';

/** What a stamp now would record; '' when none would be accepted. */
export type StaffStampKind = '' | 'in' | 'out' | 'noon_in' | 'noon_out' | 'out_without_in';

const STAFF_STAMP_KINDS: readonly StaffStampKind[] = ['in', 'out', 'noon_in', 'noon_out', 'out_without_in'];

export type StaffTimestampStamp = {
  /** 'YYYY-MM-DD' */
  date: string;
  /** เวลาเข้าจริง 'HH:MM:SS' */
  inTime: string;
  /** เวลาออกจริง — ว่างเมื่อยังไม่ได้ลงออก (ไม่ใช่ 00:00:00) */
  outTime: string;
  /** เครื่องบันทึกว่ามาสาย (flag_in = 2) */
  isLate: boolean;
};

export type StaffTimestampStatus = {
  staffId: string;
  role: StaffStampRole;
  isStaff: boolean;
  stamp: StaffTimestampStamp | null;
  /** '' | 'in' | 'out' — ถ้าลงเวลาตอนนี้จะเป็นเข้าหรือออก */
  nextStamp: string;
  /** ถ้าสแกนตอนนี้จะบันทึกเป็นอะไร ตัดสินที่ server จากช่วงเวลาและข้อมูลวันนี้รวมกัน */
  stampKind: StaffStampKind;
  /** ต้องถามยืนยันก่อนเปิดกล้อง — ออกช่วงเที่ยง, เข้าช่วงเที่ยง, ออกโดยไม่มีเวลาเข้า */
  needsConfirm: boolean;
  /** ข้อความถามยืนยัน มาจาก gateway */
  confirmMessage: string;
  /** 'HH:MM' เวลาเริ่มช่วงลงเวลาออก; '' เมื่อไม่ทราบ */
  outFrom: string;
  canStamp: boolean;
  /**
   * '' | 'not_staff' | 'guard' | 'already_in' | 'already_complete' | 'on_travel'
   * | 'weekend' | 'outside_hours' | 'irregular_record' | 'off_network' | 'vpn'
   * | 'off_site' | 'no_location' | 'kind_changed' | 'upstream_error'
   */
  reason: string;
  /** ประโยคที่จะแสดง มาจาก gateway เสมอ ไม่ว่างแน่นอน */
  message: string;
  /** ลงทะเบียนใบหน้าแล้วหรือยัง; null = ตรวจไม่ได้ในตอนนี้ ให้การสแกนเป็นตัวตัดสิน */
  faceRegistered: boolean | null;
  /** เฉพาะผลการลงเวลา: ครั้งนี้บันทึกจริง */
  created: boolean;
  serverDate: string;
  serverTime: string;
};

/** ผลของการสแกนใบหน้าหนึ่งครั้ง */
export type StaffFaceStampResult = {
  /** หน้าตรงกับผู้ที่ล็อกอิน — false = ให้สแกนต่อ */
  passed: boolean;
  /** 'no_face' | 'face_mismatch' | 'too_fast' เมื่อ passed เป็น false, หรือเหตุผลของ status */
  reason: string;
  message: string;
  /** % ความเหมือนของผู้ที่ล็อกอิน ตามสูตรเครื่องสแกนที่ประตู (ผ่านที่ 90%); null เมื่อไม่อยู่ในรายการที่ใกล้เคียง */
  similarity: number | null;
  /** ผลการลงเวลาหลังหน้าตรง — null เมื่อการตรวจหน้าหยุดไว้ก่อน */
  status: StaffTimestampStatus | null;
  created: boolean;
  /** gateway อยู่ในโหมดทดสอบ — ไม่มีการบันทึกจริง */
  dryRun: boolean;
};

/**
 * Whether a stamp time means "this did not happen" rather than a real time.
 *
 * ABSENCE.timestamp spells both halves of a missing pair as 00:00:00 — the
 * readers write it for a day with no departure yet, and `f_out_stamp_not_in()`
 * writes it as the ARRIVAL for somebody who left without one on record. Either
 * way the screen wants a dash, and 00:00 would put a specific, wrong time on it.
 */
function isMissingTime(value: unknown): boolean {
  const text = value == null ? "" : String(value).trim();

  return text === "" || text === "00:00:00" || text === "00:00";
}

function staffStatusFrom(data: Record<string, unknown>): StaffTimestampStatus {
  const stamp = data.stamp as Record<string, unknown> | null | undefined;
  const str = (value: unknown) => (value == null ? "" : String(value));
  const kind = str(data.stampKind) as StaffStampKind;

  return {
    staffId: str(data.staffId),
    role: (str(data.role) || 'unknown') as StaffStampRole,
    isStaff: data.isStaff === true,
    stamp: stamp
      ? {
          date: str(stamp.date),
          inTime: isMissingTime(stamp.inTime) ? '' : str(stamp.inTime),
          outTime: isMissingTime(stamp.outTime) ? '' : str(stamp.outTime),
          isLate: stamp.isLate === true,
        }
      : null,
    nextStamp: str(data.nextStamp),
    // Only a kind this app knows how to label and confirm; anything else is
    // treated as "nothing to stamp" rather than guessed at.
    stampKind: STAFF_STAMP_KINDS.includes(kind) ? kind : '',
    needsConfirm: data.needsConfirm === true,
    confirmMessage: str(data.confirmMessage),
    outFrom: str(data.outFrom),
    canStamp: data.canStamp === true,
    reason: str(data.reason),
    message: str(data.message),
    faceRegistered: typeof data.faceRegistered === 'boolean' ? data.faceRegistered : null,
    created: data.created === true,
    serverDate: str(data.serverDate),
    serverTime: str(data.serverTime),
  };
}

function toStaffStatus(json: JsonMap): StaffTimestampStatus {
  return staffStatusFrom((json?.data ?? {}) as Record<string, unknown>);
}

/**
 * สถานะการลงเวลาวันนี้ของบุคลากรทั่วไป
 *
 * เรียกได้ทุกครั้งที่เข้าหน้าจอ — ไม่เขียนอะไรทั้งสิ้น กฎทั้งหมด (ช่วงเวลา สาย
 * เครือข่าย VPN พิกัด) ตัดสินที่ server ฝั่งนี้แค่แสดงผล ส่งพิกัดไปด้วยทุกครั้ง
 * เพื่อให้หน้าจอแสดงผลเดียวกับที่การสแกนจะได้รับ
 */
export async function getStaffTimestampStatus(
  staffId: string,
  position?: LectPosition | null,
): Promise<StaffTimestampStatus> {
  const url = createTimestampUrl("/staff", {
    staff_id: staffId,
    ...positionQuery(position),
  });
  const jsonData = await requestJson<JsonMap>(url, { method: "GET" });
  ensureSuccess(jsonData);

  return toStaffStatus(jsonData);
}

/**
 * ส่งภาพใบหน้าหนึ่งภาพเพื่อลงเวลา
 *
 * A face that does not match resolves `passed: false` — the screen scans again.
 * A matched face resolves with the attendance verdict in `status`, which may be
 * the stamp, a refusal, or a dry run. Only a broken request or an unreachable
 * gateway rejects.
 *
 * `expectKind` is the stamp the screen showed (and confirmed, when unusual); the
 * server refuses if the window has moved on since.
 */
export async function submitStaffFaceStamp({
  staffId,
  photoUri,
  expectKind,
  position,
}: {
  staffId: string;
  photoUri: string;
  expectKind: StaffStampKind;
  position?: LectPosition | null;
}): Promise<StaffFaceStampResult> {
  const form = new FormData();
  form.append('staff_id', staffId);
  form.append('expect_kind', expectKind);

  const coords = positionQuery(position);
  if (coords.lat && coords.lon) {
    form.append('lat', coords.lat);
    form.append('lon', coords.lon);
  }

  // React Native's FormData sends a file part when given { uri, name, type };
  // the DOM typings do not know that shape, hence the cast.
  form.append('file', { uri: photoUri, name: 'face.jpg', type: 'image/jpeg' } as unknown as Blob);

  // fetchWithTimeout rather than requestJson: requestJson forces a JSON
  // Content-Type, and a multipart body needs the boundary fetch sets itself.
  const response = await fetchWithTimeout(createTimestampUrl('/staff/stamp'), {
    method: 'POST',
    body: form,
  });
  const text = await response.text();

  let json: JsonMap | null = null;
  try {
    json = text ? (JSON.parse(text) as JsonMap) : null;
  } catch {
    json = null;
  }

  if (!response.ok || !json) {
    const serverMessage = ((json?.error ?? {}) as { message?: unknown }).message;
    throw new Error(
      response.status < 500 && typeof serverMessage === 'string' && serverMessage
        ? serverMessage
        : MESSAGE_SERVER_ERROR,
    );
  }
  ensureSuccess(json);

  const data = (json.data ?? {}) as Record<string, unknown>;
  const similarity = typeof data.similarity === 'number' && Number.isFinite(data.similarity) ? data.similarity : null;

  return {
    passed: data.passed === true,
    reason: String(data.reason ?? ''),
    message: String(data.message ?? ''),
    similarity,
    status: data.status && typeof data.status === 'object'
      ? staffStatusFrom(data.status as Record<string, unknown>)
      : null,
    created: data.created === true,
    dryRun: data.dryRun === true,
  };
}
