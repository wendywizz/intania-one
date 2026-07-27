import AsyncStorage from "@react-native-async-storage/async-storage";
import type * as ExpoLocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

import { canUnlockWithPassword } from "./appPasswordService";

const BIOMETRIC_ENABLED_STORAGE_KEY = "BIOMETRIC_LOGIN_ENABLED";

export type BiometricSupport = {
  /** The device has biometric hardware AND the user has enrolled a face/finger. */
  usable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  /** Human label for what this device offers, e.g. "Face ID" or "ลายนิ้วมือ". */
  label: string;
};

const UNSUPPORTED: BiometricSupport = {
  usable: false,
  hasHardware: false,
  isEnrolled: false,
  label: "",
};

// expo-local-authentication is a native module with no web implementation, so
// it is imported lazily and only off the web — the same guard notificationService
// uses. Every export below degrades to "unsupported" rather than throwing.
async function loadLocalAuthentication() {
  if (Platform.OS === "web") {
    return null;
  }

  return import("expo-local-authentication") as Promise<typeof ExpoLocalAuthentication>;
}

function describeTypes(
  LocalAuthentication: typeof ExpoLocalAuthentication,
  types: ExpoLocalAuthentication.AuthenticationType[],
) {
  const { AuthenticationType } = LocalAuthentication;

  if (types.includes(AuthenticationType.FACIAL_RECOGNITION)) {
    return Platform.OS === "ios" ? "Face ID" : "สแกนใบหน้า";
  }
  if (types.includes(AuthenticationType.FINGERPRINT)) {
    return Platform.OS === "ios" ? "Touch ID" : "ลายนิ้วมือ";
  }
  if (types.includes(AuthenticationType.IRIS)) {
    return "สแกนม่านตา";
  }
  return "";
}

export async function getBiometricSupport(): Promise<BiometricSupport> {
  const LocalAuthentication = await loadLocalAuthentication();
  if (!LocalAuthentication) {
    return UNSUPPORTED;
  }

  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    return {
      usable: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
      label: describeTypes(LocalAuthentication, types),
    };
  } catch {
    return UNSUPPORTED;
  }
}

export async function getBiometricEnabled() {
  try {
    return (await AsyncStorage.getItem(BIOMETRIC_ENABLED_STORAGE_KEY)) === "true";
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(enabled: boolean) {
  try {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // A failed write only means the preference is not remembered next launch.
  }
}

export type BiometricAttempt = {
  success: boolean;
  /**
   * expo-local-authentication's failure code — 'user_cancel', 'authentication_failed',
   * 'lockout', etc. Callers use it to tell a deliberate dismissal apart from a
   * scan that genuinely did not work.
   */
  error?: string;
};

/**
 * Prompt for a face/fingerprint scan.
 *
 * Biometrics only by default: with the device passcode allowed, Android's prompt
 * offers a PIN up front and iOS falls back to one, which turns "unlock with your
 * face" into "type your passcode". Pass `allowDeviceFallback` once scanning has
 * actually failed, so the passcode stays a recovery path rather than the opener.
 */
export async function authenticateWithBiometrics(
  promptMessage: string,
  cancelLabel: string,
  { allowDeviceFallback = false }: { allowDeviceFallback?: boolean } = {},
): Promise<BiometricAttempt> {
  const LocalAuthentication = await loadLocalAuthentication();
  if (!LocalAuthentication) {
    return { success: false, error: 'not_available' };
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel,
      disableDeviceFallback: !allowDeviceFallback,
    });
    if (result.success) {
      return { success: true };
    }
    if (__DEV__) {
      // The code tells apart "the user failed a scan" from "the OS refused to
      // show the prompt at all" — the two look identical on screen.
      console.warn(
        `[biometrics] attempt failed: ${result.error} (allowDeviceFallback=${allowDeviceFallback})`,
      );
    }
    return { success: false, error: result.error };
  } catch (err) {
    if (__DEV__) console.warn('[biometrics] authenticateAsync threw', err);
    return { success: false, error: 'unknown' };
  }
}

/** Failure codes meaning the user dismissed the prompt rather than failing a scan. */
export function isCancelledAttempt(error?: string) {
  return error === 'user_cancel' || error === 'system_cancel' || error === 'app_cancel';
}

/**
 * A scan that ran and was rejected — the only failure that should count against
 * the user's attempts. Everything else means the prompt never really happened.
 */
export function isRejectedScan(error?: string) {
  return error === 'authentication_failed';
}

/**
 * Biometrics cannot be used right now — locked out after too many bad scans, or
 * the OS refused the prompt outright. Either way the passcode has to be opened
 * up, or there is no way back into the app.
 */
export function isBiometricUnusable(error?: string) {
  return (
    error === 'lockout' ||
    error === 'lockout_permanent' ||
    error === 'not_available' ||
    error === 'not_enrolled' ||
    error === 'no_space' ||
    error === 'unknown'
  );
}

/**
 * Whether the app should put its lock screen up.
 *
 * Every part of the setup has to be in place: biometrics switched on and still
 * honoured by the device, *and* an app password switched on and actually set.
 * The password is the only way past a scan that will not work, so locking
 * without one would leave the device passcode as the sole way back in — the one
 * credential this lock is meant never to ask for.
 */
export async function shouldLockApp() {
  const enabled = await getBiometricEnabled();
  if (!enabled) {
    return false;
  }

  // A password the user can actually fall back on.
  if (!(await canUnlockWithPassword())) {
    return false;
  }

  const support = await getBiometricSupport();
  return support.usable;
}
