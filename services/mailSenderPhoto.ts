import { ENDPOINTS } from '@/constants/endpoints';
import { MAIL_MOCK_ENABLED } from '@/constants/mailAuth';
import { fetchApi } from '@/services/api';

/**
 * Photo of a mail sender who is university staff. The gateway's
 * /api/person/by-email matches the address (and display name) against the
 * staff directory — the directory search itself can't look up an address, and
 * its EMAIL column often isn't the Microsoft 365 one. Anyone it can't pin down
 * (an external sender, a shared mailbox) resolves to null and the avatar keeps
 * its initial.
 */
const cache = new Map<string, Promise<string | null>>();

async function lookup(address: string, name: string): Promise<string | null> {
  try {
    const url = new URL(`${ENDPOINTS.person}/by-email`);
    url.searchParams.set('email', address);
    if (name) url.searchParams.set('name', name);

    const response = await fetchApi(url.toString(), { method: 'GET' });
    if (!response.ok) return null;

    const json = (await response.json()) as { data?: { staffId?: unknown } };
    const staffId = json?.data?.staffId;
    return typeof staffId === 'string' && staffId
      ? `${ENDPOINTS.photoBase}${encodeURIComponent(staffId)}.jpg`
      : null;
  } catch {
    return null;
  }
}

export function getSenderPhoto(address?: string, name?: string): Promise<string | null> {
  const key = (address ?? '').trim().toLowerCase();
  // Only the university's own domains can be in the staff directory.
  if (MAIL_MOCK_ENABLED || !/@([a-z0-9-]+\.)*psu\.ac\.th$/.test(key)) return Promise.resolve(null);
  let pending = cache.get(key);
  if (!pending) {
    pending = lookup(key, (name ?? '').trim());
    cache.set(key, pending);
  }
  return pending;
}
