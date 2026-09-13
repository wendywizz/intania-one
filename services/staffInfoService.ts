import AsyncStorage from '@react-native-async-storage/async-storage';

import { ENDPOINTS } from '../constants/endpoints';
import { createApiUrl, requestJson } from './api';
import type { StaffStampRole } from './timestampService';

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
  /** CENTRAL.STAFF_INFO.POSITION_ID, for display and support. */
  positionId: string;
  positionName: string;
  /**
   * Whether this person may use the lecturer-stamping tab.
   *
   * The gateway decides it from POSITION_ID; the app never compares the id
   * itself, so which positions count can change without a new build. PSU
   * Passport carries no claim about position at all — this is the only place
   * the app can learn it.
   */
  isLecturer: boolean;
  /**
   * Which stamping screen this person belongs on.
   *
   * Decided by the gateway from POSITION_ID, like `isLecturer` — the app holds
   * no copy of the position lists, so they can change without a new build.
   * `isLecturer` is kept for the callers that already read it; anything new
   * should switch on this.
   */
  stampRole: StaffStampRole;
  /**
   * Whether this person may use the "เวรห้องคอมพิวเตอร์" (scooba-comp-ot) home
   * tile — decided by the gateway from CENTRAL.STAFF_INFO.DEPT_ID (dept 209),
   * the same way `isLecturer` is decided from POSITION_ID. The app never
   * compares the department id itself.
   */
  isCompOtEligible: boolean;
  eligible: boolean;
  /** 'eligible' | 'other_faculty' | 'not_found' — for logs and support. */
  reason: string;
};

const CACHE_KEY_PREFIX = 'staffEligibility:';
const LECTURER_CACHE_KEY_PREFIX = 'staffIsLecturer:';
const ROLE_CACHE_KEY_PREFIX = 'staffStampRole:';
const COMP_OT_CACHE_KEY_PREFIX = 'staffIsCompOtEligible:';

function cacheKey(staffId: string) {
  return `${CACHE_KEY_PREFIX}${staffId}`;
}

function lecturerCacheKey(staffId: string) {
  return `${LECTURER_CACHE_KEY_PREFIX}${staffId}`;
}

function roleCacheKey(staffId: string) {
  return `${ROLE_CACHE_KEY_PREFIX}${staffId}`;
}

function compOtCacheKey(staffId: string) {
  return `${COMP_OT_CACHE_KEY_PREFIX}${staffId}`;
}

/**
 * Which stamping screen this person was on last time we asked, or null.
 *
 * Cached for the same reason `isLecturer` is: the timestamp tab bar has to draw
 * the right tab on its very first frame, and entering the module has to land on
 * the right screen, neither of which can wait for a network round trip that has
 * already been made once.
 */
export async function readCachedStampRole(staffId: string): Promise<StaffStampRole | null> {
  try {
    const stored = await AsyncStorage.getItem(roleCacheKey(staffId));
    if (stored === 'lecturer' || stored === 'guard' || stored === 'staff') {
      return stored;
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeCachedStampRole(staffId: string, role: StaffStampRole): Promise<void> {
  try {
    await AsyncStorage.setItem(roleCacheKey(staffId), role);
  } catch {
    // A cache that will not persist costs a re-check, nothing more.
  }
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

  // `stampRole` is newer than some deployed gateways, and an older one simply
  // leaves it out. Left as `undefined` it would travel all the way to
  // `stampRole === 'staff'` in the tab bar, which is false — so a gateway one
  // release behind would silently hide the stamping tab from every member of
  // general staff. Defaulting here rather than at each reader means there is
  // one place that can be wrong instead of several.
  return {
    ...json.data,
    stampRole: normalizeStampRole(json.data.stampRole),
    // Same reasoning as stampRole: an older gateway simply omits this field,
    // and the safe default is "no tile" rather than a crash on `undefined`.
    isCompOtEligible: json.data.isCompOtEligible === true,
  };
}

/** Anything that is not a role we know becomes 'staff' — the majority, and the
 *  one whose screen is read-only, so a wrong guess costs a redraw. */
function normalizeStampRole(value: unknown): StaffStampRole {
  return value === 'lecturer' || value === 'guard' || value === 'staff' ? value : 'staff';
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

/**
 * Whether this person was a lecturer last time we asked, or null if nobody has.
 *
 * Cached separately from `eligible` rather than as one object: the two answer
 * different questions, are read by different code, and a stored shape that grows
 * a field is a stored shape that can be half-written. Two keys cannot disagree
 * with each other about which half is current.
 *
 * What it buys: the timestamp tab bar draws the lecturer tab on its very first
 * frame, and entering the module lands on the right tab, instead of both
 * waiting on a network round trip that has already been made once.
 */
export async function readCachedIsLecturer(staffId: string): Promise<boolean | null> {
  try {
    const stored = await AsyncStorage.getItem(lecturerCacheKey(staffId));
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

export async function writeCachedIsLecturer(staffId: string, isLecturer: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(lecturerCacheKey(staffId), isLecturer ? 'true' : 'false');
  } catch {
    // Same as above: a cache that will not persist costs a re-check.
  }
}

/**
 * Whether this person was comp-ot-eligible last time we asked, or null if
 * nobody has. Same shape and reasoning as readCachedIsLecturer: the home
 * screen has to draw (or not draw) the "เวรห้องคอมพิวเตอร์" tile on its very
 * first frame, without waiting on a network round trip that has already been
 * made once.
 */
export async function readCachedIsCompOtEligible(staffId: string): Promise<boolean | null> {
  try {
    const stored = await AsyncStorage.getItem(compOtCacheKey(staffId));
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

export async function writeCachedIsCompOtEligible(staffId: string, isCompOtEligible: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(compOtCacheKey(staffId), isCompOtEligible ? 'true' : 'false');
  } catch {
    // Same as above: a cache that will not persist costs a re-check.
  }
}
