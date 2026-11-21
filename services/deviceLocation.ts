import * as Location from 'expo-location';

import { DEV_LOCATION } from '../constants/devConfig';
import { isDemoActive } from './demo/demoMode';
import { reportLocationFix, reportPermission, type LocationFixOutcome } from './usageTelemetry';

/**
 * The fence centre (staff.php/lecturer.php), reported in demo mode — App Review
 * is nowhere near the faculty, and the demo stamp is sample data anyway.
 */
const DEMO_POSITION: DevicePosition = { lat: 7.006754432048102, lon: 100.50110828545463, accuracyM: 12 };

/**
 * Where the phone says it is — for the anti-fraud checks on ลงเวลา.
 *
 * The rule this feeds is the server's: the upstream holds the faculty's centre
 * and its radius and decides `off_site`. Nothing here knows either number, and
 * nothing here decides anything — this module's whole job is to turn "the OS
 * would/wouldn't give us a fix" into an answer the screen can explain.
 *
 * That distinction is the point of `LocationOutcome`. A refusal to stamp is
 * useless unless it says what to *do*, and the four ways a fix can be missing
 * need four different instructions: grant the permission, grant it in Settings
 * because we may no longer ask, switch location services on, or just try again.
 * Collapsing them into "no location" is what makes a dead button infuriating.
 */

export type DevicePosition = {
  lat: number;
  lon: number;
  /** Radius of uncertainty in metres, as reported by the OS. */
  accuracyM: number;
};

export type LocationOutcome =
  /** A usable fix. */
  | 'ok'
  /** Permission refused. `canAskAgain` says whether a prompt is still possible. */
  | 'denied'
  /** Permission is fine, but location services are switched off device-wide. */
  | 'services_off'
  /** Asked properly and still got nothing: no fix in time, or an OS error. */
  | 'unavailable';

export type LocationReading = {
  outcome: LocationOutcome;
  position: DevicePosition | null;
  /**
   * Only meaningful when `outcome` is 'denied'. False means the OS will no
   * longer show the prompt and the only way back is the Settings app — which
   * is the difference between offering a "ลองอีกครั้ง" button and a
   * "เปิดการตั้งค่า" one.
   */
  canAskAgain: boolean;
};

/**
 * How long to wait for a fix before giving up.
 *
 * Indoors is the normal case here — the people stamping are inside faculty
 * buildings — so the first fix can be slow while the OS falls back from GPS to
 * WiFi and cell. Long enough not to fail someone standing in a corridor, short
 * enough that a screen never looks hung.
 */
const FIX_TIMEOUT_MS = 15000;

/**
 * A fix is only ever used while it is younger than this.
 *
 * The watcher below starts delivering within about a second, but on iOS the
 * first update is frequently the cached last-known location, handed over
 * through the same callback as a real one. Accepting it would be a
 * `getLastKnownPositionAsync` read by another door — a fix from wherever the
 * phone last was — so age, not the API used, is what keeps a fix honest.
 *
 * Age is never `Date.now()` minus the fix's `timestamp`. The two come from
 * different clocks: `Date.now()` is the phone's own, which the person can set
 * by hand, while Android usually stamps a GPS fix with satellite time. A phone
 * set a minute off would then see every fix as stale (and could never stamp),
 * or a stale one as fresh. Two checks that only ever subtract one clock from
 * itself stand in for it (see `isFresh`):
 *   - held: how long ago the fix *arrived*, on the phone's clock. A fix that
 *     was fine when it came in is no use to a tap ten seconds later.
 *   - delivery lag: arrival minus `timestamp`. Whatever the offset between the
 *     two clocks, it is the same for every fix, so live fixes share one lag and
 *     a cached fix shows up as lagging the freshest one by its real age.
 */
const MAX_FIX_AGE_MS = 5000;

/** A fix this tight answers a 200 m fence on its own; waiting for better buys nothing. */
const GOOD_FIX_M = 50;

/**
 * Above this the fix cannot answer the fence at all (the usual cause is
 * "Precise Location" being off, which fuzzes the position by kilometres).
 * Also the loosest fix `read()` will settle for before the full timeout.
 */
export const COARSE_FIX_M = 150;

