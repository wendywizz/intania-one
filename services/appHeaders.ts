/**
 * The headers every request to scooba-service carries so scooba-insight can
 * tell which app build, platform and install a request (or a failure) came
 * from — ticket T9, disclosed in store-assets/PRIVACY_POLICY_DRAFT.md §1.8.
 *
 * What is sent (and nothing else):
 * - `X-Request-Id`   random per request, echoed back for "reference code" reports
 * - `X-Staff-Id`     the signed-in staff id (already sent in queries/bodies today)
 * - `X-Install-Id`   random id made on first launch (the `device_id` deviceService
 *                    registers), kept in AsyncStorage; it is
 *                    not an advertising id or a vendor/hardware id and changes on reinstall
 * - `X-App-Version`  `<version>+<build>` of the native binary
 * - `X-Update-Id`    the running OTA update id, or `embedded`
 * - `X-Platform`     `ios` / `android` / `web`
 * - `X-OS-Version`   OS version string
 *
 * Never the user-set device name (`Constants.deviceName`), name, email,
 * location or any token. Values are ASCII-only and capped at 64 chars.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Native modules are loaded lazily and guarded: request headers must never be
// the reason a request (or the app) fails, e.g. in a build or test missing one.
function optionalModule<T>(load: () => T): T | null {
  try {
    return load();
  } catch {
    return null;
  }
}
const crypto = () => optionalModule(() => require('expo-crypto') as typeof import('expo-crypto'));
const device = () => optionalModule(() => require('expo-device') as typeof import('expo-device'));
const updates = () => optionalModule(() => require('expo-updates') as typeof import('expo-updates'));

// Same id deviceService registers as `device_id` (brief §4: telemetry device_id ==
// device registry id). Shared here so both never race to create two different ids.
export const INSTALL_ID_STORAGE_KEY = 'PUSH_DEVICE_ID';
const MAX_HEADER_LENGTH = 64;

let installId: string | null = null;
let installIdLoading: Promise<string> | null = null;
let staffId: string | null = null;

function headerValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[^\x20-\x7e]/g, '')
    .trim()
    .slice(0, MAX_HEADER_LENGTH);
}

function randomId(): string {
  try {
    const id = crypto()?.randomUUID();
    if (id) return id;
    throw new Error('no expo-crypto');
  } catch {
    const part = () => Math.random().toString(16).slice(2, 10).padEnd(8, '0');
    return `${part()}-${part().slice(0, 4)}-4${part().slice(0, 3)}-a${part().slice(0, 3)}-${part()}${part().slice(0, 4)}`;
  }
}

/**
 * Loads (or creates once) the install id. Called at startup; until it resolves
 * requests simply go without `X-Install-Id`.
 */
export function loadInstallId(): Promise<string> {
  if (installId) return Promise.resolve(installId);
  if (!installIdLoading) {
    installIdLoading = (async () => {
      let stored: string | null = null;
      try {
        stored = await AsyncStorage.getItem(INSTALL_ID_STORAGE_KEY);
      } catch {
        stored = null;
      }
      const id = headerValue(stored) || randomId();
      if (id !== stored) {
        await AsyncStorage.setItem(INSTALL_ID_STORAGE_KEY, id).catch(() => undefined);
      }
      installId = id;
      return id;
    })().finally(() => {
      installIdLoading = null;
    });
  }
  return installIdLoading;
}

export function getInstallId(): string | null {
  return installId;
}

/** Set by AuthContext whenever the effective signed-in staff changes (null on sign-out). */
export function setHeaderStaffId(value: string | null | undefined) {
  staffId = headerValue(value) || null;
}

export function appVersion(): string {
  const version = headerValue(Constants.nativeAppVersion ?? Constants.expoConfig?.version);
  const build = headerValue(Constants.nativeBuildVersion);
  if (!version) return '';
  return headerValue(build ? `${version}+${build}` : version);
}

export function updateId(): string {
  try {
    return headerValue(updates()?.updateId) || 'embedded';
  } catch {
    return 'embedded';
  }
}

export function osVersion(): string {
  return headerValue(device()?.osVersion ?? Platform.Version);
}

/** The header set for one request to scooba-service. */
export function appHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Request-Id': randomId(),
    'X-Platform': headerValue(Platform.OS),
    'X-Update-Id': updateId(),
  };
  const version = appVersion();
  if (version) headers['X-App-Version'] = version;
  const os = osVersion();
  if (os) headers['X-OS-Version'] = os;
  if (installId) headers['X-Install-Id'] = installId;
  if (staffId) headers['X-Staff-Id'] = staffId;
  return headers;
}

/** Test-only reset of module state. */
export function __resetAppHeadersForTests() {
  installId = null;
  installIdLoading = null;
  staffId = null;
}
