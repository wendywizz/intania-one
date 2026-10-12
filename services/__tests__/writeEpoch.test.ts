/**
 * The write counter the home screen uses to decide whether a quick return may
 * keep what it already shows.
 *
 * Tested through `fetchWithTimeout` and `fetchApi`, the two doors every request
 * leaves by. Reads must not move the counter - they are the very thing being
 * skipped - and a write must, whether it succeeds or fails: a POST that timed
 * out may still have been applied.
 */
import { fetchApi, fetchWithTimeout, getWriteEpoch } from '@/services/api';

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn().mockResolvedValue({ ok: true });
  (globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getWriteEpoch', () => {
  it('stays put for reads', async () => {
    const before = getWriteEpoch();

    await fetchWithTimeout('https://example.test/a');
    await fetchWithTimeout('https://example.test/a', { method: 'GET' });
    await fetchApi('https://example.test/b', { method: 'HEAD' });

    expect(getWriteEpoch()).toBe(before);
  });

  it('moves once for each finished write', async () => {
    const before = getWriteEpoch();

    await fetchWithTimeout('https://example.test/a', { method: 'POST', body: '{}' });
    await fetchApi('https://example.test/b', { method: 'delete' });

    expect(getWriteEpoch()).toBe(before + 2);
  });

  it('moves even when the write failed', async () => {
    fetchMock.mockRejectedValue(new Error('Network request failed'));
    const before = getWriteEpoch();

    await expect(fetchWithTimeout('https://example.test/a', { method: 'PUT' })).rejects.toThrow();

    expect(getWriteEpoch()).toBe(before + 1);
  });
});
