import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
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

export async function uploadPersonPhoto(
  staffId: string,
  imageUri: string,
): Promise<void> {
  const ext = imageUri.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  const supported = ['jpg', 'jpeg', 'png'].includes(ext) || imageUri.startsWith('data:image/');
  if (!supported) {
    throw new Error('รองรับไฟล์รูปภาพ .jpg และ .png เท่านั้น');
  }

  // Always compress and convert to JPEG before uploading
  const manipulated = await ImageManipulator.manipulateAsync(
    imageUri,
    [],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  const base64 = manipulated.base64 ?? '';

  const response = await fetchWithApiDelay(ENDPOINTS.personUploadPhoto, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staff_id: staffId, photo_base64: base64 }),
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Upload failed (${response.status})`;
    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      const detail = (json.error as Record<string, unknown> | undefined)?.message;
      if (typeof detail === 'string') message = detail;
    } catch { /* ignore */ }
    throw new Error(message);
  }
}

export async function updatePersonInfo(
  staffId: string,
  field: 'email' | 'phone',
  value: string,
): Promise<void> {
  const response = await fetchWithApiDelay(ENDPOINTS.personUpdateInfo, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staff_id: staffId, [field]: value }),
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Update failed (${response.status})`;
    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      const detail = (json.error as Record<string, unknown> | undefined)?.message;
      if (typeof detail === 'string') message = detail;
    } catch { /* ignore */ }
    throw new Error(message);
  }
}
