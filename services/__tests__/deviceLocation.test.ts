/**
 * The position watch behind ลงเวลา.
 *
 * Two layers: `selectFix` is the pure rule (freshness, 50 m / 4.5 s / 15 s) and
 * is tested with plain numbers; `startPositionWatch` is the wrapper around
 * expo-location, tested with a mocked module and fake timers. What matters is
 * that a stale fix is never used, a good one is not waited on, and the GPS is
 * switched off when asked.
 */
import * as Location from 'expo-location';

import { COARSE_FIX_M, selectFix, startPositionWatch, readDevicePosition, type FixCandidate } from '@/services/deviceLocation';
import { reportLocationFix } from '@/services/usageTelemetry';

jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

jest.mock('@/services/usageTelemetry', () => ({
  reportLocationFix: jest.fn(),
  reportPermission: jest.fn(),
}));

jest.mock('@/services/demo/demoMode', () => ({ isDemoActive: jest.fn(() => false) }));
jest.mock('@/constants/devConfig', () => ({ DEV_LOCATION: null }));

const NOW = 1_700_000_000_000;

const cand = (accuracyM: number, ageMs = 0): FixCandidate => ({ lat: 7, lon: 100.5, accuracyM, timestamp: NOW - ageMs });

describe('selectFix', () => {
  it('waits when there is nothing yet', () => {
    expect(selectFix([], NOW, 0)).toBeNull();
  });

  it('ignores a fix older than 5 s', () => {
    expect(selectFix([cand(5, 5001)], NOW, 0)).toBeNull();
    expect(selectFix([cand(5, 5001)], NOW, 15000)).toEqual({ fix: null, outcome: 'none' });
  });

  it('takes a fix of 50 m or better at once', () => {
    expect(selectFix([cand(50)], NOW, 0)?.outcome).toBe('good');
  });

  it('keeps waiting on a 100 m fix before 4.5 s, then takes it', () => {
    expect(selectFix([cand(100)], NOW, 4499)).toBeNull();
    expect(selectFix([cand(100)], NOW, 4500)?.outcome).toBe('coarse');
  });

  it('never takes a fix looser than 150 m before the timeout', () => {
    expect(selectFix([cand(COARSE_FIX_M + 1)], NOW, 14999)).toBeNull();
    expect(selectFix([cand(COARSE_FIX_M + 1)], NOW, 15000)?.outcome).toBe('best');
  });

  it('prefers the most accurate fresh fix', () => {
    const picked = selectFix([cand(120), cand(80), cand(10, 6000)], NOW, 4500);
    expect(picked?.fix?.accuracyM).toBe(80);
  });

  it('never treats an unknown accuracy as a good one', () => {
    expect(selectFix([cand(Infinity)], NOW, 4500)).toBeNull();
  });
});

