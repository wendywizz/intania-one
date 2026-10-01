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

const EMERALD = '#2ECC71';
const SUN_FLOWER = '#F1C40F';
const ALIZARIN = '#E74C3C';
const WHITE = '#FFFFFF';

function statusBadgeColors(label: string): { bg: string; color: string } {
  const lower = label.toLowerCase();

  if (
    lower.includes('อนุมัติแล้ว') ||
    lower.includes('approved') ||
    lower.includes('completed') ||
    lower.includes('success')
  ) {
    return { bg: EMERALD, color: WHITE };
  }
  if (
    lower.includes('รออนุมัติ') ||
    lower.includes('pending') ||
    lower.includes('waiting') ||
    lower.includes('processing')
  ) {
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
const SHORT_LABELS: [match: string, short: string][] = [
  ['ไม่อนุมัติ', 'ไม่อนุมัติ'],
  ['ยกเลิก', 'ยกเลิกแล้ว'],
  ['จัดสรรห้องให้ไม่ได้', 'ห้องเต็ม'],
  ['รออนุมัติ', 'รออนุมัติ'],
  ['ประจำคณะอนุมัติแล้ว', 'อนุมัติแล้ว'],
  ['หน่วยงานอนุมัติแล้ว', 'หน่วยงานอนุมัติ'],
  ['ดำเนินการแล้ว', 'ดำเนินการแล้ว'],
];

/** The badge wording for a status — short form when one is known, else the
 *  server's own label unchanged. */
export function shortMeetingRoomStatus(statusLabel: string): string {
  const label = statusLabel.trim();
  return SHORT_LABELS.find(([match]) => label.includes(match))?.[1] ?? label;
}

/** @param statusLabel the label already resolved server-side (STATUS_DETAIL.detail) */
export function getMeetingRoomStatusBadge(statusLabel: string): ListCardBadge | null {
  const label = statusLabel.trim();
  if (!label) return null;

  // Colour from the full label, text from the short one.
  return { text: shortMeetingRoomStatus(label), ...statusBadgeColors(label) };
}
