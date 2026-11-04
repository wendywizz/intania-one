/**
 * T11: failed requests on our own API become one whitelisted `network` event
 * (class + shaped path, never a body or another host's URL); the connection
 * gate and first screen become `startup` / `perf` events.
 */
jest.mock('@/services/telemetryService', () => {
  const actual = jest.requireActual('@/services/telemetryService');
  return { ...actual, track: jest.fn() };
});
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
}));

import * as Network from 'expo-network';

import { API_BASE_URL } from '@/constants/endpoints';
import { requestJson } from '@/services/api';
import {
  __resetNetworkTelemetryForTests,
  apiPath,
  classifyFailure,
  isReportable,
  reportFirstScreen,
  reportGate,
  reportNetworkFailure,
  startNetworkTelemetry,
} from '@/services/networkTelemetry';
import { track } from '@/services/telemetryService';

const trackMock = track as jest.Mock;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  trackMock.mockClear();
  __resetNetworkTelemetryForTests();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('classifyFailure', () => {
  it('our own abort is a timeout', () => {
    expect(classifyFailure(new Error('Aborted'), true)).toBe('timeout');
  });
  it('no network on the phone is offline', () => {
    expect(classifyFailure(new TypeError('Network request failed'), false, false)).toBe('offline');
  });
  it('reads platform wording', () => {
    expect(classifyFailure(new Error('Unable to resolve host "create.eng.psu.ac.th"'), false, true)).toBe('dns');
    expect(classifyFailure(new Error('java.security.cert.CertPathValidatorException: Trust anchor'), false, true)).toBe('tls');
    expect(classifyFailure(new Error('The Internet connection appears to be offline.'), false, true)).toBe('offline');
    expect(classifyFailure(new TypeError('Network request failed'), false, true)).toBe('other');
  });
});

describe('path shaping', () => {
  it('reports our API only, never the telemetry call', () => {
    expect(isReportable(`${API_BASE_URL}/api/leave`)).toBe(true);
    expect(isReportable('https://graph.microsoft.com/v1.0/me')).toBe(false);
    expect(isReportable(`${API_BASE_URL}/api/telemetry/events`)).toBe(false);
  });
  it('drops the query and shapes ids', () => {
    expect(apiPath(`${API_BASE_URL}/api/leave/1234567?staff_id=0123456`)).toBe('/api/leave/:id');
  });
});

describe('reportNetworkFailure', () => {
  it('queues one network event with whitelisted props only', async () => {
    await reportNetworkFailure({
      url: `${API_BASE_URL}/api/meeting/998877?staff_id=0123456`,
      method: 'get',
      error: new Error('timeout'),
      aborted: true,
      startedAt: Date.now() - 50,
      attempt: 2,
      requestId: 'abc123',
    });
    expect(trackMock).toHaveBeenCalledTimes(1);
    const [type, name, props] = trackMock.mock.calls[0];
    expect([type, name]).toEqual(['network', 'timeout']);
    expect(Object.keys(props).sort()).toEqual(['attempt', 'duration_ms', 'method', 'path', 'request_id', 'status'].sort());
    expect(props.path).toBe('/api/meeting/:id');
    expect(props.method).toBe('GET');
    expect(JSON.stringify(props)).not.toContain('0123456');
  });
  it('ignores 4xx responses and other hosts', async () => {
    await reportNetworkFailure({ url: `${API_BASE_URL}/api/x`, method: 'GET', status: 404, startedAt: Date.now(), attempt: 1 });
    await reportNetworkFailure({ url: 'https://news.example/x', method: 'GET', status: 500, startedAt: Date.now(), attempt: 1 });
    expect(trackMock).not.toHaveBeenCalled();
  });
  it('uses the network state when the error says nothing', async () => {
    (Network.getNetworkStateAsync as jest.Mock).mockResolvedValueOnce({ isConnected: false });
    await reportNetworkFailure({ url: `${API_BASE_URL}/api/x`, method: 'GET', error: new TypeError('Network request failed'), startedAt: Date.now(), attempt: 1 });
    expect(trackMock.mock.calls[0][1]).toBe('offline');
  });
});

describe('wired into api.ts', () => {
  let fetchMock: jest.Mock;
  beforeEach(() => {
    startNetworkTelemetry();
    fetchMock = jest.fn();
    (globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  });

  it('a 502 from a proxy is http_5xx', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, text: () => Promise.resolve('<html>'), headers: { get: () => null } });
    await expect(requestJson(`${API_BASE_URL}/api/leave`)).rejects.toThrow();
    await flush();
    expect(trackMock.mock.calls.map((c) => c[1])).toEqual(['http_5xx']);
  });

  it('a switched-off module (503 ModuleDisabled) is not a failure', async () => {
    const body = JSON.stringify({ error: { name: 'ModuleDisabled', message: 'off' } });
    fetchMock.mockResolvedValue({ ok: false, status: 503, text: () => Promise.resolve(body), headers: { get: () => null } });
    await expect(requestJson(`${API_BASE_URL}/api/leave`)).rejects.toThrow();
    await flush();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it('a 200 body that is not JSON is parse', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('<html>'), headers: { get: () => 'rid-1' } });
    await expect(requestJson(`${API_BASE_URL}/api/leave`)).rejects.toThrow();
    await flush();
    expect(trackMock.mock.calls[0][1]).toBe('parse');
    expect(trackMock.mock.calls[0][2].request_id).toBe('rid-1');
  });

  it('a dropped GET is reported per attempt', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    await expect(requestJson(`${API_BASE_URL}/api/leave`)).rejects.toThrow();
    await flush();
    expect(trackMock.mock.calls.map((c) => [c[1], c[2].attempt])).toEqual([['other', 1], ['other', 2]]);
  });
});

describe('startup', () => {
  it('gate failure carries a reason; first pass also sends cold start once', () => {
    reportGate(false, 3000, 'dns');
    reportGate(true, 400);
    reportGate(true, 400);
    expect(trackMock.mock.calls.map((c) => [c[0], c[1]])).toEqual([
      ['startup', 'gate_failed'],
      ['startup', 'gate_passed'],
      ['perf', 'cold_start'],
      ['startup', 'gate_passed'],
    ]);
    expect(trackMock.mock.calls[0][2]).toEqual({ reason: 'dns', duration_ms: 3000 });
  });

  it('first screen once per launch, route shaped', () => {
    reportFirstScreen('/meeting/123456');
    reportFirstScreen('/home');
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock.mock.calls[0][2].route).toBe('/meeting/:id');
  });
});
