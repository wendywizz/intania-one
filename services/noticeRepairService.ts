import { ENDPOINTS } from '@/constants/endpoints';
import { fetchWithTimeout, ensureSuccess } from './api';
import type { NoticeRepairPrivilege, NoticeRepairJob, NoticeRepairDetail, NoticeRepairReference } from '@/models/types';
import type { ListResponse } from './api';

const BASE = ENDPOINTS.noticeRepair;

function buildUrl(path: string, params?: Record<string, string | number | undefined | null>): string {
  const u = new URL(`${BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
    });
  }
  return u.toString();
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetchWithTimeout(url);
  const json = await res.json();
  return json as T;
}

async function postJson<T>(url: string, body: unknown, method = 'POST'): Promise<T> {
  const res = await fetchWithTimeout(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

// ── Privilege ─────────────────────────────────────────────────────────────────

export async function getPrivilege(staffId: string): Promise<NoticeRepairPrivilege> {
  const url = new URL(ENDPOINTS.noticeRepairRoleCheck);
  url.searchParams.set('staff_id', staffId);
  const json = await getJson<{ success?: boolean; data?: NoticeRepairPrivilege | null }>(url.toString());
  // Genuine failure (e.g. upstream 502) — throw so the caller can apply its
  // transient fallback. An empty `data` is NOT an error: it means the user
  // holds no role in this app, so return empty roles → handled as "no access".
  if (json?.success === false) throw new Error('ไม่สามารถตรวจสอบสิทธิ์ได้');
  const data = json?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { roles: [], work_category_ids: [], approve_dept_ids: [] };
  }
  return { ...data, roles: Array.isArray(data.roles) ? data.roles : [] };
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function getList(
  type: string,
  staffId: string,
  start = 0,
  length = 20,
  workCategory?: string | number,
): Promise<ListResponse<NoticeRepairJob>> {
  // Approver ("หัวหน้าสาธารณูปการ") pending screen — backed by the Infor approve_new
  // endpoint, which returns the full list in one response (no pagination).
  if (type === 'approve_pending') return getApproveNewJobs(staffId, start);

  // Admin "รอรับเรื่อง" screen — backed by the Infor admin_pending endpoint,
  // which returns the full list in one response (no pagination).
  if (type === 'admin_pending') {
    return getRepairListFromUrl(ENDPOINTS.noticeRepairAdminPending, staffId, start);
  }

  // Admin "งานปัจจุบัน" (in-progress) screen — backed by the Infor admin_list
  // endpoint, which returns the full list in one response (no pagination).
  if (type === 'admin_list') {
    return getRepairListFromUrl(ENDPOINTS.noticeRepairAdminList, staffId, start);
  }

  // Admin "เสร็จสิ้น" (finished) screen — backed by the Infor admin_finished
  // endpoint, which returns the full list in one response (no pagination).
  if (type === 'admin_finished') {
    return getRepairListFromUrl(ENDPOINTS.noticeRepairAdminFinished, staffId, start);
  }

  // Admin "จัดหาวัสดุ" (supply material) tab — Infor supply_material endpoint
  // (status 007, requisition 'c'), returned as a full list in one response.
  if (type === 'supply_material') {
    return getRepairListFromUrl(ENDPOINTS.noticeRepairSupplyMaterial, staffId, start);
  }

  // Admin "หน่วยงานตอบรับการจัดหา" (dept supply response) tab — Infor
  // dept_supply_response endpoint (status 005, requisition 'y'), full list.
  if (type === 'dept_supply_response') {
    return getRepairListFromUrl(ENDPOINTS.noticeRepairDeptSupply, staffId, start);
  }

  // Approver history top-tabs (ซ่อมได้ / ซ่อมไม่ได้) — each backed by its own Infor
  // endpoint, returned as a full list in one response (no pagination).
  if (type === 'approve_history_repairable') {
    return getRepairListFromUrl(ENDPOINTS.noticeRepairCanRepair, staffId, start);
  }
  if (type === 'approve_history_unrepairable') {
    return getRepairListFromUrl(ENDPOINTS.noticeRepairNotRepair, staffId, start);
  }

  // Informer "งานปัจจุบัน" (current) screen — backed by the Infor informer_current
  // endpoint, which returns the full list in one response (no pagination).
  if (type === 'informer_current') {
    return getRepairListFromUrl(ENDPOINTS.noticeRepairInformerCurrent, staffId, start);
  }

  // Informer "ประวัติ/เสร็จสิ้น" (finished) screen — backed by the Infor
  // informer_finished endpoint, returned as a full list in one response.
  if (type === 'informer_history') {
    return getRepairListFromUrl(ENDPOINTS.noticeRepairInformerFinished, staffId, start);
  }

  // Header "รอรับเรื่อง" (pending) screen — backed by the Infor header_pending
  // endpoint, which returns the full list in one response (no pagination).
  if (type === 'header_pending') {
    return getRepairListFromUrl(ENDPOINTS.noticeRepairHeaderPending, staffId, start);
  }

  // Header "รอประเมิน" (waiting estimate) tab — backed by the Infor
  // header_estimate endpoint, returned as a full list in one response.
  if (type === 'header_waiting_estimate') {
    return getRepairListFromUrl(ENDPOINTS.noticeRepairHeaderEstimate, staffId, start);
  }

  // Header "ประเมินแล้ว" (estimated) tab — backed by the Infor header_progress
  // endpoint, returned as a full list in one response.
  if (type === 'header_estimated') {
    return getRepairListFromUrl(ENDPOINTS.noticeRepairHeaderProgress, staffId, start);
  }

  // Header "บันทึกการซ่อม" (repair record) tab — backed by the Infor header_note
  // endpoint, returned as a full list in one response.
  if (type === 'header_repair_record') {
    return getRepairListFromUrl(ENDPOINTS.noticeRepairHeaderNote, staffId, start);
  }

  // Header "ตรวจรับงาน" (acceptance) tab — backed by the Infor examine_pending
  // endpoint, returned as a full list in one response.
  if (type === 'header_acceptance') {
    return getRepairListFromUrl(ENDPOINTS.noticeRepairExaminePending, staffId, start);
  }

  // Header "ซ่อมไม่ได้" (not repairable) tab — backed by the Infor not_repair_ack
  // endpoint, returned as a full list in one response.
  if (type === 'header_reject_cannot_repair') {
    return getRepairListFromUrl(ENDPOINTS.noticeRepairNotRepairAck, staffId, start);
  }

  // Header "รายการซ่อม → กำลังดำเนินการ" (current) tab — backed by the Infor
  // header_repairing endpoint, filtered by the header's work category.
  if (type === 'header_current') {
    return getRepairListFromUrl(ENDPOINTS.noticeRepairHeaderRepairing, staffId, start, { work_category: workCategory });
  }

  // Header "รายการซ่อม → เสร็จสิ้น" (finished) tab — backed by the Infor
  // header_finished endpoint, filtered by the header's work category.
  if (type === 'header_done') {
    return getRepairListFromUrl(ENDPOINTS.noticeRepairHeaderFinished, staffId, start, { work_category: workCategory });
  }

  const perPage = length;
  const page = Math.floor(start / perPage);
  const json = await getJson<{
    success: boolean;
    data: NoticeRepairJob[];
    total_count?: number;
    total?: number;
  }>(buildUrl('/list', { type, staff_id: staffId, page, per_page: perPage }));

  if (!json.success) throw new Error('ไม่สามารถโหลดรายการได้');
  return {
    data: sortByDateDesc(Array.isArray(json.data) ? json.data : []),
    totalCount: Number(json.total_count ?? json.total ?? 0),
    message: '',
  };
}

// Order jobs newest-first by the inform date, falling back to lastupdate then
// id so lists always show the most recent at the top.
function sortByDateDesc(list: NoticeRepairJob[]): NoticeRepairJob[] {
  const ts = (j: NoticeRepairJob) => {
    const d = j.repair_inform_date || j.lastupdate;
    const t = d ? Date.parse(d) : NaN;
    return Number.isNaN(t) ? -Infinity : t;
  };
  return [...list].sort((a, b) => (ts(b) - ts(a)) || (b.repair_id - a.repair_id));
}

// ── Approver lists (full list per response, no pagination) ─────────────────────

async function getRepairListFromUrl(
  endpoint: string,
  staffId: string,
  start = 0,
  extraParams?: Record<string, string | number | undefined | null>,
): Promise<ListResponse<NoticeRepairJob>> {
  // Upstream returns the full list at once, so paginated follow-up calls are empty.
  if (start > 0) return { data: [], totalCount: 0, message: '' };

  const url = new URL(endpoint);
  url.searchParams.set('staff_id', staffId);
  if (extraParams) {
    Object.entries(extraParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }
  const json = await getJson<{ success: boolean; data: NoticeRepairJob[]; total_count?: number }>(
    url.toString(),
  );

  if (!json.success) throw new Error('ไม่สามารถโหลดรายการได้');
  const data = sortByDateDesc(Array.isArray(json.data) ? json.data : []);
  return { data, totalCount: Number(json.total_count ?? data.length), message: '' };
}

export function getApproveNewJobs(staffId: string, start = 0): Promise<ListResponse<NoticeRepairJob>> {
  return getRepairListFromUrl(ENDPOINTS.noticeRepairApproveNew, staffId, start);
}

// ── Detail ────────────────────────────────────────────────────────────────────

export async function getDetail(repairId: number, staffId: string): Promise<NoticeRepairDetail> {
  const url = new URL(ENDPOINTS.noticeRepairDetail);
  url.searchParams.set('repair_id', String(repairId));
  url.searchParams.set('staff_id', staffId);
  const json = await getJson<{ success: boolean; data: NoticeRepairDetail }>(url.toString());
  if (!json.success || !json.data) throw new Error('ไม่สามารถโหลดรายละเอียดได้');
  return json.data;
}

/**
 * Header-role full detail — includes the header section (operation date range,
 * technicians, requisitions, examine) on top of the base inform record.
 */
export async function getHeaderDetail(repairId: number, staffId: string): Promise<NoticeRepairDetail> {
  const url = new URL(ENDPOINTS.noticeRepairHeaderDetail);
  url.searchParams.set('repair_id', String(repairId));
  url.searchParams.set('staff_id', staffId);
  const json = await getJson<{ success: boolean; data: NoticeRepairDetail }>(url.toString());
  if (!json.success || !json.data) throw new Error('ไม่สามารถโหลดรายละเอียดได้');
  return json.data;
}

/**
 * Role-neutral full detail — same enriched shape as getHeaderDetail (header
 * section, technicians, requisitions, examine), readable by any role.
 */
export async function getFullDetail(repairId: number, staffId: string): Promise<NoticeRepairDetail> {
  const url = new URL(ENDPOINTS.noticeRepairFullDetail);
  url.searchParams.set('repair_id', String(repairId));
  url.searchParams.set('staff_id', staffId);
  const json = await getJson<{ success: boolean; data: NoticeRepairDetail }>(url.toString());
  if (!json.success || !json.data) throw new Error('ไม่สามารถโหลดรายละเอียดได้');
  return json.data;
}

// ── Reference ─────────────────────────────────────────────────────────────────

// Reference types backed by a dedicated scooba-service gateway (which proxies
// the Infor /notice_repair/api/reference/<type> endpoints). Types not listed
// here fall back to the generic ${BASE}/reference?type=<type> path.
const REFERENCE_GATEWAY_URLS: Record<string, string | undefined> = {
  work_categories: ENDPOINTS.noticeRepairRefWorkCategories,
  buildings: ENDPOINTS.noticeRepairRefBuildings,
};

export async function getReference(type: string): Promise<NoticeRepairReference[]> {
  const url = REFERENCE_GATEWAY_URLS[type] ?? buildUrl('/reference', { type });
  const json = await getJson<{ success: boolean; data: NoticeRepairReference[] }>(url);
  return Array.isArray(json.data) ? json.data : [];
}

// ── Write actions ─────────────────────────────────────────────────────────────

export async function createRepair(staffId: string, payload: Record<string, unknown>) {
  const json = await postJson<{ success: boolean; error?: string }>(
    buildUrl('/create'), { staff_id: staffId, ...payload },
  );
  ensureSuccess(json as never);
  return json;
}

// ── Approver detail actions (POST /api/repair/{approve,cancel,not_agree}) ───────
// Mirror Repair_Controller::approve/cancel/not_agree. The server replies with
// { success, data } on 200 and { success:false, error } on 4xx — surface that
// `error` message (e.g. wrong status / missing reason) to the caller.

async function postRepairAction(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as
    | { success?: boolean; data?: Record<string, unknown>; error?: string }
    | null;
  if (!json || json.success !== true) {
    throw new Error(json?.error || 'ดำเนินการไม่สำเร็จ');
  }
  return json.data ?? {};
}

/** เห็นชอบ — approve a new job (status 001 → 002). */
export function approveRepair(repairId: number | string, staffId: string) {
  return postRepairAction(ENDPOINTS.noticeRepairApprove, {
    staff_id: staffId,
    repair_id: repairId,
  });
}

/** ยกเลิก — cancel/archive a new job (status 001 only). */
export function cancelRepair(repairId: number | string, staffId: string) {
  return postRepairAction(ENDPOINTS.noticeRepairCancel, {
    staff_id: staffId,
    repair_id: repairId,
  });
}

/** ไม่เห็นชอบ — reject a new job with a reason (status 001 → 200). */
export function notAgreeRepair(repairId: number | string, staffId: string, reason: string) {
  return postRepairAction(ENDPOINTS.noticeRepairNotAgree, {
    staff_id: staffId,
    repair_id: repairId,
    reason,
  });
}

// ── Admin (เจ้าหน้าที่บริหารงาน) actions on a "รอรับเรื่อง" job ────────────────
// Routed through scooba-service (POST /api/repair/{accept,reject,update}), which
// proxies the Infor /notice_repair/api/repair/{accept,reject,update} endpoints.

/** รับเรื่อง — admin accepts a pending job. */
export function adminAcceptRepair(repairId: number | string, staffId: string) {
  return postRepairAction(ENDPOINTS.noticeRepairAdminAccept, {
    staff_id: staffId,
    repair_id: repairId,
  });
}

/** ตีกลับ — admin rejects a pending job with a reason. */
export function adminRejectRepair(repairId: number | string, staffId: string, reason: string) {
  return postRepairAction(ENDPOINTS.noticeRepairAdminReject, {
    staff_id: staffId,
    repair_id: repairId,
    reason,
  });
}

/** Admin edits the inform data. */
export function updateRepair(
  repairId: number | string,
  staffId: string,
  payload: Record<string, unknown>,
) {
  return postRepairAction(ENDPOINTS.noticeRepairAdminUpdate, {
    staff_id: staffId,
    repair_id: repairId,
    ...payload,
  });
}

// ── Requisition (บันทึกจัดซื้อวัสดุ) ────────────────────────────────────────────
// POST /api/repair/requisition — record the materials a job needs and move it to
// status '005' (รอจัดซื้อ/จัดหาวัสดุ). หัวหน้างาน/ช่าง only. Each item needs a
// non-empty `name`; lines with an empty name are skipped server-side.

export interface RequisitionItem {
  name: string;
  number?: string | number;
  unit?: string;
  price_unit?: string | number;
  price?: string | number;
}

export function addRequisition(
  repairId: number | string,
  staffId: string,
  equipment: RequisitionItem[],
) {
  return postRepairAction(ENDPOINTS.noticeRepairRequisition, {
    staff_id: staffId,
    repair_id: repairId,
    equipment,
  });
}

// ── Procurement request (ใบขอจัดหา) — frm_repair_requisition.php?requisition=2 ──

export interface RequisitionRequester {
  staff_id: string;
  name: string;
}

/** "ผู้ขอให้จัดหา" dropdown options (staff_administration_tb). */
export async function getRequisitionRequesters(staffId: string): Promise<RequisitionRequester[]> {
  const url = new URL(ENDPOINTS.noticeRepairRequisitionRequesters);
  url.searchParams.set('staff_id', staffId);
  const json = await getJson<{ success: boolean; data: RequisitionRequester[] }>(url.toString());
  return Array.isArray(json.data) ? json.data : [];
}

export interface RequisitionSupplyPayload {
  requisition_date: string;
  requisition_name: string;
  requisition_receive_date?: string;
  /** map of requisition_equipment_id → remark */
  remarks?: Record<string, string>;
}

/** Save the procurement request (date, requester, received date, per-item remarks). */
export function saveRequisitionSupply(
  repairId: number | string,
  staffId: string,
  payload: RequisitionSupplyPayload,
) {
  return postRepairAction(ENDPOINTS.noticeRepairRequisitionSave, {
    staff_id: staffId,
    repair_id: repairId,
    ...payload,
  });
}

export async function acceptRepair(repairId: number, staffId: string) {
  const json = await postJson<{ success: boolean; error?: string }>(
    buildUrl('/accept'), { repair_id: repairId, staff_id: staffId },
  );
  ensureSuccess(json as never);
  return json;
}

export async function examineRepair(
  repairId: number,
  staffId: string,
  result: 'y' | 'n',
  remark?: string,
) {
  const json = await postJson<{ success: boolean; error?: string }>(
    buildUrl('/examine'),
    { repair_id: repairId, staff_id: staffId, repair_examine: result, repair_examine_remark: remark },
  );
  ensureSuccess(json as never);
  return json;
}

export async function deleteRepair(repairId: number, staffId: string) {
  const res = await fetchWithTimeout(
    buildUrl('/delete', { repair_id: repairId, staff_id: staffId }),
    { method: 'DELETE' },
  );
  const json = await res.json();
  ensureSuccess(json as never);
  return json;
}
