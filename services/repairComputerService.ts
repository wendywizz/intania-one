import {ENDPOINTS} from '../constants/endpoints';
import type {RepairComputer, Result} from '../models/types';
import {buildHttpsUrl, listRequest, mutationRequest, rowRequest} from './api';

const base = '/repairComputer/api/';

function update(path: string, id: string, data?: Record<string, unknown>) {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}${path}`);
  return mutationRequest(url, 'PUT', {...(data ?? {}), id});
}

export function checkCanInform(staffId: string): Promise<Result> {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}inform/check_can_inform`, {
    staff_id: staffId,
  });
  return rowRequest(url);
}

export function getJobDetail(id: string): Promise<Result<RepairComputer>> {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}inform`, {id});
  return rowRequest<RepairComputer>(url);
}

export function addRepairComputerJob(data: Record<string, unknown>) {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}inform`);
  return mutationRequest(url, 'POST', data);
}

export function closeJob(id: string) {
  return update('inform/close', id);
}

export function removeJob(id: string) {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}inform`);
  return mutationRequest(url, 'DELETE', {id});
}

export function getUserCurrentJob(staffId: string, start = 0, length = 10) {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}inform/current`, {
    staff_id: staffId,
    start,
    length,
  });
  return listRequest<RepairComputer>(url);
}

export function workerQueue(): Promise<Result<Record<string, unknown>[]>> {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}inform/queue`);
  return listRequest<Record<string, unknown>>(url);
}

export function getUserHistory(
  staffId: string,
  type = '',
  start = 0,
  length = 10,
) {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}inform/history`, {
    staff_id: staffId,
    type,
    start,
    length,
  });
  return listRequest<RepairComputer>(url);
}

export function listForemanNewJob(start = 0, length = 10) {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}manage/new`, {start, length});
  return listRequest<RepairComputer>(url);
}

export function listForemanManageJob(foreman: string, start = 0, length = 10) {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}manage/current`, {
    staff_id: foreman,
    start,
    length,
  });
  return listRequest<RepairComputer>(url);
}

export function listForemanHistory(foreman: string, start = 0, length = 10) {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}manage/history`, {
    staff_id: foreman,
    start,
    length,
  });
  return listRequest<RepairComputer>(url);
}

export function assignJob(
  id: string,
  repairType: string,
  worker: string,
  foreman: string,
) {
  return update('manage/assign', id, {
    repair_type: repairType,
    worker,
    staff_id: foreman,
  });
}

export function getRepairTypes() {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}manage/repair_type_list`);
  return listRequest<Record<string, string>>(url);
}

export function listWorkerNewJob(worker: string, start = 0, length = 10) {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}operate/new`, {
    staff_id: worker,
    start,
    length,
  });
  return listRequest<RepairComputer>(url);
}

export function listWorkerCurrentJob(worker: string, start = 0, length = 10) {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}operate/current`, {
    staff_id: worker,
    start,
    length,
  });
  return listRequest<RepairComputer>(url);
}

export function listWorkerHistory(worker: string, start = 0, length = 10) {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}operate/history`, {
    staff_id: worker,
    start,
    length,
  });
  return listRequest<RepairComputer>(url);
}

export function workerReceiveJob(jobId: string, isAccept: boolean, reason?: string) {
  return update('operate/accept_newjob', jobId, {
    action: isAccept ? 'accept' : 'reject',
    reason,
  });
}

export function workerOperateJob(jobId: string, repairDetail: string, solveDetail: string) {
  return update('operate/operate_job', jobId, {
    audit: repairDetail,
    result: solveDetail,
  });
}

export function requestSupply(jobId: string, detail: string) {
  return update('operate/request_supply', jobId, {detail});
}

export function submitJob(jobId: string, userTip?: string) {
  return update('operate/submit_job', jobId, userTip ? {user_tip: userTip} : {});
}
