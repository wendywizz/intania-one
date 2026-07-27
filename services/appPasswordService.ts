import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * The app's own unlock password — deliberately separate from the device
 * passcode, so unlocking the app never asks for the credential that unlocks the
 * phone.
 *
 * Only a salted SHA-256 digest is stored, in the device keychain / keystore, so
 * the password itself is never written anywhere. The on/off preference is an
 * ordinary AsyncStorage flag; it is not a secret and reading it must not prompt.
 */

const PASSWORD_DIGEST_KEY = "APP_PASSWORD_DIGEST";
const PASSWORD_ENABLED_STORAGE_KEY = "APP_PASSWORD_ENABLED";

/** Shortest password we accept. Long enough to be worth having, short enough to type on a lock screen. */
export const MIN_PASSWORD_LENGTH = 6;

// SecureStore has no web implementation. Every export below degrades to "no
// password set" off-device rather than throwing.
const isSupported = Platform.OS !== "web";

type StoredDigest = { salt: string; hash: string };

async function digest(salt: string, password: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${password}`,
  );
}

async function readStoredDigest(): Promise<StoredDigest | null> {
  if (!isSupported) return null;

  try {
    const raw = await SecureStore.getItemAsync(PASSWORD_DIGEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDigest>;
    return parsed.salt && parsed.hash ? { salt: parsed.salt, hash: parsed.hash } : null;
  } catch {
    return null;
  }
}

/** True once the user has created an app password. */
export async function hasAppPassword() {
  return (await readStoredDigest()) !== null;
}

/**
 * Store a new app password. Returns false when the device has no secure storage
 * or the write fails, so callers never report success on a password that was
 * not actually saved.
 */
export async function setAppPassword(password: string) {
  if (!isSupported || password.length < MIN_PASSWORD_LENGTH) return false;

  try {
    // A per-password salt means two users choosing the same password do not
    // share a digest.
    const salt = Crypto.randomUUID();
    const hash = await digest(salt, password);
    await SecureStore.setItemAsync(
      PASSWORD_DIGEST_KEY,
      JSON.stringify({ salt, hash } satisfies StoredDigest),
    );
    return true;
  } catch {
    return false;
  }
}

/** Check a password attempt against the stored digest. */
export async function verifyAppPassword(password: string) {
  const stored = await readStoredDigest();
  if (!stored) return false;

  try {
    return (await digest(stored.salt, password)) === stored.hash;
  } catch {
    return false;
  }
}

/** Forget the password and switch the option off with it. */
export async function clearAppPassword() {
  try {
    if (isSupported) await SecureStore.deleteItemAsync(PASSWORD_DIGEST_KEY);
  } catch {
    // A failed delete only leaves a digest nothing reads once the flag is off.
  }
  await setPasswordUnlockEnabled(false);
}

export async function getPasswordUnlockEnabled() {
  try {
    return (await AsyncStorage.getItem(PASSWORD_ENABLED_STORAGE_KEY)) === "true";
  } catch {
    return false;
  }
}

export async function setPasswordUnlockEnabled(enabled: boolean) {
  try {
    await AsyncStorage.setItem(PASSWORD_ENABLED_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // A failed write only means the preference is not remembered next launch.
  }
}

/**
 * Whether the lock screen can offer the password as a way in: the user turned
 * the option on *and* a password actually exists to check against.
 */
export async function canUnlockWithPassword() {
  if (!(await getPasswordUnlockEnabled())) return false;
  return hasAppPassword();
}
