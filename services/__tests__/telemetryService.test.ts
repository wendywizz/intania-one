/**
 * T10 — the telemetry queue: batching, persistence across launches, retry vs
 * drop, the queue cap, the request shape (whitelisted body, T9 headers), and
 * the error doors (global handler, unhandled rejection, scrubbing).
 */
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    nativeAppVersion: '1.4.2',
    nativeBuildVersion: '37',
    deviceName: "Somchai's iPhone",
    expoConfig: { version: '1.4.2', extra: {} },
  },
}));
jest.mock('expo-device', () => ({
  osVersion: '17.5',
  manufacturer: 'Apple',
  modelName: 'iPhone 15',
  deviceName: "Somchai's iPhone",
}));
jest.mock('expo-updates', () => ({ updateId: 'u-1', runtimeVersion: '1.4.0' }));
jest.mock('expo-network', () => ({
  NetworkStateType: { WIFI: 'WIFI' },
  getNetworkStateAsync: jest.fn(async () => ({ type: 'WIFI', isConnected: true })),
}));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000001') }));
jest.mock('@/constants/config', () => ({ ENV: { scoobaApiKey: 'test-key' } }));
jest.mock('../../constants/config', () => ({ ENV: { scoobaApiKey: 'test-key' } }));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { ENDPOINTS } from '@/constants/endpoints';
import { __resetAppHeadersForTests } from '@/services/appHeaders';
import {
  __resetErrorReportingForTests,
  installGlobalErrorHandlers,
  reportError,
  shortStack,
} from '@/services/errorReporting';
import {
  FLUSH_AT,
  MAX_BATCH,
  MAX_QUEUE,
  TELEMETRY_STORAGE_KEY,
  __resetTelemetryForTests,
  flushTelemetry,
  persistTelemetry,
  routeShape,
  scrubText,
  setTelemetryRoute,
  telemetryQueueLength,
  track,
} from '@/services/telemetryService';

type Call = { url: string; init: RequestInit & { headers: Record<string, string> } };
let calls: Call[] = [];
let respond: () => Promise<Response> | Response;

const ok = () => ({ ok: true, status: 202, json: async () => ({ accepted: 1, dropped: 0 }) }) as unknown as Response;
const status = (code: number) => () => ({ ok: false, status: code }) as unknown as Response;

function bodyOf(call: Call) {
  return JSON.parse(String(call.init.body));
}

async function settle() {
  // let fire-and-forget flushes run to the end
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
  await flushTelemetry();
}

beforeEach(async () => {
  __resetTelemetryForTests();
  __resetErrorReportingForTests();
  __resetAppHeadersForTests();
  await AsyncStorage.clear();
  calls = [];
  respond = ok;
  (globalThis as { fetch: unknown }).fetch = jest.fn(async (url: string, init: Call['init']) => {
    calls.push({ url, init });
    return respond();
  });
});

afterEach(() => {
  __resetTelemetryForTests();
});

