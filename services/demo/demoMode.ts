/**
 * Demo mode — the App Review account.
 *
 * Sign-in is PSU Passport only, and App Review cannot get a PSU Passport that
 * works from outside the university (rejection 2.1, 2026-10-13). So the login
 * page also takes one fixed username/password, and signing in with it puts the
 * app in demo mode: the whole of `fetch` is swapped for services/demo/demoApi.ts,
 * which answers every request with invented sample data. Apart from the public
 * faculty news feed, nothing a demo session does reaches a real server — no
 * staff record is read, no repair job or leave request is written, no push
 * device is registered.
 *
 * The credentials are not a secret and need not be: behind them is only the
 * fixture data in this folder. They are written into App Store Connect →
 * App Review Information.
 */
import { DEMO_MODE_ENABLED } from '../../constants/devConfig';
import type { AuthUser } from '../../models/types';

/** The switch is constants/devConfig.ts's DEMO_MODE_ENABLED. */
export { DEMO_MODE_ENABLED };
import { installDemoFetch, uninstallDemoFetch } from './demoApi';

export const DEMO_USERNAME = 'appreview';
export const DEMO_PASSWORD = 'IntaniaOne#Review26';

/** An invented staff id, outside the range real CENTRAL.STAFF_INFO ids use. */
export const DEMO_STAFF_ID = '0999901';

export const DEMO_USER: AuthUser = {
  staffId: DEMO_STAFF_ID,
  name: 'สมชาย ใจดี',
  given_name: 'สมชาย',
  family_name: 'ใจดี',
  email: 'demo.reviewer@example.com',
  isDemo: true,
};

export function isDemoUser(user: AuthUser | null | undefined): boolean {
  return user?.isDemo === true;
}

export function matchesDemoCredentials(username: string, password: string): boolean {
  return (
    DEMO_MODE_ENABLED &&
    username.trim().toLowerCase() === DEMO_USERNAME &&
    password === DEMO_PASSWORD
  );
}

let active = false;

export function isDemoActive() {
  return active;
}

export function enterDemoMode() {
  if (active) return;
  active = true;
  installDemoFetch();
}

export function exitDemoMode() {
  if (!active) return;
  active = false;
  uninstallDemoFetch();
}
