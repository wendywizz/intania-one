import type { AppColors } from '@/constants/theme';

/**
 * Approved/pending/rejected badge colours, shared by every "decision" badge
 * across the app (absence detail/approve-detail, timestamp record/history
 * detail, and any screen with the same three-state approval concept) —
 * before this file existed, at least four screens had copy-pasted the exact
 * same light-mode-only hex pairs into their own local `getStatusBadge()`.
 *
 * No colour values live here any more — they're variables on `AppColors` in
 * constants/theme.ts (successSoft/successOnSoft etc.), so components never
 * branch on light/dark themselves. This file only maps an approval *kind* to
 * the right pair from whichever palette `useColors()` already handed them.
 */
export type ApprovalStatusKind = 'approved' | 'pending' | 'rejected' | 'unknown';

type ApprovalStatusColors = { bg: string; color: string };

export function getApprovalStatusBadge(
  kind: ApprovalStatusKind,
  c: AppColors,
): ApprovalStatusColors {
  switch (kind) {
    case 'approved':
      return { bg: c.successSoft, color: c.successOnSoft };
    case 'pending':
      return { bg: c.warningSoft, color: c.warningOnSoft };
    case 'rejected':
      return { bg: c.dangerSoft, color: c.dangerOnSoft };
    case 'unknown':
    default:
      // No recognizable status text at all — reads as "needs attention" red,
      // same as an explicit rejection.
      return { bg: c.dangerSoft, color: c.dangerOnSoft };
  }
}
