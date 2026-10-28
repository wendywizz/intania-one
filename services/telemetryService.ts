/**
 * The app-side telemetry queue (scooba-insight T10) — what only the phone can
 * see: JS crashes, render errors, unhandled rejections (and, from T11/T12,
 * requests that never reached the gateway, timings, screen views).
 *
 * Events are queued in memory and mirrored to AsyncStorage, so a report about
 * a request that never got out — or the crash that killed the app — survives
 * until the next launch. The queue is capped (oldest dropped first). It is sent
 * to scooba-service `POST /api/telemetry/events` (T9) when it reaches
 * FLUSH_AT events, when the app goes to the background, and once at startup.
 * A batch that cannot be delivered (offline, 5xx, 429) stays queued for the
 * next round; one the server rejects as malformed (other 4xx) is dropped so it
 * cannot block the queue forever.
 *
 * Self-hosted only (privacy policy §1.7/§1.8): no third-party SDK. Only the
 * types and props the server whitelists are built here, free text goes through
 * scrubText (emails, tokens, digit runs removed) and routes through routeShape.
 * Who sent it travels in the T9 headers (withApiToken), never in the body.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { ENDPOINTS } from '@/constants/endpoints';
import { withApiToken } from './api';
import { loadInstallId, osVersion, updateId } from './appHeaders';

export const TELEMETRY_STORAGE_KEY = 'TELEMETRY_QUEUE_V1';
/** Hard cap on queued events; the oldest go first beyond it. */
export const MAX_QUEUE = 200;
/** Send as soon as this many events are waiting. */
export const FLUSH_AT = 20;
/** Server limit per call (T9: ≤50 events, ≤64 KB). */
export const MAX_BATCH = 50;
const SEND_TIMEOUT_MS = 10000;
const PERSIST_DEBOUNCE_MS = 1000;

export type TelemetryType =
  | 'error'
  | 'network'
  | 'startup'
  | 'screen'
  | 'perf'
  | 'push_open'
  | 'deep_link'
  | 'permission'
  | 'ota';

export type TelemetryEvent = {
  type: TelemetryType;
  name: string;
  ts: number;
  props?: Record<string, string | number | boolean>;
  network_type?: string;
};

// Native modules are optional: telemetry must never be the reason the app fails.
function optionalModule<T>(load: () => T): T | null {
  try {
    return load();
  } catch {
    return null;
  }
}
const device = () => optionalModule(() => require('expo-device') as typeof import('expo-device'));
const updates = () => optionalModule(() => require('expo-updates') as typeof import('expo-updates'));
const network = () => optionalModule(() => require('expo-network') as typeof import('expo-network'));

// --- scrubbing (mirrors scooba-service src/observability/scrub.js) ----------

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const BEARER = /\b(Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]+/gi;
const TOKENISH = /[A-Za-z0-9_\-.~+/=]{24,}/g;
const EXPO_TOKEN = /ExponentPushToken\[[^\]]*\]/g;
const DIGITS = /\d{4,}/g;

export function clip(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Free text with emails, tokens and digit runs (staff ids, phones) removed. */
export function scrubText(value: unknown, max = 300): string {
  if (value === null || value === undefined) return '';
  const text = String(value)
    .replace(EXPO_TOKEN, '<push-token>')
    .replace(BEARER, '$1 <redacted>')
    .replace(EMAIL, '<email>')
    .replace(TOKENISH, '<token>')
    .replace(DIGITS, '#');
  return clip(text, max);
}

/** A path reduced to its shape: no query, id-like segments → `:id`. */
export function routeShape(path: unknown, max = 120): string {
  const bare = String(path || '/').split(/[?#]/)[0];
  const shaped = bare
    .split('/')
    .map((segment) => {
      if (!segment) return segment;
      if (/\d{3,}/.test(segment)) return ':id';
      if (segment.length >= 24 && /^[A-Za-z0-9_\-.~+=]+$/.test(segment)) return ':token';
      if (segment.includes('@')) return ':email';
      return segment;
    })
    .join('/');
  return clip(shaped || '/', max);
}

// --- queue -------------------------------------------------------------------

let queue: TelemetryEvent[] = [];
let loaded = false;
let loading: Promise<void> | null = null;
let flushing: Promise<void> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let appStateSub: { remove: () => void } | null = null;
let currentRoute: string | null = null;
let lastNetworkType: string | undefined;

function trim(events: TelemetryEvent[]): TelemetryEvent[] {
  return events.length > MAX_QUEUE ? events.slice(events.length - MAX_QUEUE) : events;
}

function isEvent(value: unknown): value is TelemetryEvent {
  return Boolean(value) && typeof (value as TelemetryEvent).type === 'string'
    && typeof (value as TelemetryEvent).name === 'string';
}

/** Merge whatever an earlier run left in storage in front of this run's events. */
function loadQueue(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (!loading) {
    loading = (async () => {
      let stored: TelemetryEvent[] = [];
      try {
        const raw = await AsyncStorage.getItem(TELEMETRY_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) stored = parsed.filter(isEvent);
      } catch {
        stored = [];
      }
      queue = trim([...stored, ...queue]);
      loaded = true;
    })().finally(() => {
      loading = null;
    });
  }
  return loading;
}

/** Write the queue to storage now (used before a fatal crash hands over). */
export async function persistTelemetry(): Promise<void> {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  try {
    await loadQueue();
    if (queue.length) {
      await AsyncStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(queue));
    } else {
      await AsyncStorage.removeItem(TELEMETRY_STORAGE_KEY);
    }
  } catch {
    // Storage full or unavailable: the in-memory queue still gets sent.
  }
}

function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistTelemetry();
  }, PERSIST_DEBOUNCE_MS);
}

