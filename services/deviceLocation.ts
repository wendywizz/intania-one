import * as Location from 'expo-location';

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

function timeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

function fail(outcome: LocationOutcome, canAskAgain = true): LocationReading {
  return { outcome, position: null, canAskAgain };
}

/**
 * Ask for permission if needed, then read a fresh fix.
 *
 * Deliberately not `getLastKnownPositionAsync`: a cached fix is a fix from
 * wherever the phone was last, which for an attendance check is precisely the
 * value somebody would want it to be. The stamp has to be answered by where
 * the phone is *now*, so the wait for a real one is the cost of the check.
 *
 * Never throws. Every failure is an outcome the caller can render.
 */
export async function readDevicePosition(): Promise<LocationReading> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      return fail('denied', permission.canAskAgain !== false);
    }

    // Checked separately from the permission, because on Android the two are
    // independent: permission can be granted while the device's location
    // switch is off, and `getCurrentPositionAsync` then fails with an error
    // that reads like a refusal but isn't one.
    const servicesOn = await Location.hasServicesEnabledAsync().catch(() => true);
    if (!servicesOn) return fail('services_off');

    const fix = await timeout(
      // High, not Balanced: Balanced is accurate to roughly 100 m, which is
      // half the radius being tested — it would let somebody outside the
      // faculty land inside it by rounding.
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      FIX_TIMEOUT_MS,
    );
    if (!fix) return fail('unavailable');

    const lat = Number(fix.coords?.latitude);
    const lon = Number(fix.coords?.longitude);
    // 0,0 is a real place in the Gulf of Guinea, so it cannot be forwarded as
    // if it were a reading; it is the shape a broken fix takes, not a location.
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) {
      return fail('unavailable');
    }

    return {
      outcome: 'ok',
      position: { lat, lon, accuracyM: Number(fix.coords?.accuracy) || 0 },
      canAskAgain: true,
    };
  } catch {
    // An OS-level failure is still just "no fix" to everything above.
    return fail('unavailable');
  }
}
