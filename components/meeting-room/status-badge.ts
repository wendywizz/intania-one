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

/** @param statusLabel the label already resolved server-side (STATUS_DETAIL.detail) */
export function getMeetingRoomStatusBadge(statusLabel: string): ListCardBadge | null {
  const label = statusLabel.trim();
  if (!label) return null;

  return { text: label, ...statusBadgeColors(label) };
}
