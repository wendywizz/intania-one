import { ENDPOINTS } from '@/constants/endpoints';

/**
 * How long the startup probe waits before calling scooba-service unreachable.
 * Deliberately shorter than the 10s the data requests use: this one runs before
 * anything is on screen, so a long wait reads as the app failing to launch. Six
 * seconds is past the worst mobile-network round trip while still being a wait
 * a person will sit through.
 */
const PING_TIMEOUT_MS = 6000;

/** What `/api/health` names itself as. See scooba-service's health controller. */
const HEALTH_SERVICE_NAME = 'scooba-service';

/**
 * Pauses before the second and third attempt of `probeScoobaService`.
 *
 * One probe was not enough. On PSU WiFi (802.1x) a phone that has just joined,
 * or just roamed to another access point, can drop the first request of a
 * launch while the network itself is fine — on 2026-10-07 an Android 10 phone
 * showed the "cannot connect" notice on PSU WiFi, then opened normally on four
 * cold launches in a row on the same network, same gateway, same build. A
 * failure that clears in a second or two should not cost the person the app.
 * A network that is really gone fails fast (no timeout), so the extra attempts
 * add only these pauses — about three seconds — before the notice.
 */
const PROBE_RETRY_GAPS_MS = [1000, 2000] as const;

type HealthResponse = {
  data?: { status?: string; service?: string };
};

/**
 * Asks scooba-service whether it is there. Resolves `true` only when the
 * gateway itself answers with its own health payload — anything else (no
 * network, DNS failure, refused connection, timeout, 5xx) is `false`.
 *
 * A 200 is deliberately not enough. Some production hosts sit behind a proxy
 * that answers 200 with a placeholder body for paths it does not know, so
 * status-only checking would report the gateway up while it is down. Reading
 * the body is what tells the two apart.
 *
 * Never throws: the caller is a gate that has to make a yes/no decision, and an
 * exception escaping here would leave the app stuck on its cover.
 */
export async function pingScoobaService(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

  try {
    const response = await fetch(ENDPOINTS.health, {
      method: 'GET',
      // A cached 200 would say the gateway is up when it is not — the whole
      // point of the probe is what is true right now.
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) return false;

    const json = JSON.parse(await response.text()) as HealthResponse;
    return json.data?.status === 'ok' && json.data?.service === HEALTH_SERVICE_NAME;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[health] scooba-service unreachable', ENDPOINTS.health, error);
    }
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * `pingScoobaService`, tried again after each pause in `gapsMs` until one
 * attempt succeeds. Resolves `false` only when every attempt failed. This is
 * what the startup gate asks — see PROBE_RETRY_GAPS_MS for why once is not
 * enough. Never throws, like the single ping.
 *
 * `wait` is a parameter so tests can skip the real pauses.
 */
export async function probeScoobaService(
  gapsMs: readonly number[] = PROBE_RETRY_GAPS_MS,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<boolean> {
  if (await pingScoobaService()) return true;

  for (const gap of gapsMs) {
    await wait(gap);
    if (await pingScoobaService()) return true;
  }

  return false;
}
