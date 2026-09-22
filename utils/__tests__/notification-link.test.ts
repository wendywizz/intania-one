/**
 * Where a tapped notification goes — the confirmed seam is
 * `getNotificationRoute()`, the one table both the tray tap
 * (hooks/use-notification-deep-link.ts) and the in-app notification list read.
 *
 * Expected routes are the decisions agreed for each notification, not values
 * read back out of the table.
 */
import type { PushNotificationHistoryItem } from '@/services/notificationService';
import { getNotificationRoute } from '@/utils/notification-link';

function tapped(type: string, extra: Record<string, unknown> = {}): PushNotificationHistoryItem {
  return {
    id: `push-${type}`,
    title: 'title',
    body: 'body',
    receivedAt: '2026-09-22T08:00:00.000Z',
    status: 'read',
    data: { type, ...extra },
  };
}

describe('getNotificationRoute', () => {
  it('opens the forgot-to-stamp form from the morning missing-stamp reminder', () => {
    expect(getNotificationRoute(tapped('forget_timestamp_reminder'))).toBe('/timestamp/forgot-timestamp');
  });

  it("opens the stamp screen from the 09:35 lecturer's not-yet-stamped reminder", () => {
    expect(getNotificationRoute(tapped('lect_timestamp_reminder'))).toBe('/timestamp/stamp');
  });

  it('opens the exam-duty list from the reminder before an exam duty', () => {
    expect(getNotificationRoute(tapped('examinar_reminder'))).toBe('/examinar');
  });

  it('opens nothing for the day-before-a-holiday announcement', () => {
    expect(getNotificationRoute(tapped('holiday_reminder'))).toBeNull();
  });
});

/**
 * The gateway's side of the contract, read from the sibling checkout when there
 * is one: every `type` scooba-service can put on a push must open a screen, or
 * be an announcement on purpose. Catches the next event added to events.js
 * without a line in utils/notification-link.ts - how four of them went
 * unrouted before.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path') as typeof import('path');

const GATEWAY_EVENTS = path.resolve(__dirname, '../../../scooba-service/src/api/push/utils/events.js');
const ANNOUNCEMENTS = ['holiday_reminder'];

(fs.existsSync(GATEWAY_EVENTS) ? describe : describe.skip)('every notification the gateway can send', () => {
  it('opens a screen, unless it is an announcement', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { EVENTS } = require(GATEWAY_EVENTS) as { EVENTS: Record<string, { type: string }> };
    const types = [...new Set(Object.values(EVENTS).map((event) => event.type))];

    const unrouted = types.filter((type) => !ANNOUNCEMENTS.includes(type) && getNotificationRoute(tapped(type)) === null);

    expect(unrouted).toEqual([]);
  });
});
