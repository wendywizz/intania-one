import type { JsonMap } from "./api";
import { createPhoenixUrl, ensureSuccess, requestJson } from "./api";

export type ForgotTimestamp = {
  id?: string;
  [key: string]: unknown;
};

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

export async function getForgotTimestampData(
  staffId: string,
  currentYear: number,
) {
  const url = createPhoenixUrl("/personnel/apis/timestamp/forget", {
    staff_id: staffId,
    year: currentYear,
  });
  const jsonData = await requestJson<JsonMap>(url, { method: "GET" });
  ensureSuccess(jsonData);

  return {
    data: normalizeForgotTimestampData(jsonData.data),
    message: String(jsonData.message ?? ""),
  };
}