/**
 * How long `read()` holds out for a `GOOD_FIX_M` fix before settling for a
 * `COARSE_FIX_M` one. Indoors the OS often never reaches 50 m, and the
 * fallback is what stops the person waiting out the whole timeout.
 */
const COARSE_AFTER_MS = 4500;

/** The last few fixes kept; the picker only ever wants the freshest, so this is a bound, not a history. */
const KEPT_FIXES = 20;

/** A fix as the picker sees it. */
export type FixCandidate = {
  lat: number;
  lon: number;
  /**
   * Radius of uncertainty in metres, `Infinity` when the OS did not give one
   * (iOS reports -1 for "invalid"). An unknown accuracy must not read as a
   * perfect one, so it can only ever be picked by the final timeout.
   */
  accuracyM: number;
  /** When the OS says the fix was taken, epoch ms — on the OS's clock (often GPS time on Android). */
  timestamp: number;
  /** When the fix reached the app, `Date.now()` — on the phone's clock. */
  receivedAt: number;
};

/**
 * Whether `fix` counts as the phone's position at `now`, judged against the
 * other fixes of the same watch (`fixes`). See `MAX_FIX_AGE_MS` for why no
 * check here compares the two clocks directly — except the one case below.
 *
 * A lone fix has nothing to be compared with, and it is exactly the iOS cached
 * one that tends to arrive alone and first. So until a second fix gives the
 * lag a baseline, the lone fix must also pass the plain two-clock check; on a
 * phone with a correct clock that is instant, on one set wrong it costs the
 * next update, about a second.
 */
function isFresh(fix: FixCandidate, fixes: readonly FixCandidate[], now: number): boolean {
  if (now - fix.receivedAt > MAX_FIX_AGE_MS) return false;

  const lag = fix.receivedAt - fix.timestamp;
  const baseline = Math.min(...fixes.map((f) => f.receivedAt - f.timestamp));
  if (lag - baseline > MAX_FIX_AGE_MS) return false;

  return fixes.length >= 2 || Math.abs(lag) <= MAX_FIX_AGE_MS;
}

export type FixSelection = {
  fix: FixCandidate | null;
  outcome: LocationFixOutcome;
};

/**
 * Which fix, if any, a read that began `elapsedMs` ago should settle on at
 * `now`. Pure, so the thresholds can be tested without a clock or a GPS.
 *
 * Returns null to keep waiting. Only fixes that pass `isFresh` are candidates;
 * of those the most accurate wins.
 *   - at once when one is within `GOOD_FIX_M`;
 *   - from `COARSE_AFTER_MS`, when the best is within `COARSE_FIX_M`;
 *   - at `FIX_TIMEOUT_MS`, the best there is — or none, which is `unavailable`.
 */
export function selectFix(
  fixes: readonly FixCandidate[],
  now: number,
  elapsedMs: number,
): FixSelection | null {
  let best: FixCandidate | null = null;
  for (const fix of fixes) {
    if (!isFresh(fix, fixes, now)) continue;
    if (!best || fix.accuracyM < best.accuracyM || (fix.accuracyM === best.accuracyM && fix.timestamp > best.timestamp)) {
      best = fix;
    }
  }

  if (best && best.accuracyM <= GOOD_FIX_M) return { fix: best, outcome: 'good' };
  if (best && elapsedMs >= COARSE_AFTER_MS && best.accuracyM <= COARSE_FIX_M) return { fix: best, outcome: 'coarse' };
  if (elapsedMs >= FIX_TIMEOUT_MS) return best ? { fix: best, outcome: 'best' } : { fix: null, outcome: 'none' };

  return null;
}

/**
 * Turn a raw OS fix into a candidate, or null when it is not a reading at all.
 * 0,0 is a real place in the Gulf of Guinea, so it cannot be forwarded as if it
 * were one; it is the shape a broken fix takes, not a location. A fix with no
 * usable timestamp cannot be shown to be fresh, so it is refused too.
 */
function toCandidate(fix: Location.LocationObject | null | undefined, receivedAt: number): FixCandidate | null {
  const lat = Number(fix?.coords?.latitude);
  const lon = Number(fix?.coords?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) return null;

  const timestamp = Number(fix?.timestamp);
  if (!Number.isFinite(timestamp)) return null;

  const accuracy = Number(fix?.coords?.accuracy);

  return { lat, lon, accuracyM: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : Infinity, timestamp, receivedAt };
}

