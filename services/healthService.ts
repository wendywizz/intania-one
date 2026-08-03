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

type HealthResponse = {
  data?: { status?: string; service?: string };
};

/**
 * Asks scooba-service whether it is there. Resolves `true` only when the
 * gateway itself answers with its own health payload — anything else (no
 * network, DNS failure, refused connection, timeout, 5xx) is `false`.
 *
 * A 200 is deliberately not enough. `saas.eng.psu.ac.th` sits behind a proxy
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
