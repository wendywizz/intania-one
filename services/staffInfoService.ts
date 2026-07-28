import AsyncStorage from '@react-native-async-storage/async-storage';

import { ENDPOINTS } from '../constants/endpoints';
import { createApiUrl, requestJson } from './api';

/**
 * Whether the person who just signed in with PSU Passport is Faculty of
 * Engineering staff, and may therefore use the app.
 *
 * The decision is the gateway's (`GET /api/staff-info`), not this file's — the
 * app never talks to the personnel system directly and never sees the rule.
 */
export type StaffEligibility = {
  staffId: string;
  name: string;
  facultyId: string;
  facultyName: string;
  departmentName: string;
  campusId: string;
  eligible: boolean;
  /** 'eligible' | 'other_faculty' | 'not_found' — for logs and support. */
  reason: string;
};

const CACHE_KEY_PREFIX = 'staffEligibility:';

function cacheKey(staffId: string) {
  return `${CACHE_KEY_PREFIX}${staffId}`;
}

/**
 * Asks the gateway whether `staffId` may use the app.
 *
 * Throws when the answer could not be obtained (offline, gateway down, upstream
 * error). A thrown error means "unknown", never "not eligible" — the caller has
 * to keep those apart or a dropped connection would lock out real staff.
 */
export async function fetchStaffEligibility(staffId: string): Promise<StaffEligibility> {
  const url = createApiUrl(ENDPOINTS.staffInfo, { staff_id: staffId });
  const json = await requestJson<{ data?: StaffEligibility }>(url);

  if (!json?.data || typeof json.data.eligible !== 'boolean') {
    throw new Error('Malformed staff-info response');
  }

  return json.data;
}

/**
 * Last verdict seen for this staff id. Lets a returning user land on the right
 * home screen immediately instead of flashing the wrong one while the check runs
 * — and keeps the gate closed for someone already known to be ineligible even if
 * the re-check cannot complete.
 */
export async function readCachedEligibility(staffId: string): Promise<boolean | null> {
  try {
    const stored = await AsyncStorage.getItem(cacheKey(staffId));
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

export async function writeCachedEligibility(staffId: string, eligible: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(staffId), eligible ? 'true' : 'false');
  } catch {
    // A cache that will not persist costs a re-check, nothing more.
  }
}
