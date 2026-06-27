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
  const json = await getJson<{ success: boolean; data: NoticeRepairPrivilege }>(url.toString());
  if (!json.success || !json.data) throw new Error('ไม่สามารถตรวจสอบสิทธิ์ได้');
  return json.data;
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function getList(
  type: string,
  staffId: string,
  start = 0,
  length = 20,
): Promise<ListResponse<NoticeRepairJob>> {
  // Approver ("หัวหน้าสาธารณูปการ") pending screen — backed by the Infor approve_new
  // endpoint, which returns the full list in one response (no pagination).
  if (type === 'approve_pending') return getApproveNewJobs(staffId, start);

  // Approver history top-tabs (ซ่อมได้ / ซ่อมไม่ได้) — each backed by its own Infor
  // endpoint, returned as a full list in one response (no pagination).
  if (type === 'approve_history_repairable') {
    return getRepairListFromUrl(ENDPOINTS.noticeRepairCanRepair, staffId, start);
  }
  if (type === 'approve_history_unrepairable') {
    return getRepairListFromUrl(ENDPOINTS.noticeRepairNotRepair, staffId, start);
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
    data: Array.isArray(json.data) ? json.data : [],
    totalCount: Number(json.total_count ?? json.total ?? 0),
    message: '',
  };
}

// ── Approver lists (full list per response, no pagination) ─────────────────────

async function getRepairListFromUrl(
  endpoint: string,
  staffId: string,
  start = 0,
): Promise<ListResponse<NoticeRepairJob>> {
  // Upstream returns the full list at once, so paginated follow-up calls are empty.
  if (start > 0) return { data: [], totalCount: 0, message: '' };

  const url = new URL(endpoint);
  url.searchParams.set('staff_id', staffId);
  const json = await getJson<{ success: boolean; data: NoticeRepairJob[]; total_count?: number }>(
    url.toString(),
  );

  if (!json.success) throw new Error('ไม่สามารถโหลดรายการได้');
  const data = Array.isArray(json.data) ? json.data : [];
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

// ── Reference ─────────────────────────────────────────────────────────────────

export async function getReference(type: string): Promise<NoticeRepairReference[]> {
  const json = await getJson<{ success: boolean; data: NoticeRepairReference[] }>(
    buildUrl('/reference', { type }),
  );
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