function toReading(fix: FixCandidate): LocationReading {
  return {
    outcome: 'ok',
    position: { lat: fix.lat, lon: fix.lon, accuracyM: Number.isFinite(fix.accuracyM) ? fix.accuracyM : 0 },
    canAskAgain: true,
  };
}

function fail(outcome: LocationOutcome, canAskAgain = true): LocationReading {
  return { outcome, position: null, canAskAgain };
}

export type PositionWatch = {
  /**
   * Resolve with a position under the rules of `selectFix`, counting the wait
   * from this call. Instant when a fresh good fix is already in hand. Never
   * rejects; every failure is an outcome.
   */
  read(): Promise<LocationReading>;
  /**
   * The best fix that is fresh right now, or null when there is none (or the
   * watch is not in a state to give one). Never waits — this is what lets a
   * screen skip a pause when it already knows where the phone is.
   */
  latest(): LocationReading | null;
  /** Switch the GPS off. Safe to call twice, never throws; pending reads settle as `unavailable`. */
  stop(): void;
};

/**
 * Ask for permission if needed, then keep a watch on the position until
 * `stop()` — for a screen that will want the answer more than once.
 *
 * Why a watcher and not `getCurrentPositionAsync` per read: on iOS that call
 * maps to `requestLocation()`, which does not answer until the OS reaches the
 * requested accuracy or gives up (about 10 s). Indoors it often never reaches
 * 10 m, so every read cost the full wait. `watchPositionAsync` runs
 * `startUpdatingLocation()` instead, and its first fixes arrive in about a
 * second; `read()` then takes the first one that is good enough rather than the
 * first one that is perfect.
 *
 * What stays the same is the rule it serves: the stamp is answered by where the
 * phone is *now*. That is the freshness filter (`isFresh`), not the
 * absence of a cache — a fix older than that is dropped whichever API
 * delivered it.
 *
 * The caller owns the lifetime and must `stop()` on blur and when the app goes
 * to the background, so the GPS never stays on behind the user's back.
 *
 * A setup that ended in a refusal (denied, services off, error) is run again by
 * the next `read()`, so a "try again" button still re-asks the OS, as it did
 * when every read did.
 *
 * Never throws.
 */
