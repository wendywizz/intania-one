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
