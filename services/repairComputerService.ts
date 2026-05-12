import { ENDPOINTS } from '../constants/endpoints';
import { PROCESS } from '../constants/domain';
import { PRIVILEGE_RC_USER, RP_APP_ID } from '../constants/type-repair-computer';
import type { RepairComputer, RepairComputerPrivilege, Result } from '../models/types';
import { buildHttpsUrl, fetchWithApiDelay, listRequest, mutationRequest, rowRequest } from './api';

const base = '/repairComputer/api/';
const SCOOBA_API_TOKEN = '';

export type AddRepairComputerJobPayload = {
  staff_id: string;
  phone: string;
  supply_code: string;
  detail: string;
};

export function update(path: string, id: string, data?: Record<string, unknown>) {
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

export function addRepairComputerJob(data: AddRepairComputerJobPayload) {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}inform`);
  return mutationRequest(url, 'POST', data);
}

export function closeJob(id: string) {
  return update('inform/close', id);
}

export async function removeJob(id: string): Promise<Result> {
  try {
    const url = buildHttpsUrl(ENDPOINTS.infor, `${base}inform`);
    const response = await fetchWithApiDelay(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({id}).toString(),
    });
    const text = await response.text();

    if (!response.ok || !text) {
      throw new Error('Server request failed');
    }

    const json = JSON.parse(text) as {message?: string; success?: boolean};

    return {
      processType: PROCESS.success,
      success: json.success ?? true,
      message: json.message ?? '',
    };
  } catch (error) {
    return {
      processType: PROCESS.error,
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
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

export async function checkPrivilege(
  staffId: string,
): Promise<RepairComputerPrivilege | null> {
  try {
    const url = buildHttpsUrl(ENDPOINTS.infor, `${base}privilege`, {
      app_id: RP_APP_ID,
      staff_id: staffId,
    });
    const response = await fetchWithApiDelay(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SCOOBA_API_TOKEN}`,
      },
    });

    if (response.status === 400) {
      return null;
    }

    const body = await response.text();

    if (response.status !== 200 || !body) {
      throw new Error('Server request failed');
    }

    const json = JSON.parse(body) as {data?: unknown};
    const privilege =
      typeof json.data === 'string' && json.data.trim() ? json.data : PRIVILEGE_RC_USER;

    return {
      staffId,
      privilege,
    };
  } catch {
    return null;
  }
}
