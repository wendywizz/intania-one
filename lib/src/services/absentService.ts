import {ENDPOINTS} from '../constants/endpoints';
import type {Absent, Result} from '../models/types';
import {buildHttpsUrl, listRequest, mutationRequest, rowRequest} from './api';

function absentPath(absentType: string) {
  switch (absentType) {
    case '1':
      return '/personnel/apis/absent/leave/';
    case '2':
      return '/personnel/apis/absent/business/';
    case '3':
      return '/personnel/apis/absent/birth/';
    case '4':
      return '/personnel/apis/absent/relax/';
    case '6':
      return '/personnel/apis/absent/hajj/';
    default:
      return '/personnel/apis/absent/';
  }
}

export function initAbsentData(
  staffId: string,
  absentType: string,
): Promise<Result<Absent>> {
  const url = buildHttpsUrl(ENDPOINTS.phoenix, `${absentPath(absentType)}init/`, {
    staff_id: staffId,
  });
  return rowRequest<Absent>(url);
}

export function getAbsentData(id: string, absentType: string): Promise<Result<Absent>> {
  const url = buildHttpsUrl(ENDPOINTS.phoenix, absentPath(absentType), {id});
  return rowRequest<Absent>(url);
}

export function addAbsentData(
  data: Record<string, unknown>,
  absentType: string,
): Promise<Result> {
  const url = buildHttpsUrl(ENDPOINTS.phoenix, absentPath(absentType));
  return mutationRequest(url, 'POST', data);
}

export function updateAbsentData(
  id: string,
  data: Record<string, unknown>,
  absentType: string,
): Promise<Result> {
  const url = buildHttpsUrl(ENDPOINTS.phoenix, absentPath(absentType));
  return mutationRequest(url, 'PUT', {...data, id});
}

export function waitingAbsentData(staffId: string): Promise<Result<Absent>> {
  const url = buildHttpsUrl(ENDPOINTS.phoenix, '/personnel/apis/absent/home/waiting', {
    staff_id: staffId,
  });
  return rowRequest<Absent>(url);
}

export function historyAbsentData(
  staffId: string,
  start = 0,
  length = 10,
): Promise<Result<Absent[]>> {
  const url = buildHttpsUrl(ENDPOINTS.phoenix, '/personnel/apis/absent/history', {
    staff_id: staffId,
    start,
    length,
  });
  return listRequest<Absent>(url);
}
