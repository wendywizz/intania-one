/**
 * Usage telemetry (scooba-insight T12, brief 6.7): screen views, push opens,
 * deep links, declined permissions and OTA status.
 *
 * Types/props are on the server whitelist (scooba-service
 * `src/observability/ingest.js`: `screen`, `push_open`, `deep_link`,
 * `permission`, `ota`) and disclosed in PRIVACY_POLICY_DRAFT §1.8 plus both
 * store answer sheets ("screen views (route name), push opened, permission
 * declined, OTA status"). Routes are shaped (`routeShape`: ids → `:id`, no
 * query), a push open carries only its category, never its title/body/data.
 * Never throws.
 */
import { routeShape, track } from './telemetryService';

// --- screen views --------------------------------------------------------------

let currentScreen: string | null = null;
let screenSince = 0;

/**
 * Called with every pathname change. Emits one `screen` event for the screen
 * being *left*, with how long it was on screen; the same route twice in a row
 * (a param change) is not a new view.
 */
export function reportScreen(pathname: string | null | undefined, now = Date.now()) {
  try {
    const next = pathname ? routeShape(pathname) : null;
    if (next === currentScreen) return;
    if (currentScreen) track('screen', currentScreen, { duration_ms: Math.max(0, now - screenSince) });
    currentScreen = next;
    screenSince = now;
  } catch {
    // never let reporting break navigation
  }
}

/** Close the open screen view (app to background), so its time is not lost. */
export function flushScreen(now = Date.now()) {
  const open = currentScreen;
  reportScreen(null, now);
  // Coming back resumes the same screen as a fresh view.
  currentScreen = null;
  return open;
}

// --- push / deep link --------------------------------------------------------

const CATEGORY = /^[a-z0-9_\-.]{1,48}$/i;

/** A notification tapped outside the app: its category (`data.type`) and where it leads. */
export function reportPushOpen(data: Record<string, unknown> | undefined, route?: string | null) {
  try {
    const type = typeof data?.type === 'string' ? data.type.trim() : '';
    track('push_open', CATEGORY.test(type) ? type : 'other', { route: route ? routeShape(route) : undefined });
  } catch {
    // ignore
  }
}

/** Path of an incoming link, scheme/host/query dropped (`scooba://meeting/123?x` → `/meeting/:id`). */
export function linkPath(url: string): string | null {
  const match = /^[a-z][a-z0-9+.\-]*:\/\/([^/?#]*)([^?#]*)/i.exec(url.trim());
  if (!match) return null;
  // Custom schemes put the first route segment where a host would be.
  const isWeb = /^https?:/i.test(url);
  const path = isWeb ? match[2] : `/${match[1]}${match[2]}`;
  return routeShape(path.replace(/\/{2,}/g, '/') || '/');
}

/** A deep link that opened (or was handed to) the app. Expo dev-client URLs are ignored. */
export function reportDeepLink(url: string | null | undefined) {
  try {
    if (!url || /expo-development-client|^exp:\/\//i.test(url)) return;
    const path = linkPath(url);
    if (path && path !== '/') track('deep_link', path);
  } catch {
    // ignore
  }
}

// --- permissions -------------------------------------------------------------

export type PermissionKind = 'notifications' | 'camera' | 'photos' | 'location' | 'other';

type PermissionLike = { granted?: boolean; status?: string; canAskAgain?: boolean } | null | undefined;

/**
 * The answer to a permission prompt. Only declines are reported (the policy
 * says "permission declined"); `blocked` = the OS will not ask again.
 */
export function reportPermission(kind: PermissionKind, result: PermissionLike) {
  try {
    if (!result || result.granted || result.status === 'granted') return;
    const status = result.canAskAgain === false ? 'blocked' : result.status === 'undetermined' ? 'undetermined' : 'denied';
    track('permission', kind, { status });
  } catch {
    // ignore
  }
}

// --- OTA ---------------------------------------------------------------------

export type OtaStage = 'check' | 'downloaded' | 'applied' | 'error' | 'up_to_date';

/** EAS Update progress. `message` is scrubbed server-side; ids are update UUIDs (not personal). */
export function reportOta(stage: OtaStage, props?: { update_id?: string | null; message?: string | null }) {
  try {
    track('ota', stage, {
      update_id: props?.update_id ?? undefined,
      message: props?.message ? String(props.message).slice(0, 200) : undefined,
    });
  } catch {
    // ignore
  }
}

export function __resetUsageTelemetryForTests() {
  currentScreen = null;
  screenSince = 0;
}