describe('telemetry queue', () => {
  test('sends a whitelisted batch with the T9 headers, then empties the queue', async () => {
    track('error', 'TypeError', { source: 'global', fatal: false, message: 'boom' });
    await flushTelemetry();

    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call.url).toBe(ENDPOINTS.telemetryEvents);
    expect(call.url.endsWith('/api/telemetry/events')).toBe(true);
    expect(call.init.method).toBe('POST');
    expect(call.init.headers['X-Install-Id']).toBeTruthy();
    expect(call.init.headers['X-App-Version']).toBe('1.4.2+37');

    const body = bodyOf(call);
    expect(Object.keys(body).sort()).toEqual(['device', 'events', 'network_type']);
    expect(body.network_type).toBe('wifi');
    expect(body.device).toEqual({
      platform: expect.any(String),
      os_version: '17.5',
      manufacturer: 'Apple',
      model: 'iPhone 15',
      app_version: '1.4.2',
      build_number: '37',
      update_id: 'u-1',
      runtime_version: '1.4.0',
    });
    expect(JSON.stringify(body)).not.toContain('Somchai');
    expect(body.events).toEqual([
      {
        type: 'error',
        name: 'TypeError',
        ts: expect.any(Number),
        props: { source: 'global', fatal: false, message: 'boom' },
      },
    ]);
    expect(telemetryQueueLength()).toBe(0);
    expect(await AsyncStorage.getItem(TELEMETRY_STORAGE_KEY)).toBeNull();
  });

  test('a failed send keeps the events (and persists them) for the next round', async () => {
    (globalThis as { fetch: unknown }).fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    track('error', 'Error', { source: 'promise' });
    await flushTelemetry();
    expect(telemetryQueueLength()).toBe(1);
    const stored = JSON.parse(String(await AsyncStorage.getItem(TELEMETRY_STORAGE_KEY)));
    expect(stored).toHaveLength(1);

    respond = status(503);
    (globalThis as { fetch: unknown }).fetch = jest.fn(async (url: string, init: Call['init']) => {
      calls.push({ url, init });
      return respond();
    });
    await flushTelemetry();
    expect(telemetryQueueLength()).toBe(1); // 5xx: retry later

    respond = status(429);
    await flushTelemetry();
    expect(telemetryQueueLength()).toBe(1); // rate limited: retry later

    respond = ok;
    await flushTelemetry();
    expect(telemetryQueueLength()).toBe(0);
  });

  test('a batch the server rejects as malformed (400) is dropped, not retried forever', async () => {
    respond = status(400);
    track('error', 'Error', { source: 'other' });
    await flushTelemetry();
    expect(telemetryQueueLength()).toBe(0);
  });

  test('what a previous run left in storage is sent first, after a "relaunch"', async () => {
    await AsyncStorage.setItem(
      TELEMETRY_STORAGE_KEY,
      JSON.stringify([{ type: 'error', name: 'Fatal', ts: 1, props: { fatal: true } }, { junk: 1 }]),
    );
    track('error', 'Later', { source: 'global' });
    await flushTelemetry();
    expect(calls).toHaveLength(1);
    expect(bodyOf(calls[0]).events.map((e: { name: string }) => e.name)).toEqual(['Fatal', 'Later']);
  });

  test('persistTelemetry writes the queue so a crash survives the process', async () => {
    track('error', 'Crash', { source: 'global', fatal: true });
    await persistTelemetry();
    const stored = JSON.parse(String(await AsyncStorage.getItem(TELEMETRY_STORAGE_KEY)));
    expect(stored[0]).toMatchObject({ type: 'error', name: 'Crash' });
  });

  test(`flushes on its own at ${FLUSH_AT} events and sends at most ${MAX_BATCH} per call`, async () => {
    let release: (r: Response) => void = () => undefined;
    respond = () => new Promise<Response>((resolve) => {
      release = resolve;
    }); // hold the first call open
    for (let i = 0; i < FLUSH_AT - 1; i += 1) track('screen', `/s${i}`);
    await Promise.resolve();
    expect(calls).toHaveLength(0);
    track('screen', '/last');
    for (let i = 0; i < 20; i += 1) await Promise.resolve();
    expect(calls).toHaveLength(1);
    release(ok());
    await flushTelemetry();

    __resetTelemetryForTests();
    respond = ok;
    calls = [];
    for (let i = 0; i < MAX_BATCH + 10; i += 1) track('screen', `/p${i}`);
    await settle();
    expect(calls.map((c) => bodyOf(c).events.length)).toEqual(
      expect.arrayContaining([MAX_BATCH]),
    );
    expect(Math.max(...calls.map((c) => bodyOf(c).events.length))).toBeLessThanOrEqual(MAX_BATCH);
    expect(telemetryQueueLength()).toBe(0);
  });

  test(`never holds more than ${MAX_QUEUE} events; the oldest go first`, async () => {
    (globalThis as { fetch: unknown }).fetch = jest.fn(async () => {
      throw new TypeError('offline');
    });
    for (let i = 0; i < MAX_QUEUE + 25; i += 1) track('screen', `/n${i}`);
    await settle();
    expect(telemetryQueueLength()).toBe(MAX_QUEUE);
    const stored = JSON.parse(String(await AsyncStorage.getItem(TELEMETRY_STORAGE_KEY)));
    expect(stored[0].name).toBe('/n25');
  });

  test('track never throws', () => {
    expect(() => track('error', undefined as unknown as string, { a: undefined as unknown as string })).not.toThrow();
  });
});