export function startPositionWatch(): PositionWatch {
  let stopped = false;
  let settingUp = false;
  let subscription: Location.LocationSubscription | null = null;
  /** Set when setup ended without a watch: a refusal, or demo/dev standing in for one. */
  let terminal: LocationReading | null = null;
  let fixes: FixCandidate[] = [];
  /** Every read in flight, re-checked whenever something changes. */
  const pending = new Set<() => void>();
  const notify = () => [...pending].forEach((check) => check());

  const removeSubscription = () => {
    const current = subscription;
    subscription = null;
    try {
      current?.remove();
    } catch {
      // already gone — nothing left to switch off
    }
  };

  const onFix = (raw: Location.LocationObject) => {
    const fix = toCandidate(raw, Date.now());
    if (!fix) return;
    // The same fix handed over twice (the cached one can be) must not pose as
    // two fixes agreeing on a lag; only a newer reading counts.
    const last = fixes[fixes.length - 1];
    if (last && fix.timestamp <= last.timestamp) return;

    fixes = [...fixes, fix].slice(-KEPT_FIXES);
    notify();
  };

  const setup = async () => {
    settingUp = true;
    terminal = null;

    try {
      if (__DEV__ && DEV_LOCATION) {
        terminal = { outcome: 'ok', position: { ...DEV_LOCATION, accuracyM: 0 }, canAskAgain: true };
        return;
      }

      // Read the current grant before asking for it. On Android, requesting a
      // permission always starts the system's permission activity — even when
      // everything asked for is already granted and it closes again without
      // drawing anything — and that pauses and resumes the app. React Native
      // reports the pair as `background` then `active`, so a screen that reloads
      // on `active` and reloads by calling this function asks the OS a question
      // whose answer restarts the reload: it then reloads forever. Reading the
      // grant never leaves the app, so it cannot close that loop, and the prompt
      // is still raised the one time it is actually needed.
      const granted = await Location.getForegroundPermissionsAsync().catch(() => null);
      const permission = granted?.granted ? granted : await Location.requestForegroundPermissionsAsync();
      if (!granted?.granted) reportPermission('location', permission);

      if (permission.status !== 'granted') {
        terminal = fail('denied', permission.canAskAgain !== false);
        return;
      }

      // Asked for all the same, so the reviewer sees the real permission prompt.
      if (isDemoActive()) {
        terminal = { outcome: 'ok', position: DEMO_POSITION, canAskAgain: true };
        return;
      }

      // Checked separately from the permission, because on Android the two are
      // independent: permission can be granted while the device's location
      // switch is off, and the watch then fails with an error that reads like a
      // refusal but isn't one.
      const servicesOn = await Location.hasServicesEnabledAsync().catch(() => true);
      if (!servicesOn) {
        terminal = fail('services_off');
        return;
      }

      if (stopped) return;

      const next = await Location.watchPositionAsync(
        {
          // High, not Balanced: Balanced is accurate to roughly 100 m, which is
          // half the radius being tested — it would let somebody outside the
          // faculty land inside it by rounding.
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 0,
        },
        onFix,
      );

      // Stopped while the OS was setting the watch up: it must not outlive that.
      if (stopped) {
        try {
          next.remove();
        } catch {
          // ignore
        }
        return;
      }
      subscription = next;
    } catch {
      // An OS-level failure is still just "no fix" to everything above.
      terminal = fail('unavailable');
    } finally {
      settingUp = false;
      notify();
    }
  };

  void setup();

  const latest = (): LocationReading | null => {
    if (terminal) return terminal.outcome === 'ok' ? terminal : null;

    const selection = selectFix(fixes, Date.now(), 0);
    // elapsed 0 only passes a good fix; ask again as a timeout for the best fresh one.
    const best = selection?.fix ?? selectFix(fixes, Date.now(), FIX_TIMEOUT_MS)?.fix ?? null;

    return best ? toReading(best) : null;
  };

  return {
    read() {
      // A refusal is not final: the person may have granted the permission, or
      // switched location on, since — which is what a retry is for.
      if (!settingUp && !subscription && terminal && terminal.outcome !== 'ok' && !stopped) void setup();

      return new Promise<LocationReading>((resolve) => {
        const startedAt = Date.now();
        let settled = false;
        const timers: ReturnType<typeof setTimeout>[] = [];

        const finish = (reading: LocationReading, fix: FixCandidate | null, outcome: LocationFixOutcome | null) => {
          if (settled) return;
          settled = true;
          timers.forEach(clearTimeout);
          pending.delete(check);
          if (outcome) reportLocationFix(Date.now() - startedAt, fix && Number.isFinite(fix.accuracyM) ? fix.accuracyM : null, outcome);
          resolve(reading);
        };

        // `floorMs` is the timer's own nominal delay: a timer that fires a hair
        // early must still count as having waited that long.
        const check = (floorMs = 0) => {
          if (settled) return;
          if (stopped) return finish(fail('unavailable'), null, null);
          if (terminal) return finish(terminal, null, null);

          const elapsed = Math.max(Date.now() - startedAt, floorMs);
          const selection = selectFix(fixes, Date.now(), elapsed);
          if (!selection) return;

          finish(selection.fix ? toReading(selection.fix) : fail('unavailable'), selection.fix, selection.outcome);
        };

        pending.add(check);
        timers.push(setTimeout(() => check(COARSE_AFTER_MS), COARSE_AFTER_MS));
        timers.push(setTimeout(() => check(FIX_TIMEOUT_MS), FIX_TIMEOUT_MS));
        check();
      });
    },

    latest,

    stop() {
      stopped = true;
      removeSubscription();
      fixes = [];
      notify();
    },
  };
}

/**
 * Ask for permission if needed, then read a fresh fix once.
 *
 * A one-shot watcher — start, read, stop — so callers that only want one answer
 * get the same freshness rule and the same faster first fix as the stamp
 * screens, which hold a watcher of their own. See `startPositionWatch` for why.
 *
 * Never throws. Every failure is an outcome the caller can render.
 */
export async function readDevicePosition(): Promise<LocationReading> {
  const watch = startPositionWatch();

  try {
    return await watch.read();
  } catch {
    return fail('unavailable');
  } finally {
    watch.stop();
  }
}
