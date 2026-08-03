import { ENDPOINTS } from "../constants/endpoints";
import { ENV } from "../constants/config";
import {
    PRIVILEGE_RC_USER,
    RP_APP_ID,
} from "../constants/types";
import type {
    Person,
    RepairComputer,
    RepairComputerPrivilege,
} from "../models/types";
import {
    ensureSuccess,
    fetchWithApiDelay,
    type ListResponse,
    type MutationResponse,
    listRequest,
    mutationRequest,
    rowRequest,
} from "./api";

const SCOOBA_API_KEY = ENV.scoobaApiKey;

function createRepairComputerUrl(
  path = "",
  query?: Record<string, string | number | undefined | null>,
) {
  const url = new URL(`${ENDPOINTS.repairComputer}${path}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

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
  const url = createRepairComputerUrl(`/${path}`);
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

export function checkCanInform(staffId: string) {
  const url = createRepairComputerUrl("/inform/check_can_inform", {
    staff_id: staffId,
  });
  return rowRequest<unknown>(url);
}

export function getJobDetail(id: string): Promise<RepairComputer> {
  const url = createRepairComputerUrl("/inform", { id });
  return rowRequest<RepairComputer>(url);
}

export function addRepairComputerJob(data: AddRepairComputerJobPayload) {
  const url = createRepairComputerUrl("/inform");
  return mutationRequest(url, "POST", data);
}

export const addData = addRepairComputerJob;

export function closeJob(id: string) {
  return updateInformData(id, { id }, "close");
}

export async function removeJob(id: string): Promise<MutationResponse> {
  // Send id as a query param — Strapi/Koa does not parse DELETE request bodies
  const url = createRepairComputerUrl("/inform", { id });
  const response = await fetchWithApiDelay(url, {
    method: "DELETE",
  });
  const text = await response.text();

  if (!response.ok || !text) {
    throw new Error("Server request failed");
  }

  const json = JSON.parse(text) as { message?: string; success?: boolean };
  ensureSuccess(json);

  return {
    message: json.message ?? "",
  };
}

/* Inform */
export function getUserCurrentJob(staffId: string, start = 0, length = 10) {
  const url = createRepairComputerUrl("/inform/current", {
    staff_id: staffId,
    start,
    length,
  });
  return listRequest<RepairComputer>(url);
}

export function workerQueue(): Promise<ListResponse<Record<string, unknown>>> {
  const url = createRepairComputerUrl("/inform/queue");
  return listRequest<Record<string, unknown>>(url);
}

export function getUserHistory(
  staffId: string,
  type = "",
  start = 0,
  length = 10,
) {
  const url = createRepairComputerUrl("/inform/history", {
    staff_id: staffId,
    type,
    start,
    length,
  });
  return listRequest<RepairComputer>(url);
}

export function getUncloseJob(staffId: string, start = 0, length = 10) {
  const url = createRepairComputerUrl("/inform/unclose_job", {
    staff_id: staffId,
    start,
    length,
  });
  return listRequest<RepairComputer>(url);
}

/* Manage */
export function listForemanNewJob(start = 0, length = 10) {
  const url = createRepairComputerUrl("/manage/new", {
    start,
    length,
  });
  return listRequest<RepairComputer>(url);
}

export function listForemanManageJob(foreman: string, start = 0, length = 10) {
  const url = createRepairComputerUrl("/manage/current", {
    staff_id: foreman,
    start,
    length,
  });
  return listRequest<RepairComputer>(url);
}

export function listForemanHistory(foreman: string, start = 0, length = 10) {
  const url = createRepairComputerUrl("/manage/history", {
    staff_id: foreman,
    start,
    length,
  });
  return listRequest<RepairComputer>(url);
}

export function listForemanSupplyApproveHistory(
  foreman: string,
  start = 0,
  length = 10,
) {
  const url = createRepairComputerUrl("/manage/supply_approve_history", {
    staff_id: foreman,
    start,
    length,
  });
  return listRequest<RepairComputer>(url);
}

export function foremanRejectJob(id: string) {
  return updateManageData(id, {}, "reject");
}

/** Foreman approves a worker's supply request (job wait-approval → processing 7.1). */
export function foremanApproveSupply(id: string, detail = "") {
  return updateManageData(id, { detail }, "approve_supply");
}

/** Foreman rejects a worker's supply request (job wait-approval → rejected 7.2). */
export function foremanUnapproveSupply(id: string, detail = "") {
  return updateManageData(id, { detail }, "unapprove_supply");
}

export function foremanUnassignJob(id: string) {
  return updateManageData(id, {}, "unassign");
}

export function acceptRejectedFromWorker(id: string) {
  return updateManageData(id, {}, "accept_rejected");
}

/** Forward a job to another foreman (division). `divisionId` is the target
 * foreman's division_id from getRepairComputerForemen(). */
export function foremanForwardForeman(id: string, divisionId: string) {
  return updateManageData(id, { division_id: divisionId }, "forward_foreman");
}

/** Receiving foreman rejects a forwarded job — returns it to the foreman who
 * forwarded it (back to wait-foreman, status 4.2). */
export function foremanForwardReject(id: string) {
  return updateManageData(id, {}, "forward_reject");
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
  return updateManageData(
    id,
    {
      repair_type: repairType,
      worker,
      staff_id: foreman,
    },
    "assign",
  );
}

export function getRepairTypes() {
  const url = createRepairComputerUrl("/manage/repair_type_list");
  return listRequest<Record<string, string>>(url);
}

export async function getRejectReason(jobId: string, worker?: string) {
  const url = createRepairComputerUrl("/inform/reject_reason", {
    id: jobId,
    worker,
  });
  const data = await rowRequest<Record<string, unknown>>(url);

  return {
    detail: String(data?.detail ?? ""),
    dateTime: String(data?.dateTime ?? ""),
  };
}

/* Operate */
export function listWorkerNewJob(worker: string, start = 0, length = 10) {
  const url = createRepairComputerUrl("/operate/new", {
    staff_id: worker,
    start,
    length,
  });
  return listRequest<RepairComputer>(url);
}

export function listWorkerCurrentJob(worker: string, start = 0, length = 10) {
  const url = createRepairComputerUrl("/operate/current", {
    staff_id: worker,
    start,
    length,
  });
  return listRequest<RepairComputer>(url);
}

export function listWorkerHistory(worker: string, start = 0, length = 10) {
  const url = createRepairComputerUrl("/operate/history", {
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
  return updateOperateData(
    jobId,
    {
      action: isAccept ? "accept" : "reject",
      ...(!isAccept && reason ? { reason } : {}),
    },
    "accept_newjob",
  );
}

export function workerOperateJob(
  jobId: string,
  repairDetail: string,
  solveDetail: string,
  staffId?: string,
) {
  return updateOperateData(
    jobId,
    {
      audit: repairDetail,
      result: solveDetail,
      // Worker attribution for the work log (submit_operate reads it server-side).
      ...(staffId ? { staff_id: staffId } : {}),
    },
    "operate_job",
  );
}

export function requestSupply(jobId: string, detail: string) {
  return updateOperateData(jobId, { detail }, "request_supply");
}

/** Worker reports the procurement result after approval and resumes work (→ working 4). */
export function workerSupplyResult(jobId: string, detail: string) {
  return updateOperateData(jobId, { detail }, "supply_result");
}

export function submitJob(jobId: string, userTip?: string) {
  return updateOperateData(
    jobId,
    userTip ? { user_tip: userTip } : {},
    "submit_job",
  );
}

/** Worker finishes the job and sends it to the foreman to close (→ wait foreman 4.2). */
export function workerSendForeman(jobId: string, userTip?: string) {
  return updateOperateData(
    jobId,
    userTip ? { user_tip: userTip } : {},
    "send_fman",
  );
}

/** URL of the requisition (ใบเบิก) PDF for a job — open it to view/print. */
export function getRequisitionPdfUrl(jobId: string) {
  return createRepairComputerUrl("/export/pdf", { job_id: jobId });
}

export function getRepairComputerWorkers(): Promise<ListResponse<Person>> {
  const url = createRepairComputerUrl("/manage/tech_list");
  return listRequest<Person>(url);
}

/** Foreman list for the "forward to foreman" flow. Each item is a division
 * (division_id is the forward value) plus the division head's staff info. */
export function getRepairComputerForemen(): Promise<ListResponse<Person>> {
  const url = createRepairComputerUrl("/manage/foreman_list");
  return listRequest<Person>(url);
}

export async function checkPrivilege(
  staffId: string,
): Promise<RepairComputerPrivilege | null> {
  try {
    const url = createRepairComputerUrl("/privilege", {
      app_id: RP_APP_ID,
      staff_id: staffId,
    });
    const response = await fetchWithApiDelay(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SCOOBA_API_KEY}`,
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
