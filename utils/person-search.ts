/**
 * Pure helpers behind the staff-search result card: which parts of a line match
 * what was typed, how an office-phone field splits into numbers, and the letter
 * that stands in for a missing photo.
 */

export type HighlightPart = { text: string; match: boolean };

/**
 * Cuts `text` into runs that do and do not match `keyword`, case-insensitively and
 * at every place it occurs, so the card can mark each one. A keyword shorter than
 * two characters marks nothing — the search itself does not start before two.
 */
export function splitHighlight(text: string, keyword: string): HighlightPart[] {
  const needle = keyword.trim().toLocaleLowerCase();
  if (!text) return [];
  if (needle.length < 2) return [{ text, match: false }];

  const haystack = text.toLocaleLowerCase();
  const parts: HighlightPart[] = [];
  let from = 0;

  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) break;
    if (at > from) parts.push({ text: text.slice(from, at), match: false });
    parts.push({ text: text.slice(at, at + needle.length), match: true });
    from = at + needle.length;
  }

  if (from < text.length) parts.push({ text: text.slice(from), match: false });
  return parts;
}

/**
 * OFFICE_TEL holds one or several extensions in one string ("7440, 7441",
 * "7440/7441", "7440 7441"). Each becomes its own button; repeats are dropped.
 */
export function splitPhones(value: string): string[] {
  const seen = new Set<string>();
  for (const raw of value.split(/[,;/|\n]+|\s{1,}(?=\d)/)) {
    const phone = raw.trim();
    if (phone && /\d/.test(phone)) seen.add(phone);
  }
  return [...seen];
}

// Thai vowels written before the consonant they follow in speech (เ แ โ ใ ไ):
// "เกษม" should show ก, not เ.
const LEADING_THAI_VOWEL = /^[\u0E40-\u0E44]/;

/** The letter drawn in the avatar circle when a person has no photo. */
export function getInitial(name: string): string {
  const trimmed = name.trim().replace(LEADING_THAI_VOWEL, '');
  const first = Array.from(trimmed)[0] ?? '';
  return first.toLocaleUpperCase();
}

/** A stable small number for the same person, so their avatar keeps one tone. */
export function pickTone(seed: string, toneCount: number): number {
  if (toneCount <= 0) return 0;
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % toneCount;
}
