/**
 * T12: screen views, push opens, deep links, declined permissions and OTA
 * status become whitelisted events with shaped routes and nothing personal.
 */
jest.mock('@/services/telemetryService', () => {
  const actual = jest.requireActual('@/services/telemetryService');
  return { ...actual, track: jest.fn() };
});

import { track } from '@/services/telemetryService';
import {
  __resetUsageTelemetryForTests,
  flushScreen,
  linkPath,
  reportDeepLink,
  reportOta,
  reportPermission,
  reportPushOpen,
  reportScreen,
} from '@/services/usageTelemetry';

const trackMock = track as jest.Mock;

beforeEach(() => {
  trackMock.mockClear();
  __resetUsageTelemetryForTests();
});

describe('reportScreen', () => {
  it('reports the screen left, with its time on screen and ids shaped away', () => {
    reportScreen('/meeting/123', 1000);
    expect(trackMock).not.toHaveBeenCalled();
    reportScreen('/home', 4000);
    expect(trackMock).toHaveBeenCalledWith('screen', '/meeting/:id', { duration_ms: 3000 });
  });

  it('does not count a param change on the same route as a new view', () => {
    reportScreen('/meeting/101', 0);
    reportScreen('/meeting/202', 10);
    expect(trackMock).not.toHaveBeenCalled();
  });

  it('closes the open view on flush and starts afresh on return', () => {
    reportScreen('/home', 0);
    flushScreen(500);
    expect(trackMock).toHaveBeenCalledWith('screen', '/home', { duration_ms: 500 });
    trackMock.mockClear();
    reportScreen('/home', 9000);
    reportScreen('/settings', 9100);
    expect(trackMock).toHaveBeenCalledWith('screen', '/home', { duration_ms: 100 });
  });
});

describe('reportPushOpen', () => {
  it('sends only the category and shaped route, never title/body/data', () => {
    reportPushOpen({ type: 'absence', url: '/absence/555', secret: 'x' }, '/absence/555');
    expect(trackMock).toHaveBeenCalledWith('push_open', 'absence', { route: '/absence/:id' });
  });

  it('falls back to "other" for a missing or odd category', () => {
    reportPushOpen(undefined, null);
    reportPushOpen({ type: 'สวัสดี นาย ก' }, null);
    expect(trackMock.mock.calls.map((c) => c[1])).toEqual(['other', 'other']);
  });
});

describe('deep links', () => {
  it('drops scheme, host and query', () => {
    expect(linkPath('th.ac.psu.eng.scooba://meeting/123?token=abc')).toBe('/meeting/:id');
    expect(linkPath('https://create.eng.psu.ac.th/scooba/leave/999#x')).toBe('/scooba/leave/:id');
    expect(linkPath('not a url')).toBeNull();
  });

  it('ignores dev-client and bare-root links', () => {
    reportDeepLink('exp://192.168.1.2:8081');
    reportDeepLink('th.ac.psu.eng.scooba://expo-development-client/?url=x');
    reportDeepLink('th.ac.psu.eng.scooba://');
    reportDeepLink(null);
    expect(trackMock).not.toHaveBeenCalled();
    reportDeepLink('th.ac.psu.eng.scooba://notification');
    expect(trackMock).toHaveBeenCalledWith('deep_link', '/notification');
  });
});

describe('reportPermission', () => {
  it('reports declines only', () => {
    reportPermission('camera', { granted: true, status: 'granted' });
    expect(trackMock).not.toHaveBeenCalled();
    reportPermission('camera', { granted: false, status: 'denied', canAskAgain: true });
    reportPermission('location', { granted: false, status: 'denied', canAskAgain: false });
    expect(trackMock.mock.calls).toEqual([
      ['permission', 'camera', { status: 'denied' }],
      ['permission', 'location', { status: 'blocked' }],
    ]);
  });
});

describe('reportOta', () => {
  it('sends stage, update id and a capped message', () => {
    reportOta('error', { update_id: 'abc', message: 'x'.repeat(500) });
    const [type, name, props] = trackMock.mock.calls[0];
    expect([type, name, props.update_id, props.message.length]).toEqual(['ota', 'error', 'abc', 200]);
  });

  it('never throws even if track does', () => {
    trackMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    expect(() => reportOta('check')).not.toThrow();
  });
});
