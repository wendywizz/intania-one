import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const DEFAULT_CHANNEL_ID = "default";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureNotificationChannel() {
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

export function registerForegroundNotificationHandler() {
  if (Platform.OS === "web") {
    return;
  }

  void ensureNotificationChannel();
}
