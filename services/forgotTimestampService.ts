import { ENDPOINTS } from "../constants/endpoints";
import type { JsonMap } from "./api";
import { ensureSuccess, requestJson } from "./api";

export type ForgotTimestamp = {
  id?: string;
  [key: string]: unknown;
};

export type ForgotTimestampHistory = {
  id?: string;
  [key: string]: unknown;
};

export type SubmitForgotTimestampData = {
  id?: string;
  staff_id: string;
  timestamp: string;
  type: string;
  approver_position: string;
  reason: string;
  in_time: string;
  out_time: string;
};

function createForgotTimestampUrl(
  path = "",
  query?: Record<string, string | number | undefined | null>,
) {
  const url = new URL(`${ENDPOINTS.forgotTimestamp}${path}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function normalizeForgotTimestampData(data: unknown): ForgotTimestamp[] {
  if (Array.isArray(data)) {
    return data as ForgotTimestamp[];
  }

  if (data && typeof data === "object") {
    const item = (data as { item?: unknown }).item;

    if (Array.isArray(item)) {
      return item as ForgotTimestamp[];
    }

    if (item && typeof item === "object") {
      return [item as ForgotTimestamp];
    }
  }

  return [];
}

function normalizeForgotTimestampHistoryData(
  data: unknown,
): ForgotTimestampHistory[] {
  if (Array.isArray(data)) {
    return data as ForgotTimestampHistory[];
  }

  if (data && typeof data === "object") {
    const item = (data as { item?: unknown }).item;

    if (Array.isArray(item)) {
      return item as ForgotTimestampHistory[];
    }

    if (item && typeof item === "object") {
      return [item as ForgotTimestampHistory];
    }
  }

  return [];
}

function normalizeForgotTimestampItem(data: unknown): ForgotTimestamp {
  if (Array.isArray(data)) {
    const [firstItem] = data;

    return firstItem && typeof firstItem === "object"
      ? (firstItem as ForgotTimestamp)
      : {};
  }

  if (data && typeof data === "object") {
    const item = (data as { item?: unknown }).item;

    if (Array.isArray(item)) {
      const [firstItem] = item;

      return firstItem && typeof firstItem === "object"
        ? (firstItem as ForgotTimestamp)
        : {};
    }

    if (item && typeof item === "object") {
      return item as ForgotTimestamp;
    }

    return data as ForgotTimestamp;
  }

  return {};
}

export async function getForgotTimestampData(
  staffId: string,
  currentYear: number,
) {
  const url = createForgotTimestampUrl("", {
    staff_id: staffId,
    current_year: currentYear,
  });
  const jsonData = await requestJson<JsonMap>(url, { method: "GET" });
  ensureSuccess(jsonData);

  return {
    data: normalizeForgotTimestampData(jsonData.data),
    message: String(jsonData.message ?? ""),
  };
}

export async function getForgotTimestampHistoryData(
  staffId: string,
  currentYear: number,
) {
  const url = createForgotTimestampUrl("/history", {
    staff_id: staffId,
    current_year: currentYear,
  });
  const jsonData = await requestJson<JsonMap>(url, { method: "GET" });
  ensureSuccess(jsonData);

  return {
    data: normalizeForgotTimestampHistoryData(jsonData.data),
    message: String(jsonData.message ?? ""),
  };
}

export async function getForgotTimestampViewData(
  forgetId: string,
) {
  const url = createForgotTimestampUrl("/view", {
    id: forgetId,
  });
  const jsonData = await requestJson<JsonMap>(url, { method: "GET" });
  ensureSuccess(jsonData);

  return {
    data: normalizeForgotTimestampItem(jsonData.data),
    message: String(jsonData.message ?? ""),
  };
}

export async function getForgotTimestampInitData(
  staffId: string,
  timestamp: string,
  type: string,
) {
  const url = createForgotTimestampUrl("/init", {
    staff_id: staffId,
    timestamp,
    type,
  });
  const jsonData = await requestJson<JsonMap>(url, { method: "GET" });
  ensureSuccess(jsonData);

  return {
    data: normalizeForgotTimestampItem(jsonData.data),
    message: String(jsonData.message ?? ""),
  };
}

export async function submitForgotTimestamp(
  data: SubmitForgotTimestampData,
  method: "POST" | "PUT" = "POST",
) {
  const url = ENDPOINTS.forgotTimestamp;
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

export async function removeForgotTimestamp(id: string) {
  const url = ENDPOINTS.forgotTimestamp;
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
