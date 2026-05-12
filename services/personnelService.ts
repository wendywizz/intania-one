import {ENDPOINTS} from '../constants/endpoints';
import type {Person, Result} from '../models/types';
import {buildHttpsUrl, fetchWithApiDelay, listRequest} from './api';

/** Phoenix person_search currently returns the same directory payload regardless of `searchword`; filter locally. */
function normalizePhoenixPerson(row: Record<string, unknown>): Person {
  const uni = row.UNI_STAFF_ID;
  const staffId = typeof uni === 'string' && uni.trim() ? uni.trim() : undefined;
  return {
    ...row,
    ...(staffId ? {staffId} : {}),
  };
}

function appendSearchPart(parts: string[], value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    parts.push(value.trim());
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    parts.push(String(value));
  }
}

/** First / last name only (TH + EN). Lowercased for Latin substring match. */
function buildPersonSearchBlob(person: Person): string {
  const r = person as Record<string, unknown>;
  const parts: string[] = [];
  appendSearchPart(parts, r.FNAME_TH);
  appendSearchPart(parts, r.SNAME_TH);
  appendSearchPart(parts, r.FNAME_ENG);
  appendSearchPart(parts, r.SNAME_ENG);
  return parts.join(' ').toLowerCase();
}

function personMatchesKeywordTokens(person: Person, tokens: string[]): boolean {
  if (tokens.length === 0) {
    return false;
  }
  const blob = buildPersonSearchBlob(person);
  return tokens.every((t) => blob.includes(t));
}

let personnelDirectoryCache: Person[] | null = null;
let personnelDirectoryInflight: Promise<Person[]> | null = null;

async function fetchPersonnelDirectory(): Promise<Person[]> {
  const url = new URL(ENDPOINTS.personnelSearch);
  url.searchParams.set('lean', '1');

  const response = await fetchWithApiDelay(url.toString(), {
    method: 'GET',
    headers: {
      'x-api-key': 'abcdefgh12345678',
    },
  });

  if (!response.ok) {
    throw new Error('Personnel search failed');
  }

  const json: unknown = await response.json();
  if (!Array.isArray(json)) {
    personnelDirectoryCache = [];
    return personnelDirectoryCache;
  }

  personnelDirectoryCache = json.map((row) =>
    normalizePhoenixPerson(row as Record<string, unknown>),
  );
  return personnelDirectoryCache;
}

async function ensurePersonnelDirectoryLoaded(): Promise<Person[]> {
  if (personnelDirectoryCache) {
    return personnelDirectoryCache;
  }
  if (!personnelDirectoryInflight) {
    personnelDirectoryInflight = fetchPersonnelDirectory().finally(() => {
      personnelDirectoryInflight = null;
    });
  }
  return personnelDirectoryInflight;
}

export async function getPersonnelSuggestions(keyword: string): Promise<Person[]> {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return [];
  }

  const tokens = trimmed
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0) {
    return [];
  }

  const all = await ensurePersonnelDirectoryLoaded();
  return all.filter((p) => personMatchesKeywordTokens(p, tokens));
}

export function getPersonPhoto(person: Person) {
  return `${ENDPOINTS.photoBase}${person.staffId}.jpg`;
}

export function getRepairComputerWorkers(): Promise<Result<Person[]>> {
  const url = buildHttpsUrl(
    ENDPOINTS.infor,
    '/repairComputer/api/manage/tech_list',
  );
  return listRequest<Person>(url);
}
