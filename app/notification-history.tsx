import { router, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  clearNotificationHistory,
  getNotificationHistory,
  markNotificationRead,
  type PushNotificationHistoryItem,
} from "@/services/notificationService";
import { formatDateTime } from "@/utils/date-format";

function getTargetUrl(item: PushNotificationHistoryItem) {
  const url = item.data?.url;
  return typeof url === "string" && url.trim() ? url.trim() : "";
}

export default function NotificationHistoryScreen() {
  const [items, setItems] = useState<PushNotificationHistoryItem[]>([]);

  const loadHistory = useCallback(() => {
    let isActive = true;

    void getNotificationHistory().then((historyItems) => {
      if (isActive) {
        setItems(historyItems);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  useFocusEffect(loadHistory);

  const openNotification = async (item: PushNotificationHistoryItem) => {
    await markNotificationRead(item.id);
    setItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === item.id ? { ...currentItem, status: "read" } : currentItem,
      ),
    );

    const targetUrl = getTargetUrl(item);
    if (targetUrl) {
      router.push(targetUrl as Href);
    }
  };

  const clearAllNotifications = async () => {
    await clearNotificationHistory();
    setItems([]);
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title="Notification History"
        showHomeButton={false}
        rightContent={
          <Pressable
            accessibilityLabel="Clear all notifications"
            accessibilityRole="button"
            disabled={!items.length}
            onPress={clearAllNotifications}
            style={[styles.clearButton, !items.length ? styles.clearButtonDisabled : undefined]}>
            <ThemedText
              lightColor="#B42318"
              darkColor="#B42318"
              type="defaultSemiBold"
              style={styles.clearButtonText}>
              Clear
            </ThemedText>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {items.length > 0 ? (
          items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => openNotification(item)}
              style={({ pressed }) => [styles.itemPressable, pressed ? styles.itemPressed : undefined]}>
              <ThemedView style={styles.itemCard} lightColor="#FFFFFF" darkColor="#1F2B30">
                <View style={styles.itemContent}>
                  <View style={styles.itemHeader}>
                    <View style={styles.titleRow}>
                      <IconSymbol name="bell.fill" size={20} color="#0A6E8A" />
                      <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.itemTitle}>
                        {item.title}
                      </ThemedText>
                    </View>
                    {item.status === "unread" ? <View style={styles.unreadDot} /> : null}
                  </View>

                  {item.body ? (
                    <ThemedText numberOfLines={3} style={styles.itemBody}>
                      {item.body}
                    </ThemedText>
                  ) : null}

                  <View style={styles.itemFooter}>
                    <ThemedText style={styles.itemMeta}>{formatDateTime(item.receivedAt)}</ThemedText>
                    {getTargetUrl(item) ? (
                      <IconSymbol name="chevron.right" size={22} color="#0A6E8A" />
                    ) : null}
                  </View>
                </View>
              </ThemedView>
            </Pressable>
          ))
        ) : (
          <ThemedView style={styles.emptyCard} lightColor="#FFFFFF" darkColor="#1F2B30">
            <IconSymbol name="bell.fill" size={30} color="#8AA4AE" />
            <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
              No notifications
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              New push notifications will appear here.
            </ThemedText>
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: 12,
    padding: 20,
  },
  clearButton: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#F4C7C3",
    backgroundColor: "#FFF4F2",
    paddingHorizontal: 12,
  },
  clearButtonDisabled: {
    opacity: 0.45,
  },
  clearButtonText: {
    fontSize: 13,
    lineHeight: 18,
  },
  itemPressable: {
    borderRadius: 8,
  },
  itemPressed: {
    opacity: 0.72,
  },
  itemCard: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D7E6EC",
    padding: 14,
  },
  itemContent: {
    gap: 8,
  },
  itemHeader: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  itemTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#D92D20",
    marginTop: 6,
  },
  itemBody: {
    color: "#52656D",
    fontSize: 14,
    lineHeight: 20,
    paddingLeft: 30,
  },
  itemFooter: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 30,
  },
  itemMeta: {
    color: "#687076",
    fontSize: 12,
    lineHeight: 18,
  },
  emptyCard: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D7E6EC",
    padding: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyText: {
    marginTop: 6,
    color: "#687076",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