describe('scrubbing', () => {
  test('scrubText removes emails, tokens, bearer values and digit runs', () => {
    const out = scrubText(
      'user somchai.k@eng.psu.ac.th staff 6512345 Bearer abc.def ExponentPushToken[xyz] '
        + 'eyJhbGciOiJIUzI1NiJ9abcdefghijklmnop',
    );
    expect(out).not.toMatch(/somchai|6512345|abc\.def|xyz|eyJhbG/);
    expect(out).toContain('<email>');
  });

  test('routeShape drops the query and shapes ids away', () => {
    expect(routeShape('/meeting-room/12345?staff=6512345')).toBe('/meeting-room/:id');
    expect(routeShape('/news/a@b.co')).toBe('/news/:email');
    expect(routeShape('')).toBe('/');
  });

  test('shortStack keeps the top frames and strips bundle URLs', () => {
    const stack = Array.from({ length: 20 }, (_, i) =>
      `at fn${i} (http://10.0.0.5:8081/index.bundle?platform=ios&dev=true:1:${i})`).join('\n');
    const out = shortStack(stack);
    expect(out.split('\n')).toHaveLength(8);
    expect(out).not.toContain('10.0.0.5');
    expect(out).toContain('index.bundle');
  });
});

describe('error capture', () => {
  test('reportError queues one scrubbed error event with the current route', async () => {
    setTelemetryRoute('/staff/6512345?x=1');
    const err = new TypeError('cannot read staff 6512345 of somchai@eng.psu.ac.th');
    reportError(err, { source: 'boundary' });
    reportError(err, { source: 'boundary' }); // duplicate within the window
    await flushTelemetry();
    const events = bodyOf(calls[0]).events;
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('error');
    expect(events[0].name).toBe('TypeError');
    expect(events[0].props).toMatchObject({ source: 'boundary', fatal: false, route: '/staff/:id' });
    expect(Object.keys(events[0].props).sort()).toEqual(
      expect.arrayContaining(['fatal', 'message', 'route', 'source']),
    );
    for (const key of Object.keys(events[0].props)) {
      expect(['source', 'fatal', 'message', 'stack', 'route']).toContain(key);
    }
    expect(JSON.stringify(events)).not.toMatch(/6512345|somchai/);
  });

  test('handles non-Error values', async () => {
    reportError('plain string', { source: 'promise' });
    reportError({ weird: true }, { source: 'other' });
    reportError(null, { source: 'other' });
    await flushTelemetry();
    const names = bodyOf(calls[0]).events.map((e: { name: string }) => e.name);
    expect(names).toEqual(['StringError', 'NonError', 'NonError']);
  });

  test('release builds hook the Hermes rejection tracker', async () => {
    const g = globalThis as { HermesInternal?: unknown; __DEV__?: boolean };
    const savedHermes = g.HermesInternal;
    const savedDev = g.__DEV__;
    let onUnhandled: ((id: number, rejection?: unknown) => void) | undefined;
    g.HermesInternal = {
      enablePromiseRejectionTracker: (opts: { onUnhandled: typeof onUnhandled }) => {
        onUnhandled = opts.onUnhandled;
      },
    };
    g.__DEV__ = false;
    try {
      installGlobalErrorHandlers();
      onUnhandled!(1, new SyntaxError('JSON Parse error'));
      await flushTelemetry();
      expect(bodyOf(calls[0]).events[0]).toMatchObject({
        type: 'error',
        name: 'SyntaxError',
        props: { source: 'promise', fatal: false },
      });
    } finally {
      g.HermesInternal = savedHermes;
      g.__DEV__ = savedDev;
    }
  });

  test('the global handler reports, persists a fatal and still calls the previous handler', async () => {
    const previous = jest.fn();
    let handler: ((e: unknown, fatal?: boolean) => void) | undefined;
    const g = globalThis as { ErrorUtils?: unknown };
    const saved = g.ErrorUtils;
    g.ErrorUtils = {
      getGlobalHandler: () => previous,
      setGlobalHandler: (h: typeof handler) => {
        handler = h;
      },
    };
    try {
      installGlobalErrorHandlers();
      installGlobalErrorHandlers(); // idempotent
      const err = new RangeError('bad');
      handler!(err, true);
      expect(previous).toHaveBeenCalledWith(err, true);
      await Promise.resolve();
      await persistTelemetry();
      const stored = JSON.parse(String(await AsyncStorage.getItem(TELEMETRY_STORAGE_KEY)));
      expect(stored[0]).toMatchObject({
        type: 'error',
        name: 'RangeError',
        props: { source: 'global', fatal: true },
      });
    } finally {
      g.ErrorUtils = saved;
    }
  });
});
