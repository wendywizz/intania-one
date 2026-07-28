import AsyncStorage from "@react-native-async-storage/async-storage";
import type * as ExpoLocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

import { TEXT } from "@/constants/text";

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
  /**
   * The raw code plus any native message, for showing in development builds.
   * Without it an unmapped failure is indistinguishable from every other one.
   */
  detail?: string;
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
    // No native module at all: this is the web bundle, or a build without the
    // library linked in.
    return { success: false, error: 'not_available', detail: 'no native module' };
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
    // The code tells apart "the user failed a scan" from "the OS refused to
    // show the prompt at all" — the two look identical on screen.
    const detail = [result.error, (result as { warning?: string }).warning]
      .filter(Boolean)
      .join(' · ');
    if (__DEV__) {
      console.warn(
        `[biometrics] attempt failed: ${detail} (allowDeviceFallback=${allowDeviceFallback})`,
      );
    }
    return { success: false, error: result.error, detail };
  } catch (err) {
    // evaluatePolicy threw rather than returning a result. On iOS that is what a
    // missing NSFaceIDUsageDescription does; on Android, a missing USE_BIOMETRIC.
    if (__DEV__) console.warn('[biometrics] authenticateAsync threw', err);
    return {
      success: false,
      error: 'unknown',
      detail: `threw: ${err instanceof Error ? err.message : String(err)}`,
    };
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
 * Why a scan did not go through, in words the user can act on.
 *
 * 'not_available' is the one worth spelling out: it usually means the installed
 * build predates the expo-local-authentication config (no NSFaceIDUsageDescription
 * on iOS, no USE_BIOMETRIC permission on Android), so the OS never offers the
 * prompt at all. "Try again" is useless advice for that — only a new build helps.
 */
export function describeAuthError(error?: string) {
  switch (error) {
    case 'authentication_failed':
      return TEXT.BIOMETRIC_ERROR_REJECTED;
    case 'lockout':
    case 'lockout_permanent':
      return TEXT.BIOMETRIC_ERROR_LOCKOUT;
    case 'not_enrolled':
      return TEXT.BIOMETRIC_ERROR_NOT_ENROLLED;
    case 'passcode_not_set':
      return TEXT.BIOMETRIC_ERROR_PASSCODE_NOT_SET;
    // All three mean the installed binary cannot show the prompt, whatever the
    // JS config says — 'missing_usage_description' is iOS reporting no
    // NSFaceIDUsageDescription, and 'unknown' is our own code for evaluatePolicy
    // throwing. None of them is anything the user did wrong, and none is fixed
    // by trying again.
    case 'missing_usage_description':
    case 'not_available':
    case 'unknown':
      return TEXT.BIOMETRIC_ERROR_NOT_AVAILABLE;
    default:
      return TEXT.BIOMETRIC_ENABLE_FAILED_MESSAGE;
  }
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
    // iOS: the binary has no NSFaceIDUsageDescription, so the prompt can never
    // appear. Counting this as a failed scan would spend the user's attempts on
    // a prompt they were never shown.
    error === 'missing_usage_description' ||
    error === 'not_enrolled' ||
    error === 'no_space' ||
    error === 'unknown'
  );
}

export type LockPlan = {
  /** The lock screen should go up at all. */
  locked: boolean;
  /** A face/finger scan can open this lock. */
  biometrics: boolean;
  /** The app passcode can open this lock — the fallback when a scan fails. */
  password: boolean;
};

/**
 * Whether the app should put its lock screen up, and what can open it.
 *
 * Either credential is enough on its own: switching on biometrics locks the app,
 * and so does switching on the passcode. Requiring both was the bug behind
 * "I turned it on and nothing happens".
 *
 * `password` is reported separately because it is what the gate falls back to
 * when scanning fails. Without it there is nothing to fall back to, and the gate
 * has to reopen the OS prompt with the device passcode allowed rather than
 * stranding the user on a scanner that will not read them.
 */
export async function getLockPlan(): Promise<LockPlan> {
  const [biometricEnabled, password] = await Promise.all([
    getBiometricEnabled(),
    canUnlockWithPassword(),
  ]);

  // Enrolment can be removed in the OS after the switch was turned on, so the
  // stored preference alone is never taken as proof a scan is possible.
  const biometrics = biometricEnabled ? (await getBiometricSupport()).usable : false;

  return { locked: biometrics || password, biometrics, password };
}
