import { ENDPOINTS } from "../constants/endpoints";
import type { Person } from "../models/types";
import { fetchWithApiDelay } from "./api";

function createPersonUrl(
  path = "",
  query?: Record<string, string | number | undefined | null>,
) {
  const url = new URL(`${ENDPOINTS.person}${path}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function getText(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function normalizePhoenixPerson(row: Record<string, unknown>): Person {
  const staffId =
    getText(row.UNI_STAFF_ID) ||
    getText(row.staffId) ||
    getText(row.staff_id) ||
    getText(row.STAFF_ID);

  return {
    ...row,
    ...(staffId ? { staffId } : {}),
  };
}

function getRows(json: unknown) {
  if (Array.isArray(json)) {
    return json;
  }

  if (!json || typeof json !== "object") {
    return [];
  }

  const record = json as Record<string, unknown>;
  if (Array.isArray(record.data)) {
    return record.data;
  }

  if (record.data && typeof record.data === "object") {
    const data = record.data as Record<string, unknown>;
    if (Array.isArray(data.rows)) {
      return data.rows;
    }
    if (Array.isArray(data.items)) {
      return data.items;
    }
  }

  return [];
}

export async function getPersonnelSuggestions(
  keyword: string,
): Promise<Person[]> {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return [];
  }

  const url = createPersonUrl("/search", { searchword: trimmed });

  const response = await fetchWithApiDelay(url, { method: "GET" });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Personnel search failed (${response.status}): ${text.slice(0, 200)}`,
    );
  }

  const json: unknown = text ? JSON.parse(text) : [];
  const rows = getRows(json);

  if (!rows.length) {
    return [];
  }

  return rows.map((row) =>
    normalizePhoenixPerson(row as Record<string, unknown>),
  );
}

export function getPersonPhoto(person: Person) {
  return `${ENDPOINTS.photoBase}${encodeURIComponent(String(person.staffId))}.jpg`;
}
