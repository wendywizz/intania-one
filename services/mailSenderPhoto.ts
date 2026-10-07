import { MAIL_MOCK_ENABLED } from '@/constants/mailAuth';
import { getPersonPhoto, getPersonnelSuggestions } from '@/services/personService';

/**
 * Photo of a mail sender who is university staff, found by matching the sender's
 * address against the staff directory. Anyone not in the directory (an external
 * sender) resolves to null and the avatar keeps its initial.
 */
const cache = new Map<string, Promise<string | null>>();

function emailOf(person: unknown): string {
  const record = person as Record<string, unknown>;
  const value = record.EMAIL ?? record.email;
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

async function lookup(address: string): Promise<string | null> {
  for (const term of [address, address.split('@')[0]]) {
    try {
      const people = await getPersonnelSuggestions(term);
      const match = people.find((p) => emailOf(p) === address && p.staffId);
      if (match) return getPersonPhoto(match);
    } catch {
      return null;
    }
  }
  return null;
}

export function getSenderPhoto(address?: string): Promise<string | null> {
  const key = (address ?? '').trim().toLowerCase();
  // Only the university's own domains can be in the staff directory.
  if (MAIL_MOCK_ENABLED || !/@([a-z0-9-]+\.)*psu\.ac\.th$/.test(key)) return Promise.resolve(null);
  let pending = cache.get(key);
  if (!pending) {
    pending = lookup(key);
    cache.set(key, pending);
  }
  return pending;
}
