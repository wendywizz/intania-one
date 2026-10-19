/**
 * Status badge colour for a meeting-room request, copied from
 * `components/absence/absence-list-item.tsx`'s own `statusBadgeColors()` /
 * `getStatusBadge()` so a meeting-room row's badge is visually identical in
 * kind to an absence row's — same three flat-UI colours, same
 * substring-match-on-the-Thai-label approach.
 *
 * Deliberately matches on the label text (as it comes back from
 * STATUS_DETAIL, already resolved server-side) rather than on the numeric
 * REQUEST_ORDER.status — this module's own status catalogue beyond
 * 1/2/3/90 was never fully pinned down (see the plan this was built from),
 * so keying on words the site itself already produces is more robust than
 * hard-coding numbers this client would have to guess at.
 */
import type { ListCardBadge } from '@/components/ui/list-card';
import { TEXT } from '@/constants/text';

const EMERALD = '#2ECC71';
const SUN_FLOWER = '#F1C40F';
const ALIZARIN = '#E74C3C';
const WHITE = '#FFFFFF';

// What a status label says, as words in either language. The server's own labels are
// Thai; the English words are the same statuses as the app words them, so a label
// still sorts into the right colour if it ever arrives in English. Negations are
// tested first: "not approved" contains "approved".
const NEGATIVE = /ไม่อนุมัติ|not approved|reject|declin|cancel|ยกเลิก/;
const APPROVED = /อนุมัติแล้ว|approved|completed|success/;
const WAITING = /รออนุมัติ|pending|waiting|processing/;

function statusBadgeColors(label: string): { bg: string; color: string } {
  const lower = label.toLowerCase();

  if (!NEGATIVE.test(lower) && APPROVED.test(lower)) {
    return { bg: EMERALD, color: WHITE };
  }
  if (!NEGATIVE.test(lower) && WAITING.test(lower)) {
    return { bg: SUN_FLOWER, color: WHITE };
  }
  // ไม่อนุมัติ/reject/cancel and every other status (billed, room being
  // prepared, etc.) fall to the same colour as an explicit rejection —
  // this module's later-stage statuses were never a design target for the
  // requester's own list (see status-badge.ts's own docblock), so anything
  // past approve/reject reads as "needs your attention" rather than green.
  return { bg: ALIZARIN, color: WHITE };
}

/**
 * STATUS_DETAIL's wording is a sentence ("รออนุมัติจากผู้อนุมัติประจำหน่วยงานท่าน")
 * — too long for a pill. Matched on substrings like the colours above, first
 * hit wins, so the more specific phrases come first. Seen in production
 * (2026-10-01): 1 รออนุมัติจาก…หน่วยงานท่าน, 3/7 …ไม่อนุมัติ,
 * 4 เจ้าหน้าอาคารดำเนินการแล้ว, 5 …จัดสรรห้องให้ไม่ได้(ห้องใช้เต็มหมด),
 * 6 ผู้อนุมัติประจำคณะอนุมัติแล้ว, 91 …รับทราบการยกเลิก.
 */
// The first column is what the server's label contains (Thai - it is the server's
// own wording - or English), the second the TEXT key for the short pill in the app language.
// Each row matches a Thai phrase or its English counterpart (lower-cased).
const SHORT_LABELS: [match: RegExp, short: keyof typeof TEXT][] = [
  [/ไม่อนุมัติ|not approved|rejected/, 'MEETING_ROOM_STATUS_REJECTED'],
  [/ยกเลิก|cancel/, 'MEETING_ROOM_STATUS_CANCELLED'],
  [/จัดสรรห้องให้ไม่ได้|no room|room full|fully booked/, 'MEETING_ROOM_STATUS_FULL'],
  [/รออนุมัติ|pending|awaiting approval/, 'MEETING_ROOM_STATUS_PENDING'],
  [/ประจำคณะอนุมัติแล้ว|faculty approved|approved by the faculty/, 'MEETING_ROOM_STATUS_APPROVED'],
  [/หน่วยงานอนุมัติแล้ว|unit approved|department approved/, 'MEETING_ROOM_STATUS_UNIT_APPROVED'],
  [/ดำเนินการแล้ว|processed/, 'MEETING_ROOM_STATUS_DONE'],
];

/** The badge wording for a status — short form when one is known, else the
 *  server's own label unchanged. */
export function shortMeetingRoomStatus(statusLabel: string): string {
  const label = statusLabel.trim();
  const lower = label.toLowerCase();
  const hit = SHORT_LABELS.find(([match]) => match.test(lower));
  return hit ? (TEXT[hit[1]] as string) : label;
}

/** @param statusLabel the label already resolved server-side (STATUS_DETAIL.detail) */
export function getMeetingRoomStatusBadge(statusLabel: string): ListCardBadge | null {
  const label = statusLabel.trim();
  if (!label) return null;

  // Colour from the full label, text from the short one.
  return { text: shortMeetingRoomStatus(label), ...statusBadgeColors(label) };
}