describe('startPositionWatch', () => {
  const remove = jest.fn();
  let emit: (fix: unknown) => void;

  const raw = (accuracy: number, ageMs = 0, lat = 7, lon = 100.5) => ({
    coords: { latitude: lat, longitude: lon, accuracy },
    timestamp: Date.now() - ageMs,
  });

  const flush = async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true, status: 'granted', canAskAgain: true });
    (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
    (Location.watchPositionAsync as jest.Mock).mockImplementation(async (_o, cb) => {
      emit = cb;
      return { remove };
    });
  });

  afterEach(() => jest.useRealTimers());

  it('ignores a stale first update (iOS cached location) and waits for a real one', async () => {
    const watch = startPositionWatch();
    await flush();
    const read = watch.read();
    emit(raw(5, 60_000));
    await flush();
    expect(watch.latest()).toBeNull();

    emit(raw(8));
    const reading = await read;
    expect(reading.outcome).toBe('ok');
    expect(reading.position?.accuracyM).toBe(8);
    watch.stop();
  });

  it('resolves immediately on a fix of 50 m or better', async () => {
    const watch = startPositionWatch();
    await flush();
    const read = watch.read();
    emit(raw(30));
    await expect(read).resolves.toMatchObject({ outcome: 'ok' });
    expect(reportLocationFix).toHaveBeenCalledWith(expect.any(Number), 30, 'good');
    watch.stop();
  });

  it('answers latest() without waiting once a fresh fix is held', async () => {
    const watch = startPositionWatch();
    await flush();
    emit(raw(20));
    expect(watch.latest()?.position?.accuracyM).toBe(20);

    jest.advanceTimersByTime(6000);
    expect(watch.latest()).toBeNull();
    watch.stop();
  });

  it('falls back to a 100 m fix at 4.5 s', async () => {
    const watch = startPositionWatch();
    await flush();
    const read = watch.read();
    emit(raw(100));
    let done = false;
    void read.then(() => (done = true));

    jest.advanceTimersByTime(4000);
    await flush();
    expect(done).toBe(false);

    emit(raw(100));
    jest.advanceTimersByTime(500);
    await expect(read).resolves.toMatchObject({ outcome: 'ok', position: { accuracyM: 100 } });
    expect(reportLocationFix).toHaveBeenCalledWith(expect.any(Number), 100, 'coarse');
    watch.stop();
  });

  it('gives unavailable at 15 s with no fix', async () => {
    const watch = startPositionWatch();
    await flush();
    const read = watch.read();
    jest.advanceTimersByTime(15000);
    await expect(read).resolves.toMatchObject({ outcome: 'unavailable', position: null });
    watch.stop();
  });

  it('gives the best fix at 15 s when it is looser than 150 m', async () => {
    const watch = startPositionWatch();
    await flush();
    const read = watch.read();
    // Emitted late enough to still be fresh when the timeout comes.
    jest.advanceTimersByTime(12000);
    emit(raw(900));
    jest.advanceTimersByTime(3000);
    await expect(read).resolves.toMatchObject({ outcome: 'ok', position: { accuracyM: 900 } });
    watch.stop();
  });

  it('rejects a 0,0 fix', async () => {
    const watch = startPositionWatch();
    await flush();
    const read = watch.read();
    emit(raw(5, 0, 0, 0));
    expect(watch.latest()).toBeNull();
    jest.advanceTimersByTime(15000);
    await expect(read).resolves.toMatchObject({ outcome: 'unavailable' });
    watch.stop();
  });

  it('stop() removes the subscription, twice without throwing, and settles pending reads', async () => {
    const watch = startPositionWatch();
    await flush();
    const read = watch.read();
    watch.stop();
    watch.stop();
    expect(remove).toHaveBeenCalledTimes(1);
    await expect(read).resolves.toMatchObject({ outcome: 'unavailable' });
  });

  it('removes a watch that finished starting after stop()', async () => {
    const watch = startPositionWatch();
    watch.stop();
    await flush();
    expect(Location.watchPositionAsync).not.toHaveBeenCalled();
  });

  it('reports denied with canAskAgain and never starts a watch', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, status: 'denied', canAskAgain: false });
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, status: 'denied', canAskAgain: false });
    const watch = startPositionWatch();
    await flush();
    await expect(watch.read()).resolves.toMatchObject({ outcome: 'denied', canAskAgain: false });
    expect(Location.watchPositionAsync).not.toHaveBeenCalled();
    watch.stop();
  });

  it('reports services_off', async () => {
    (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(false);
    const watch = startPositionWatch();
    await flush();
    await expect(watch.read()).resolves.toMatchObject({ outcome: 'services_off' });
    watch.stop();
  });

  it('never throws when the OS fails', async () => {
    (Location.watchPositionAsync as jest.Mock).mockRejectedValue(new Error('boom'));
    const watch = startPositionWatch();
    await flush();
    await expect(watch.read()).resolves.toMatchObject({ outcome: 'unavailable' });
    watch.stop();
  });

  it('readDevicePosition is a one-shot watch that is switched off afterwards', async () => {
    const pending = readDevicePosition();
    await flush();
    emit(raw(10));
    await expect(pending).resolves.toMatchObject({ outcome: 'ok' });
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
