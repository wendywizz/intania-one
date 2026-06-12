import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type * as ExpoNotifications from "expo-notifications";
import { Platform } from "react-native";

const DEFAULT_CHANNEL_ID = "default";
const NOTIFICATION_HISTORY_STORAGE_KEY = "PUSH_NOTIFICATION_HISTORY";
const MAX_NOTIFICATION_HISTORY_ITEMS = 80;

export type PushNotificationHistoryItem = {
  id: string;
  title: string;
  body: string;
  receivedAt: string;
  status: "read" | "unread";
  data?: Record<string, unknown>;
};

let listenersRegistered = false;

function isAndroidExpoGo() {
  return Platform.OS === "android" && (Constants.executionEnvironment === "storeClient" || Constants.appOwnership === "expo");
}

async function loadNotifications() {
  if (Platform.OS === "web" || isAndroidExpoGo()) {
    return null;
  }

  return import("expo-notifications") as Promise<typeof ExpoNotifications>;
}

function setForegroundNotificationHandler(Notifications: typeof ExpoNotifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureNotificationChannel(Notifications: typeof ExpoNotifications) {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: "Default",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#0A7EA4",
  });
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNotificationData(data: ExpoNotifications.Notification["request"]["content"]["data"]) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined && value !== null),
  );
}

function getNotificationHistoryItem(notification: ExpoNotifications.Notification, status: PushNotificationHistoryItem["status"]) {
  const content = notification.request.content;
  const receivedAt = new Date(notification.date || Date.now()).toISOString();
  const fallbackId = `${receivedAt}:${textValue(content.title)}:${textValue(content.body)}`;

  return {
    id: textValue(notification.request.identifier) || fallbackId,
    title: textValue(content.title) || "Notification",
    body: textValue(content.body),
    receivedAt,
    status,
    data: normalizeNotificationData(content.data),
  };
}

async function readStoredHistory() {
  const stored = await AsyncStorage.getItem(NOTIFICATION_HISTORY_STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is PushNotificationHistoryItem => {
      return (
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.receivedAt === "string" &&
        (item.status === "read" || item.status === "unread")
      );
    });
  } catch {
    return [];
  }
}

async function writeStoredHistory(items: PushNotificationHistoryItem[]) {
  await AsyncStorage.setItem(
    NOTIFICATION_HISTORY_STORAGE_KEY,
    JSON.stringify(items.slice(0, MAX_NOTIFICATION_HISTORY_ITEMS)),
  );
}

async function upsertNotificationHistoryItem(item: PushNotificationHistoryItem) {
  const items = await readStoredHistory();
  const existing = items.find((historyItem) => historyItem.id === item.id);
  const nextItem = existing
    ? {
        ...existing,
        ...item,
        status: item.status === "read" ? "read" : existing.status,
      }
    : item;
  const nextItems = [
    nextItem,
    ...items.filter((historyItem) => historyItem.id !== item.id),
  ];

  await writeStoredHistory(nextItems);
}

function registerNotificationHistoryListeners(Notifications: typeof ExpoNotifications) {
  if (listenersRegistered) {
    return;
  }

  listenersRegistered = true;

  Notifications.addNotificationReceivedListener((notification) => {
    void upsertNotificationHistoryItem(getNotificationHistoryItem(notification, "unread"));
  });

  Notifications.addNotificationResponseReceivedListener((response) => {
    void upsertNotificationHistoryItem(getNotificationHistoryItem(response.notification, "read"));
  });
}

export async function getNotificationHistory() {
  return readStoredHistory();
}

export async function getUnreadNotificationCount() {
  const items = await readStoredHistory();
  return items.filter((item) => item.status === "unread").length;
}

export async function markNotificationRead(id: string) {
  const items = await readStoredHistory();
  await writeStoredHistory(
    items.map((item) => (item.id === id ? { ...item, status: "read" } : item)),
  );
}

export async function clearNotificationHistory() {
  await AsyncStorage.removeItem(NOTIFICATION_HISTORY_STORAGE_KEY);
}

export function registerForegroundNotificationHandler() {
  void loadNotifications().then((Notifications) => {
    if (!Notifications) {
      return;
    }

    setForegroundNotificationHandler(Notifications);
    void ensureNotificationChannel(Notifications);
    registerNotificationHistoryListeners(Notifications);
  });
}
