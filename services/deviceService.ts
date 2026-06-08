import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { ENDPOINTS } from "@/constants/endpoints";
import type { AuthUser } from "@/models/types";
import { fetchWithApiDelay } from "./api";

const DEVICE_ID_STORAGE_KEY = "PUSH_DEVICE_ID";
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

export async function registerLoggedInDevice(user: AuthUser) {
  const staffId = textValue(user.staffId);
  if (!staffId || !DEVICE_REGISTER_API_KEY) {
    return;
  }

  const deviceName = getDeviceName();
  const payload = {
    owner: staffId,
    staff_id: staffId,
    device_id: await getDeviceId(),
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
    throw new Error("Unable to register device for push notification");
  }
}
