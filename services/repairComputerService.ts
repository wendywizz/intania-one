import { PROCESS } from "../constants/domain";
import { ENDPOINTS } from "../constants/endpoints";
import {
  PRIVILEGE_RC_USER,
  RP_APP_ID,
} from "../constants/type-repair-computer";
import type {
  Person,
  RepairComputer,
  RepairComputerPrivilege,
  Result,
} from "../models/types";
import {
  buildHttpsUrl,
  fetchWithApiDelay,
  listRequest,
  mutationRequest,
  rowRequest,
} from "./api";

const base = "/repairComputer/api/";
const SCOOBA_API_TOKEN = "";

export type AddRepairComputerJobPayload = {
  staff_id: string;
  phone: string;
  supply_code: string;
  detail: string;
};

export function update(
  path: string,
  id: string,
  data?: Record<string, unknown>,
) {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}${path}`);
  return mutationRequest(url, "PUT", { ...(data ?? {}), id });
}

export function updateInformData(
  id: string,
  data: Record<string, unknown> = {},
  actionPath?: string,
) {
  return update(actionPath ? `inform/${actionPath}` : "inform", id, data);
}

export function updateManageData(
  id: string,
  data: Record<string, unknown> = {},
  actionPath?: string,
) {
  return update(actionPath ? `manage/${actionPath}` : "manage", id, data);
}

export function updateOperateData(
  id: string,
  data: Record<string, unknown> = {},
  actionPath?: string,
) {
  return update(actionPath ? `operate/${actionPath}` : "operate", id, data);
}

export function checkCanInform(staffId: string): Promise<Result> {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}inform/check_can_inform`, {
    staff_id: staffId,
  });
  return rowRequest(url);
}

export function getJobDetail(id: string): Promise<Result<RepairComputer>> {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}inform`, { id });
  return rowRequest<RepairComputer>(url);
}

export function addRepairComputerJob(data: AddRepairComputerJobPayload) {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}inform`);
  return mutationRequest(url, "POST", data);
}

export const addData = addRepairComputerJob;

export function closeJob(id: string) {
  return updateInformData(id, { id }, "close");
}

export async function removeJob(id: string): Promise<Result> {
  try {
    const url = buildHttpsUrl(ENDPOINTS.infor, `${base}inform`);
    const response = await fetchWithApiDelay(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ id }).toString(),
    });
    const text = await response.text();

    if (!response.ok || !text) {
      throw new Error("Server request failed");
    }

    const json = JSON.parse(text) as { message?: string; success?: boolean };

    return {
      processType: PROCESS.success,
      success: json.success ?? true,
      message: json.message ?? "",
    };
  } catch (error) {
    return {
      processType: PROCESS.error,
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/* Inform */
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
  type = "",
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

export function getUncloseJob(staffId: string, start = 0, length = 10) {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}inform/unclose_job`, {
    staff_id: staffId,
    start,
    length,
  });
  return listRequest<RepairComputer>(url);
}

/* Manage */
export function listForemanNewJob(start = 0, length = 10) {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}manage/new`, {
    start,
    length,
  });
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

export function changeWorker(id: string, workerId: string) {
  return updateManageData(id, { worker: workerId }, "change_worker");
}

export function foremanRejectJob(id: string) {
  return updateManageData(id, {}, "reject");
}

export function foremanUnassignJob(id: string) {
  return updateManageData(id, {}, "unassign");
}

export function acceptRejectedFromWorker(id: string) {
  return updateManageData(id, {}, "accept_rejected");
}

export function foremanForwardWorker(id: string) {
  return updateManageData(id, {}, "forward_worker");
}

export function foremanForwardForeman(id: string) {
  return updateManageData(id, {}, "forward_foreman");
}

export function foremanCloseJob(id: string) {
  return updateManageData(id, {}, "close_job");
}

export function assignJob(
  id: string,
  repairType: string,
  worker: string,
  foreman: string,
) {
  return updateManageData(id, {
    repair_type: repairType,
    worker,
    staff_id: foreman,
  }, "assign");
}

export function getRepairTypes() {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}manage/repair_type_list`);
  return listRequest<Record<string, string>>(url);
}

export async function getRejectReason(jobId: string, worker?: string) {
  const url = buildHttpsUrl(ENDPOINTS.infor, `${base}inform/reject_reason`, {
    id: jobId,
    worker,
  });
  const result = await rowRequest<Record<string, unknown>>(url);
  const data = result.data ?? {};

  return {
    ...result,
    data: {
      detail: String(data.detail ?? ""),
      dateTime: String(data.dateTime ?? ""),
    },
  };
}

/* Operate */
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

export function workerReceiveJob(
  jobId: string,
  isAccept: boolean,
  reason?: string,
) {
  return updateOperateData(jobId, {
    action: isAccept ? "accept" : "reject",
    ...(!isAccept && reason ? { reason } : {}),
  }, "accept_newjob");
}

export function workerOperateJob(
  jobId: string,
  repairDetail: string,
  solveDetail: string,
) {
  return updateOperateData(jobId, {
    audit: repairDetail,
    result: solveDetail,
  }, "operate_job");
}

export function requestSupply(jobId: string, detail: string) {
  return updateOperateData(jobId, { detail }, "request_supply");
}

export function submitJob(jobId: string, userTip?: string) {
  return updateOperateData(
    jobId,
    userTip ? { user_tip: userTip } : {},
    "submit_job",
  );
}

export function getRepairComputerWorkers(): Promise<Result<Person[]>> {
  const url = buildHttpsUrl(
    ENDPOINTS.infor,
    "/repairComputer/api/manage/tech_list",
  );
  return listRequest<Person>(url);
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
        "Content-Type": "application/json",
        Authorization: `Bearer ${SCOOBA_API_TOKEN}`,
      },
    });

    if (response.status === 400) {
      return null;
    }

    const body = await response.text();

    if (response.status !== 200 || !body) {
      throw new Error("Server request failed");
    }

    const json = JSON.parse(body) as { data?: unknown };
    const privilege =
      typeof json.data === "string" && json.data.trim()
        ? json.data
        : PRIVILEGE_RC_USER;

    return {
      staffId,
      privilege,
    };
  } catch {
    return null;
  }
}
