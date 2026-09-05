import type { Href } from 'expo-router';

import type { PushNotificationHistoryItem } from '@/services/notificationService';

/**
 * Where a notification goes when it is tapped.
 *
 * The gateway sends an event *key* as `data.type` and nothing else about
 * routing (scooba-service `src/api/push/utils/events.js`) — deliberately, because
 * the same event is also delivered to the web applications, and a route is a
 * client's business. So the mapping belongs here: one table, so adding an event
 * is one line rather than a hunt through the notification screen.
 *
 * Every route is a module's **list** screen, never a record. A push carries the
 * upstream's own job id, not a route parameter the detail screens accept, and
 * the list is where the work is actually done anyway.
 *
 * Sending someone to a route belonging to a role they do not hold is safe and
 * intentional: both role-gated modules redirect an out-of-role path to that
 * person's own default tab (`app/repair-computer/(tabs)/_layout.tsx`,
 * `app/notice-repair/(tabs)/_layout.tsx`). That is what resolves the events
 * whose `type` is shared by two audiences — a job submitted, told to the
 * foreman and to the person who reported it — without the app having to know
 * which side of it this device is on.
 */
const ROUTE_BY_TYPE: Readonly<Record<string, string>> = {
  // ── Meeting ────────────────────────────────────────────────────────────────
  // The gateway's cron, an hour before it starts, so today's list is the answer.
  meeting_reminder: '/meeting',

  // ── Absence ────────────────────────────────────────────────────────────────
  ABSENCE_new_request: '/absence/approve-leave',
  ABSENCE_response: '/absence/my-leave',
  ABSENCE_rejected: '/absence/my-leave',

  // ── Meeting Room ───────────────────────────────────────────────────────────
  // Raised by room/leader_order.php itself at the moment the dept leader
  // decides — see the plan this pair was built from. Both land on the merged
  // current list (services/roomBookingAggregator.ts): approved and rejected
  // are still status < 90, so the request is still "current", not "history".
  meeting_room_approved: '/booking-room',
  meeting_room_rejected: '/booking-room',

  // ── Timestamp (forgot to clock in/out) ─────────────────────────────────────
  forget_timestamp_new_request: '/timestamp/approve',
  // A decided request has left the pending tab; the history is where it is now.
  forget_timestamp_approve_result: '/timestamp/history',
  forget_timestamp_rejected: '/timestamp/history',

  // ── Repair Computer ────────────────────────────────────────────────────────
  repair_computer_new_job: '/repair-computer/foreman-new-job',
  repair_computer_job_forwarded: '/repair-computer/foreman-new-job',
  repair_computer_job_assigned: '/repair-computer/worker-new-job',
  repair_computer_job_unassigned: '/repair-computer/worker-current-job',
  repair_computer_supply_approved: '/repair-computer/worker-current-job',
  repair_computer_supply_rejected: '/repair-computer/worker-current-job',
  // Told to the person who reported the fault.
  repair_computer_job_accepted: '/repair-computer/current-job',
  repair_computer_job_rejected: '/repair-computer/current-job',
  repair_computer_result_reported: '/repair-computer/current-job',
  // Told to the foreman side: progress on a job they are managing.
  repair_computer_supply_requested: '/repair-computer/manage-job',
  repair_computer_worker_response: '/repair-computer/manage-job',
  repair_computer_operate_progress: '/repair-computer/manage-job',
  repair_computer_supply_result: '/repair-computer/manage-job',
  repair_computer_sent_to_foreman: '/repair-computer/manage-job',
  repair_computer_operate_update: '/repair-computer/manage-job',
  repair_computer_job_submitted: '/repair-computer/manage-job',
  repair_computer_manage_update: '/repair-computer/manage-job',
  repair_computer_job_closed: '/repair-computer/manage-job',

  // ── Notice Repair (สาธารณูปการ) ────────────────────────────────────────────
  // Raised by the notice-repair website, not by the gateway — same `type`
  // values either way.
  notice_repair_new_job: '/notice-repair/approve-pending',
  notice_repair_examined: '/notice-repair/header-review',
  // Everything else on this module is progress reported to the informer, whose
  // live jobs are the one list that holds all of it.
  notice_repair_approved: '/notice-repair/informer-current',
  notice_repair_not_agreed: '/notice-repair/informer-current',
  notice_repair_accepted: '/notice-repair/informer-current',
  notice_repair_category_changed: '/notice-repair/informer-current',
  notice_repair_assigned: '/notice-repair/informer-current',
  notice_repair_estimated: '/notice-repair/informer-current',
  notice_repair_supply_requested: '/notice-repair/informer-current',
  notice_repair_supply_ready: '/notice-repair/informer-current',
  notice_repair_finished: '/notice-repair/informer-current',
  notice_repair_cannot_repair: '/notice-repair/informer-current',
  notice_repair_not_repair_update: '/notice-repair/informer-current',
};

function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * The screen a notification should open, or `null` when it is an announcement
 * with nothing to act on.
 *
 * `data.url` wins over the table: it is how a caller sends the app somewhere
 * this file does not know about, and it is already a route.
 */
export function getNotificationRoute(item: PushNotificationHistoryItem): Href | null {
  const url = textValue(item.data?.url);
  if (url) return url as Href;

  const route = ROUTE_BY_TYPE[textValue(item.data?.type)];
  return route ? (route as Href) : null;
}

/**
 * How recently a notification tap may have navigated and still count.
 *
 * The app lock only re-locks after 60s away, so anything older than this window
 * cannot be the tap that brought the app forward — by then the user has been
 * away longer than the mark has lived.
 */
const NAVIGATION_MARK_WINDOW_MS = 60_000;

let navigatedAt = 0;

/** Record that a tapped notification has just navigated somewhere. */
export function markNotificationNavigation() {
  navigatedAt = Date.now();
}

/**
 * Whether a notification tap is what put the app on its current screen, clearing
 * the mark either way.
 *
 * `BiometricGate` asks before its return-lock resets the app to home. That reset
 * exists because whatever was open after a long absence is stale — but a push the
 * user has just tapped is the opposite of stale, and resetting would throw away
 * the screen they asked for between the tap and the unlock.
 *
 * A window rather than a plain flag: with no app lock configured nothing ever
 * consumes the mark, and a leftover one would swallow a legitimate reset hours
 * later.
 */
export function consumeNotificationNavigation(): boolean {
  const isRecent = navigatedAt > 0 && Date.now() - navigatedAt < NAVIGATION_MARK_WINDOW_MS;
  navigatedAt = 0;
  return isRecent;
}
