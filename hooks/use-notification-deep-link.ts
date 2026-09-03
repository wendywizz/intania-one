import { router } from 'expo-router';
import { useEffect } from 'react';

import { setNotificationTapHandler } from '@/services/notificationService';
import { getNotificationRoute, markNotificationNavigation } from '@/utils/notification-link';

/**
 * Open the screen a notification is about when it is tapped **outside** the app
 * — the banner, the notification tray, the lock screen.
 *
 * The other half of this lives in `app/notification.tsx`, where tapping a row
 * navigates the same way. Both read the same table (`utils/notification-link.ts`),
 * so a notification leads to the same screen however it was reached.
 *
 * Call this from the component that renders the navigator, and pass `enabled`
 * false until two things are true:
 *
 * - **The navigator is rendered.** A cold start delivers the launching tap while
 *   the splash screen is still up, and navigating then goes nowhere. React runs
 *   child effects before the parent's, so a caller that renders the navigator in
 *   the same commit has it mounted by the time this effect arms.
 * - **Somebody is signed in.** Every module screen derives its staff id from the
 *   session, so one opened without it loads nothing.
 *
 * Neither wait loses the tap: the service holds it until a handler is set, so
 * signing in lands on the thing the notification was about.
 *
 * `router` directly rather than `navPush`, per the note in `utils/navigation.ts`
 * — the 500ms lock is there to swallow a double tap by a person, and this is not
 * a person tapping.
 */
export function useNotificationDeepLink(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    setNotificationTapHandler((item) => {
      const route = getNotificationRoute(item);
      // An announcement with nothing to act on. It is already marked read; there
      // is simply nowhere for it to go.
      if (!route) {
        return;
      }

      // Read by the app lock, which would otherwise reset to home on the way
      // back in and undo this. See consumeNotificationNavigation.
      markNotificationNavigation();
      router.push(route);
    });

    return () => setNotificationTapHandler(null);
  }, [enabled]);
}
