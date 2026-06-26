import { ENDPOINTS } from '@/constants/endpoints';
import { fetchWithTimeout, ensureSuccess } from './api';
import type { PublicRepairPrivilege, PublicRepairJob, PublicRepairDetail, PublicRepairReference } from '@/models/types';
import type { ListResponse } from './api';

const BASE = ENDPOINTS.publicRepair;

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

export async function getPrivilege(staffId: string): Promise<PublicRepairPrivilege> {
  const json = await getJson<{ success: boolean; data: PublicRepairPrivilege }>(
    buildUrl('/privilege', { staff_id: staffId }),
  );
  if (!json.success || !json.data) throw new Error('ไม่สามารถตรวจสอบสิทธิ์ได้');
  return json.data;
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function getList(
  type: string,
  staffId: string,
  start = 0,
  length = 20,
): Promise<ListResponse<PublicRepairJob>> {
  const perPage = length;
  const page = Math.floor(start / perPage);
  const json = await getJson<{
    success: boolean;
    data: PublicRepairJob[];
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

// ── Detail ────────────────────────────────────────────────────────────────────

export async function getDetail(repairId: number, staffId: string): Promise<PublicRepairDetail> {
  const json = await getJson<{ success: boolean; data: PublicRepairDetail }>(
    buildUrl('/detail', { repair_id: repairId, staff_id: staffId }),
  );
  if (!json.success || !json.data) throw new Error('ไม่สามารถโหลดรายละเอียดได้');
  return json.data;
}

// ── Reference ─────────────────────────────────────────────────────────────────

export async function getReference(type: string): Promise<PublicRepairReference[]> {
  const json = await getJson<{ success: boolean; data: PublicRepairReference[] }>(
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

export async function approveRepair(repairId: number, staffId: string) {
  const json = await postJson<{ success: boolean; error?: string }>(
    buildUrl('/approve'), { repair_id: repairId, staff_id: staffId },
  );
  ensureSuccess(json as never);
  return json;
}

export async function notAgreeRepair(repairId: number, staffId: string, reason?: string) {
  const json = await postJson<{ success: boolean; error?: string }>(
    buildUrl('/not-agree'), { repair_id: repairId, staff_id: staffId, reason },
  );
  ensureSuccess(json as never);
  return json;
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
