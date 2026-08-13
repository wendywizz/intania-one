import * as ImageManipulator from 'expo-image-manipulator';

import { ENDPOINTS } from '../constants/endpoints';
import { MODULE_DISABLED } from '../constants/module-status';
import type { Person } from '../models/types';
import { fetchApi } from './api';

/**
 * my-profile — the signed-in person's own record.
 *
 * All three calls go to the gateway's own `/api/my-profile` paths, including the
 * read, which the gateway resolves through person-search on the other side. That
 * indirection is deliberate: the gateway gates a module by its path prefix, so a
 * screen reading through `/api/person` would keep working after somebody
 * switched this module off and would only fail on save. Owning the path is what
 * makes the module switchable as one thing.
 *
 * The writes go through the gateway for a different reason: the HMAC signature
 * for the personnel application and the photo host's API key live there, and
 * neither belongs in a bundle anyone can unzip.
 *
 * Every call is keyed by UNI_STAFF_ID — `useAuth().user.staffId`, which OpenID
 * supplies. The internal STAFF_ID matches nobody upstream and fails silently.
 */

/**
 * Whatever the gateway said went wrong, falling back to `fallback`.
 *
 * A switched-off module comes back marked, not as plain text: `ErrorState` reads
 * that marker to show "somebody turned this off" instead of dressing a
 * deliberate decision as a fault. Same envelope `requestJson` handles for the
 * screens that go through it — these calls need the Response itself, so the
 * check is repeated here rather than shared.
 */
async function readError(response: Response, fallback: string): Promise<string> {
  const text = await response.text().catch(() => '');

  try {
    const json = JSON.parse(text) as { error?: { name?: string; message?: string } | string };
    const error = typeof json.error === 'string' ? { message: json.error } : json.error;
    const detail = typeof error?.message === 'string' ? error.message.trim() : '';

    if (response.status === 503 && error?.name === 'ModuleDisabled') {
      return `${MODULE_DISABLED} ${detail}`.trim();
    }

    if (detail) {
      return detail;
    }
  } catch {
    // Not our envelope — the status is all we have to go on.
  }

  return `${fallback} (${response.status})`;
}

/** The person's own record, or null when the directory does not know them. */
export async function getMyProfile(staffId: string): Promise<Person | null> {
  const trimmed = staffId.trim();
  if (!trimmed) {
    return null;
  }

  const url = new URL(ENDPOINTS.myProfile);
  url.searchParams.set('staff_id', trimmed);

  const response = await fetchApi(url.toString());

  // The directory not knowing this person is an empty profile, not a failure —
  // the screen still has a name and an email from the OpenID claims to show.
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await readError(response, 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้'));
  }

  const json = (await response.json()) as { data?: Person | null };

  return json.data ?? null;
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
