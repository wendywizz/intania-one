import {ENDPOINTS} from '../constants/endpoints';
import type {Person, Result} from '../models/types';
import {buildHttpsUrl, listRequest} from './api';

export async function getPersonnelSuggestions(keyword: string): Promise<Person[]> {
  if (!keyword.trim()) {
    return [];
  }

  const response = await fetch(ENDPOINTS.personnelSearch, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'abcdefgh12345678',
    },
    body: JSON.stringify({searchword: keyword, lean: 1}),
  });

  if (!response.ok) {
    throw new Error('Personnel search failed');
  }

  const json = await response.json();
  return Array.isArray(json) ? json : [];
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
