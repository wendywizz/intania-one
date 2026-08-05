import * as ImageManipulator from 'expo-image-manipulator';

import { ENDPOINTS } from '../constants/endpoints';
import type { Person } from '../models/types';
import { fetchApi } from './api';
import { getPersonnelSuggestions } from './personService';

/**
 * my-profile — the signed-in person's own record.
 *
 * Reads borrow person-search, which already returns the full record including
 * the photo; there is deliberately no second read endpoint for the same row.
 * The two writes are this module's own, and both go through the gateway rather
 * than straight to PSU: that is where the HMAC signature for the personnel
 * application and the photo host's API key live, neither of which belongs in a
 * bundle anyone can unzip.
 *
 * Every call is keyed by UNI_STAFF_ID — `useAuth().user.staffId`, which OpenID
 * supplies. The internal STAFF_ID matches nobody upstream and fails silently.
 */

/** Whatever the gateway said went wrong, falling back to `fallback`. */
async function readError(response: Response, fallback: string): Promise<string> {
  const text = await response.text().catch(() => '');

  try {
    const json = JSON.parse(text) as { error?: { message?: string } | string };
    const detail = typeof json.error === 'string' ? json.error : json.error?.message;
    if (typeof detail === 'string' && detail.trim()) {
      return detail.trim();
    }
  } catch {
    // Not our envelope — the status is all we have to go on.
  }

  return `${fallback} (${response.status})`;
}

/**
 * The person's own record, or null when the directory does not know them.
 *
 * Searching by staff id can match more than one row (the id appears in other
 * columns too), so the exact match wins and the first row is only a fallback.
 */
export async function getMyProfile(staffId: string): Promise<Person | null> {
  const trimmed = staffId.trim();
  if (!trimmed) {
    return null;
  }

  const results = await getPersonnelSuggestions(trimmed);

  return results.find((person) => String(person.staffId) === trimmed) ?? results[0] ?? null;
}

/**
 * Change one contact field.
 *
 * One field at a time on purpose: the screen edits them separately, and sending
 * only what changed means the other field cannot be overwritten with a stale
 * value the app happened to be holding.
 */
export async function updateMyProfileInfo(
  staffId: string,
  field: 'email' | 'phone',
  value: string,
): Promise<void> {
  const response = await fetchApi(ENDPOINTS.myProfileUpdateInfo, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staff_id: staffId, [field]: value }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'บันทึกข้อมูลไม่สำเร็จ'));
  }
}

/**
 * Replace the profile photo.
 *
 * The picked image is re-encoded to JPEG here rather than sent as-is: the photo
 * host only accepts JPEG, and a camera frame is several megabytes of HEIC or
 * PNG that would be rejected after the upload rather than before it. base64
 * over JSON, not multipart — a React Native multipart body behaves differently
 * on each of the three platforms this app runs on, and the gateway rebuilds the
 * multipart request the photo host wants.
 */
export async function uploadMyProfilePhoto(staffId: string, imageUri: string): Promise<void> {
  const manipulated = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 800 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );

  const base64 = manipulated.base64 ?? '';
  if (!base64) {
    throw new Error('ไม่สามารถอ่านไฟล์รูปภาพได้');
  }

  const response = await fetchApi(ENDPOINTS.myProfileUploadPhoto, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staff_id: staffId, photo_base64: base64 }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'อัปโหลดรูปภาพไม่สำเร็จ'));
  }
}
