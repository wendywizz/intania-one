import { ENDPOINTS } from "../constants/endpoints";
import type { Person } from "../models/types";
import { fetchWithApiDelay } from "./api";

function normalizePhoenixPerson(row: Record<string, unknown>): Person {
  const uni = row.UNI_STAFF_ID;
  const staffId =
    typeof uni === "string" && uni.trim() ? uni.trim() : undefined;
  return {
    ...row,
    ...(staffId ? { staffId } : {}),
  };
}

async function fetchPersonnelByKeyword(keyword: string): Promise<Person[]> {
  const url = new URL(ENDPOINTS.personnelSearch);
  url.searchParams.set("searchword", keyword);
  url.searchParams.set("lean", "1");

  const response = await fetchWithApiDelay(url.toString(), {
    method: "POST",
    headers: {
      "x-api-key": "abcdefgh12345678",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      searchword: keyword,
    }),
  });

  if (!response.ok) {
    throw new Error("Personnel search failed");
  }

  const json: unknown = await response.json();
  if (!Array.isArray(json)) {
    return [];
  }

  return json.map((row) =>
    normalizePhoenixPerson(row as Record<string, unknown>),
  );
}

export async function getPersonnelSuggestions(
  keyword: string,
): Promise<Person[]> {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return [];
  }
  return fetchPersonnelByKeyword(trimmed);
}

export function getPersonPhoto(person: Person) {
  return `${ENDPOINTS.photoBase}${person.staffId}.jpg`;
}
