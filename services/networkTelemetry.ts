/**
 * Network failure + startup timing telemetry (scooba-insight T11, brief 6.5/6.6).
 *
 * What only the phone can see about a request: one that never reached the
 * gateway (DNS, TLS, timeout, offline), a 5xx a proxy answered before
 * scooba-service did, a body that would not parse — plus the ConnectionGate
 * probe outcome and how long the app took to open.
 *
 * Everything goes through `track()` with types/props already on the server
 * whitelist (scooba-service `src/observability/ingest.js`: `network`,
 * `startup`, `perf`) and disclosed in PRIVACY_POLICY_DRAFT §1.8
 * ("ประเภทปัญหาการเชื่อมต่อ", "ประสิทธิภาพ"). Only requests to our own API are
 * reported, path shaped (no query, ids → `:id`), never the URL of another host,
 * never a body. Never throws.
 */
import { API_BASE_URL, ENDPOINTS } from '@/constants/endpoints';
import { setNetworkFailureReporter, type NetworkFailureReport } from './api';
import { routeShape, track } from './telemetryService';

export type FailureClass = 'dns' | 'tls' | 'timeout' | 'offline' | 'http_5xx' | 'http_4xx' | 'parse' | 'other';

const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

// Platform wording (Android OkHttp / iOS NSURLError / browser). React Native
// often collapses all of these to "Network request failed"; then it is `other`
// unless the network state says offline.
const DNS = /unable to resolve host|unknownhost|hostname could not be found|enotfound|eai_again|name not resolved|getaddrinfo|no address associated/i;
const TLS = /ssl|tls|certificate|certpath|trust anchor|handshake|err_cert|secure connection/i;
const OFFLINE = /internet connection appears to be offline|not connected to the internet|network is unreachable|enetunreach|err_internet_disconnected/i;
const TIMEOUT = /timed? ?out|etimedout|timeout/i;

function errorText(error: unknown): string {
  if (!error) return '';
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    return `${error.name} ${error.message} ${cause instanceof Error ? cause.message : ''}`;
  }
  return String(error);
}

/**
 * The class of a request that threw (no response). `aborted` = our own timeout
 * fired; `connected` = expo-network's view of the phone right now.
 */
export function classifyFailure(error: unknown, aborted: boolean, connected?: boolean): FailureClass {
  if (aborted) return 'timeout';
  if (connected === false) return 'offline';
  const text = errorText(error);
  if (OFFLINE.test(text)) return 'offline';
  if (DNS.test(text)) return 'dns';
  if (TLS.test(text)) return 'tls';
  if (TIMEOUT.test(text)) return 'timeout';
  return 'other';
}

export function statusClass(status: number): FailureClass | null {
  if (status >= 500) return 'http_5xx';
  return null;
}

/** Our own API only, and never the telemetry call itself. */
export function isReportable(url: string): boolean {
  return Boolean(url) && url.startsWith(API_BASE_URL) && !url.startsWith(ENDPOINTS.telemetryEvents);
}

/** `https://…/scooba/api/leave/123?x=1` → `/api/leave/:id`. */
export function apiPath(url: string): string {
  return routeShape(url.slice(API_BASE_URL.length) || '/');
}

const network = () => {
  try {
    return require('expo-network') as typeof import('expo-network');
  } catch {
    return null;
  }
};

async function isConnected(): Promise<boolean | undefined> {
  try {
    const state = await network()?.getNetworkStateAsync();
    if (!state) return undefined;
    if (state.isConnected === false || state.isInternetReachable === false) return false;
    return true;
  } catch {
    return undefined;
  }
}

export type NetworkFailure = NetworkFailureReport;

/** Queue one `network` event. Fire-and-forget; never throws. */
export function reportNetworkFailure(failure: NetworkFailure): Promise<void> {
  return (async () => {
    if (!isReportable(failure.url)) return;
    let name: FailureClass | null;
    if (failure.parse) name = 'parse';
    else if (failure.status !== undefined) name = statusClass(failure.status);
    else name = classifyFailure(failure.error, Boolean(failure.aborted), failure.aborted ? undefined : await isConnected());
    if (!name) return;
    const method = (failure.method ?? 'GET').toUpperCase();
    track('network', name, {
      method: METHODS.has(method) ? method : undefined,
      path: apiPath(failure.url),
      status: failure.status,
      duration_ms: Math.max(0, Date.now() - failure.startedAt),
      attempt: failure.attempt,
      request_id: failure.requestId,
    });
  })().catch(() => undefined);
}

/** Wire into api.ts's fetchWithRetry / requestJson (called from app/_layout.tsx). */
export function startNetworkTelemetry(): void {
  setNetworkFailureReporter((report) => {
    void reportNetworkFailure(report);
  });
}

// --- startup -----------------------------------------------------------------

/** Module load of this file ≈ JS bundle start (imported by app/_layout.tsx). */
const APP_START = Date.now();
let coldStartSent = false;
let firstScreenSent = false;

/** ConnectionGate's probe outcome; `reason` is the last attempt's failure class. */
export function reportGate(passed: boolean, durationMs: number, reason?: FailureClass): void {
  track('startup', passed ? 'gate_passed' : 'gate_failed', {
    reason: passed ? undefined : reason ?? 'other',
    duration_ms: Math.max(0, Math.round(durationMs)),
  });
  if (passed && !coldStartSent) {
    coldStartSent = true;
    track('perf', 'cold_start', { duration_ms: Math.max(0, Date.now() - APP_START) });
  }
}

/** The first screen of this launch is on screen (once per process). */
export function reportFirstScreen(route: string | null | undefined): void {
  if (firstScreenSent) return;
  firstScreenSent = true;
  track('perf', 'first_screen', {
    duration_ms: Math.max(0, Date.now() - APP_START),
    route: route ? routeShape(route) : undefined,
  });
}

/** Test-only reset. */
export function __resetNetworkTelemetryForTests() {
  coldStartSent = false;
  firstScreenSent = false;
}
