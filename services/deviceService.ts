import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import type * as ExpoNotifications from "expo-notifications";
import { Platform } from "react-native";

import { ENDPOINTS } from "@/constants/endpoints";
import { ENV } from "@/constants/config";
import type { AuthUser } from "@/models/types";
import { fetchApi } from "./api";

const DEVICE_ID_STORAGE_KEY = "PUSH_DEVICE_ID";
const REGISTERED_DEVICE_OWNERS_STORAGE_KEY = "REGISTERED_DEVICE_OWNERS";
const DEVICE_REGISTER_API_KEY = ENV.deviceRegisterApiKey;

function canRegisterDeviceWithoutPushToken() {
  return Platform.OS === "web";
}

function isAndroidExpoGo() {
  return Platform.OS === "android" && (Constants.executionEnvironment === "storeClient" || Constants.appOwnership === "expo");
}

function canRequestRemotePushToken() {
  return Device.isDevice || Platform.OS === "android";
}

async function loadNotifications() {
  if (Platform.OS === "web" || isAndroidExpoGo()) {
    return null;
  }

  return import("expo-notifications") as Promise<typeof ExpoNotifications>;
}

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

async function requestPushPermission(Notifications: typeof ExpoNotifications) {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

type PushRegistrationToken = {
  expoPushToken: string;
  fcmToken: string;
};

function emptyPushRegistrationToken(): PushRegistrationToken {
  return {
    expoPushToken: "",
    fcmToken: "",
  };
}

function getPushRegistrationTokenFromDeviceToken(token: ExpoNotifications.DevicePushToken): PushRegistrationToken {
  if (Platform.OS === "android") {
    return {
      expoPushToken: "",
      fcmToken: textValue(token.data),
    };
  }

  return emptyPushRegistrationToken();
}

async function getPushRegistrationToken(): Promise<PushRegistrationToken> {
  if (Platform.OS === "web") {
    return emptyPushRegistrationToken();
  }

  if (isAndroidExpoGo()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[push] Expo Go does not support Android remote push notifications. Use a development build.");
    }

    return emptyPushRegistrationToken();
  }

  if (!canRequestRemotePushToken()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[push] physical device is required for push notifications");
    }

    return emptyPushRegistrationToken();
  }

  try {
    const Notifications = await loadNotifications();
    if (!Notifications) {
      return emptyPushRegistrationToken();
    }

    if (!(await requestPushPermission(Notifications))) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[push] notification permission was not granted");
      }

      return emptyPushRegistrationToken();
    }

    if (Platform.OS === "android") {
      const token = await Notifications.getDevicePushTokenAsync();
      if (process.env.NODE_ENV !== "production") {
        console.log("[push] Android FCM token", textValue(token.data));
      }

      return getPushRegistrationTokenFromDeviceToken(token);
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;
    if (!projectId) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[push] EAS projectId is required to get an Expo push token");
      }

      return emptyPushRegistrationToken();
    }

    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return {
      expoPushToken: textValue(token.data),
      fcmToken: "",
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[push] unable to get push token", error);
    }

    return emptyPushRegistrationToken();
  }
}

async function registerDevice(user: AuthUser, staffId: string, deviceId: string, pushToken: PushRegistrationToken) {
  const deviceName = getDeviceName();
  const payload = {
    owner: staffId,
    staff_id: staffId,
    device_id: deviceId,
    ...(pushToken.expoPushToken ? { expo_push_token: pushToken.expoPushToken } : {}),
    ...(pushToken.fcmToken ? { fcm_token: pushToken.fcmToken } : {}),
    device_name: deviceName,
    model_name: deviceName,
    os: Platform.OS,
    last_visited: new Date().toISOString(),
    auth_provider: "openid",
    auth_subject: getAuthSubject(user),
    auth_email: textValue(user.email),
    auth_display_name: textValue(user.displayName) || textValue(user.name) || textValue(user.fullName),
  };

  const response = await fetchApi(ENDPOINTS.pushRegisterDevice, {
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

async function registerLoggedInDeviceWithToken(user: AuthUser, pushToken: PushRegistrationToken) {
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

  if (!pushToken.expoPushToken && !pushToken.fcmToken && !canRegisterDeviceWithoutPushToken()) {
    return;
  }

  const deviceId = await getDeviceId();
  await registerDevice(user, staffId, deviceId, pushToken);
}

export async function registerLoggedInDevice(user: AuthUser) {
  // The web build has no push capability — never register a device there.
  if (Platform.OS === "web") return;
  const pushToken = await getPushRegistrationToken();
  await registerLoggedInDeviceWithToken(user, pushToken);
}

export async function registerLoggedInDeviceOnce(user: AuthUser) {
  if (Platform.OS === "web") return;
  const staffId = getStaffId(user);
  const deviceId = await getDeviceId();
  const pushToken = await getPushRegistrationToken();
  if (!pushToken.expoPushToken && !pushToken.fcmToken && !canRegisterDeviceWithoutPushToken()) {
    return;
  }

  const ownerKey = `${staffId}:${deviceId}`;
  const registeredOwnerKey = `${ownerKey}:${pushToken.expoPushToken || pushToken.fcmToken || "no-token"}`;

  if (staffId && (await getRegisteredDeviceOwners()).includes(registeredOwnerKey)) {
    return;
  }

  if (!staffId || !DEVICE_REGISTER_API_KEY) {
    await registerLoggedInDevice(user);
    return;
  }

  await registerDevice(user, staffId, deviceId, pushToken);

  if (staffId) {
    await rememberRegisteredDeviceOwner(registeredOwnerKey);
  }
}

export function subscribeToLoggedInDevicePushTokenChanges(user: AuthUser) {
  // No push tokens on web — nothing to subscribe to.
  if (Platform.OS === "web") return () => {};

  let subscription: { remove: () => void } | null = null;
  let isDisposed = false;

  void loadNotifications().then((Notifications) => {
    if (!Notifications || isDisposed) {
      return;
    }

    subscription = Notifications.addPushTokenListener((token) => {
      const pushToken = getPushRegistrationTokenFromDeviceToken(token);
      if (process.env.NODE_ENV !== "production" && pushToken.fcmToken) {
        console.log("[push] Android FCM token refreshed", pushToken.fcmToken);
      }

      void registerLoggedInDeviceWithToken(user, pushToken).catch((error) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[push] device token refresh registration failed", error);
        }
      });
    });
  });

  return () => {
    isDisposed = true;
    subscription?.remove();
  };
}
