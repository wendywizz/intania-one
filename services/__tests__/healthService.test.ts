/**
 * The startup probe — the one question the connection gate asks before the app
 * may open.
 *
 * Tested at `probeScoobaService()`, the function the gate imports. The network
 * is stubbed at `fetch`, the only thing this module uses to reach it; the
 * health-body check and the retry loop are the real code under test.
 *
 * The case that matters is the second one: a request dropped once on a flaky
 * WiFi moment must not put up the "cannot connect" notice while the gateway is
 * fine (seen on PSU WiFi, 2026-10-07).
 */
import { probeScoobaService } from '@/services/healthService';

const HEALTHY = { data: { status: 'ok', service: 'scooba-service' } };

/** One fetch that reaches the gateway and gets its own health body back. */
function answersHealthy() {
  return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(HEALTHY)) });
}

/** One fetch that never gets an answer — what a dropped request looks like. */
function dropped() {
  return Promise.reject(new TypeError('Network request failed'));
}

const noWait = () => Promise.resolve();

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  (globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  // The probe logs each failed attempt outside production; expected here.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('probeScoobaService', () => {
  it('opens on the first answer without trying again', async () => {
    fetchMock.mockImplementationOnce(answersHealthy);

    await expect(probeScoobaService([1000, 2000], noWait)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('opens when only the first request was dropped', async () => {
    fetchMock.mockImplementationOnce(dropped).mockImplementationOnce(answersHealthy);

    await expect(probeScoobaService([1000, 2000], noWait)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports the gateway unreachable only after every attempt failed', async () => {
    fetchMock.mockImplementation(dropped);

    await expect(probeScoobaService([1000, 2000], noWait)).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('waits the given pauses between attempts, in order', async () => {
    fetchMock.mockImplementation(dropped);
    const waits: number[] = [];

    await probeScoobaService([1000, 2000], (ms) => {
      waits.push(ms);
      return Promise.resolve();
    });

    expect(waits).toEqual([1000, 2000]);
  });

  it('does not count a 200 with somebody else\'s body as the gateway', async () => {
    // A proxy that answers 200 with a placeholder page for any path.
    fetchMock.mockImplementation(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve('<html>ok</html>') }),
    );

    await expect(probeScoobaService([1000], noWait)).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