/** Queue one event. Never throws. */
export function track(
  type: TelemetryType,
  name: string,
  props?: Record<string, string | number | boolean | null | undefined>,
): void {
  try {
    const event: TelemetryEvent = { type, name: clip(String(name || 'unknown'), 120), ts: Date.now() };
    if (props) {
      const clean: Record<string, string | number | boolean> = {};
      for (const [key, value] of Object.entries(props)) {
        if (value !== undefined && value !== null && value !== '') clean[key] = value;
      }
      if (Object.keys(clean).length) event.props = clean;
    }
    if (lastNetworkType) event.network_type = lastNetworkType;
    queue = trim([...queue, event]);
    schedulePersist();
    if (queue.length >= FLUSH_AT) void flushTelemetry();
  } catch {
    // never let reporting break the caller
  }
}

/** The route the user is on, shaped — set by the root layout, read by error reports. */
export function setTelemetryRoute(path: string | null | undefined) {
  currentRoute = path ? routeShape(path) : null;
}

export function getTelemetryRoute(): string | null {
  return currentRoute;
}

export function telemetryQueueLength(): number {
  return queue.length;
}

// --- sending -----------------------------------------------------------------

/** Batch-wide device info (privacy §1.8 "ข้อมูลอุปกรณ์"); never the user-set device name. */
export function deviceInfo(): Record<string, string> {
  const info: Record<string, string> = { platform: Platform.OS };
  const put = (key: string, value: unknown, max: number) => {
    if (value === null || value === undefined || value === '') return;
    info[key] = clip(String(value).replace(/[^\x20-\x7e]/g, '').trim(), max);
    if (!info[key]) delete info[key];
  };
  const d = device();
  put('os_version', osVersion(), 32);
  put('manufacturer', d?.manufacturer, 64);
  put('model', d?.modelName, 64);
  put('app_version', Constants.nativeAppVersion ?? Constants.expoConfig?.version, 32);
  put('build_number', Constants.nativeBuildVersion, 16);
  put('update_id', updateId(), 64);
  try {
    put('runtime_version', updates()?.runtimeVersion, 32);
  } catch {
    // no expo-updates in this build
  }
  return info;
}

const NETWORK_TYPE: Record<string, string> = {
  WIFI: 'wifi',
  CELLULAR: 'cellular',
  ETHERNET: 'ethernet',
  NONE: 'none',
  UNKNOWN: 'unknown',
};

async function networkType(): Promise<string | undefined> {
  try {
    const state = await network()?.getNetworkStateAsync();
    if (!state) return undefined;
    if (state.isConnected === false) return 'none';
    return NETWORK_TYPE[String(state.type)] ?? 'other';
  } catch {
    return undefined;
  }
}

type SendResult = 'sent' | 'retry' | 'drop';

async function send(events: TelemetryEvent[], type?: string): Promise<SendResult> {
  const url = ENDPOINTS.telemetryEvents;
  const body = JSON.stringify({
    device: deviceInfo(),
    ...(type ? { network_type: type } : {}),
    events,
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    // Straight fetch, not fetchWithTimeout: a failed telemetry call must never
    // be reported as telemetry itself (T11 hooks the request wrapper).
    const response = await fetch(url, {
      ...withApiToken(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
      signal: controller.signal,
    });
    if (response.ok) return 'sent';
    if (response.status === 429 || response.status === 408 || response.status >= 500) return 'retry';
    // 401/403: wrong token in this build — keep for a fixed build rather than lose crash reports.
    if (response.status === 401 || response.status === 403) return 'retry';
    return 'drop';
  } catch {
    return 'retry';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Send what is queued, MAX_BATCH events per call. Stops at the first batch
 * that could not be delivered and keeps it (and everything after) for later.
 */
export function flushTelemetry(): Promise<void> {
  if (!flushing) {
    flushing = (async () => {
      await loadQueue();
      if (!queue.length) return;
      await loadInstallId().catch(() => undefined); // server requires X-Install-Id
      const type = await networkType();
      if (type) lastNetworkType = type;
      while (queue.length) {
        const batch = queue.slice(0, MAX_BATCH);
        const result = await send(batch, type);
        if (result === 'retry') break;
        // Events queued while the call was in flight sit after the batch.
        queue = queue.slice(batch.length);
      }
      await persistTelemetry();
    })()
      .catch(() => undefined)
      .finally(() => {
        flushing = null;
      });
  }
  return flushing;
}

/**
 * Start-up: load the leftovers of the last run, send them, and flush whenever
 * the app goes to the background. Idempotent; returns a stop function.
 */
export function startTelemetry(): () => void {
  if (!appStateSub) {
    appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') void flushTelemetry();
    });
    void flushTelemetry();
  }
  return stopTelemetry;
}

export function stopTelemetry() {
  appStateSub?.remove();
  appStateSub = null;
}

/** Test-only reset of module state. */
export function __resetTelemetryForTests() {
  stopTelemetry();
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = null;
  queue = [];
  loaded = false;
  loading = null;
  flushing = null;
  currentRoute = null;
  lastNetworkType = undefined;
}
