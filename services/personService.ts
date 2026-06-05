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

function normalizePhoenixPerson(row: Record<string, unknown>): Person {
  const uni = row.UNI_STAFF_ID;
  const staffId =
    typeof uni === "string" && uni.trim() ? uni.trim() : undefined;
  return {
    ...row,
    ...(staffId ? { staffId } : {}),
  };
}

export async function getPersonnelSuggestions(
  keyword: string,
): Promise<Person[]> {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return [];
  }

  const url = createPersonUrl("/search", { searchword: trimmed });

  const response = await fetchWithApiDelay(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      searchword: trimmed,
    }),
  });

  if (!response.ok) {
    throw new Error("Personnel search failed");
  }

  const json: unknown = await response.json();
  const rows = Array.isArray(json)
    ? json
    : Array.isArray((json as { data?: unknown }).data)
      ? (json as { data: unknown[] }).data
      : [];

  if (!rows.length) {
    return [];
  }

  return rows.map((row) =>
    normalizePhoenixPerson(row as Record<string, unknown>),
  );
}

export function getPersonPhoto(person: Person) {
  return `${ENDPOINTS.photoBase}${person.staffId}.jpg`;
}
