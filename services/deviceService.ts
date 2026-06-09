import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { ENDPOINTS } from "@/constants/endpoints";
import type { AuthUser } from "@/models/types";
import { fetchWithApiDelay } from "./api";

const DEVICE_ID_STORAGE_KEY = "PUSH_DEVICE_ID";
const REGISTERED_DEVICE_OWNERS_STORAGE_KEY = "REGISTERED_DEVICE_OWNERS";
const DEVICE_REGISTER_API_KEY =
  process.env.EXPO_PUBLIC_DEVICE_REGISTER_API_KEY ??
  process.env.EXPO_PUBLIC_SCOOBA_API_KEY ??
  process.env.EXPO_PUBLIC_SCOOBA_API_TOKEN ??
  "";

function textValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function createDeviceId() {
  const random = Math.random().toString(36).slice(2);
  return `${Platform.OS}-${Date.now().toString(36)}-${random}`;
}

async function getDeviceId() {
  const stored = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (stored) {
    return stored;
  }

  const deviceId = createDeviceId();
  await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  return deviceId;
}

function getDeviceName() {
  return (
    textValue(Constants.deviceName) ||
    textValue(Constants.expoConfig?.name) ||
    `${Platform.OS} device`
  );
}

function getAuthSubject(user: AuthUser) {
  return textValue(user.sub) || textValue(user.staffId) || textValue(user.email);
}

function getStaffIdCandidate(value: unknown) {
  const text = textValue(value);
  if (!text) {
    return "";
  }

  const staffId = text.includes("@") ? text.split("@")[0] : text;
  return staffId.length <= 10 ? staffId : "";
}

function getStaffId(user: AuthUser) {
  const fields = [
    "staffId",
    "staff_id",
    "STAFF_ID",
    "psu_id",
    "employee_id",
    "employeeId",
    "preferred_username",
    "username",
    "email",
    "mail",
  ];

  for (const field of fields) {
    const staffId = getStaffIdCandidate(user[field]);
    if (staffId) {
      return staffId;
    }
  }

  return "";
}

async function getRegisteredDeviceOwners() {
  const stored = await AsyncStorage.getItem(REGISTERED_DEVICE_OWNERS_STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((owner): owner is string => typeof owner === "string" && Boolean(owner))
      : [];
  } catch {
    return [];
  }
}

async function rememberRegisteredDeviceOwner(ownerKey: string) {
  const owners = await getRegisteredDeviceOwners();
  if (owners.includes(ownerKey)) {
    return;
  }

  await AsyncStorage.setItem(
    REGISTERED_DEVICE_OWNERS_STORAGE_KEY,
    JSON.stringify([...owners, ownerKey]),
  );
}

async function getErrorMessage(response: Response) {
  try {
    const json = (await response.clone().json()) as { error?: { message?: string }; message?: string };
    return json.error?.message || json.message || `HTTP ${response.status}`;
  } catch {
    try {
      const text = await response.text();
      return text.trim() || `HTTP ${response.status}`;
    } catch {
      return `HTTP ${response.status}`;
    }
  }
}

async function getPushToken() {
  if (Platform.OS === "web") {
    return "";
  }

  try {
    const existingPermission = await Notifications.getPermissionsAsync();
    const permission =
      existingPermission.granted || existingPermission.status === "granted"
        ? existingPermission
        : await Notifications.requestPermissionsAsync();

    if (!permission.granted && permission.status !== "granted") {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[push] notification permission was not granted");
      }

      return "";
    }

    const token = await Notifications.getDevicePushTokenAsync();
    return textValue(token.data);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[push] unable to get native push token", error);
    }

    return "";
  }
}

async function registerDevice(user: AuthUser, staffId: string, deviceId: string, fcmToken: string) {
  const deviceName = getDeviceName();
  const payload = {
    owner: staffId,
    staff_id: staffId,
    device_id: deviceId,
    ...(fcmToken ? { fcm_token: fcmToken } : {}),
    device_name: deviceName,
    model_name: deviceName,
    os: Platform.OS,
    last_visited: new Date().toISOString(),
    auth_provider: "openid",
    auth_subject: getAuthSubject(user),
    auth_email: textValue(user.email),
    auth_display_name: textValue(user.displayName) || textValue(user.name) || textValue(user.fullName),
  };

  const response = await fetchWithApiDelay(ENDPOINTS.pushRegisterDevice, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DEVICE_REGISTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Unable to register device for push notification: ${await getErrorMessage(response)}`);
  }
}

export async function registerLoggedInDevice(user: AuthUser) {
  const staffId = getStaffId(user);
  if (!staffId || !DEVICE_REGISTER_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[push] skip device registration", {
        hasStaffId: Boolean(staffId),
        hasApiKey: Boolean(DEVICE_REGISTER_API_KEY),
      });
    }

    return;
  }

  const deviceId = await getDeviceId();
  await registerDevice(user, staffId, deviceId, await getPushToken());
}

export async function registerLoggedInDeviceOnce(user: AuthUser) {
  const staffId = getStaffId(user);
  const deviceId = await getDeviceId();
  const fcmToken = await getPushToken();
  const ownerKey = `${staffId}:${deviceId}`;
  const registeredOwnerKey = `${ownerKey}:${fcmToken || "no-token"}`;

  if (staffId && (await getRegisteredDeviceOwners()).includes(registeredOwnerKey)) {
    return;
  }

  if (!staffId || !DEVICE_REGISTER_API_KEY) {
    await registerLoggedInDevice(user);
    return;
  }

  await registerDevice(user, staffId, deviceId, fcmToken);

  if (staffId) {
    await rememberRegisteredDeviceOwner(registeredOwnerKey);
  }
}
