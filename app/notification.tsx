import { type Href, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import moment from 'moment';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
import {
  clearNotificationHistory,
  getNotificationHistory,
  markNotificationRead,
  type PushNotificationHistoryItem,
} from '@/services/notificationService';
import { navPush } from '@/utils/navigation';

const D = {
  bg: '#ffffff',
  surface: '#ffffff',
  text: '#191C1F',
  mutedText: '#6B7280',
  border: '#E5E7EB',
  primary: '#B33939',
  unreadBg: '#FFFAFA',
  unreadBorder: '#F4C7C3',
} as const;

function formatRelativeTime(value: string) {
  const m = moment(value);
  if (!m.isValid()) return value;
  return m.fromNow();
}

function getTargetUrl(item: PushNotificationHistoryItem) {
  const url = item.data?.url;
  return typeof url === 'string' && url.trim() ? url.trim() : '';
}

function NotificationItem({ item, onPress }: { item: PushNotificationHistoryItem; onPress: () => void }) {
  const isUnread = item.status === 'unread';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.itemPressable, pressed && styles.itemPressed]}
    >
      <View style={[styles.itemCard, isUnread && styles.itemCardUnread]}>
        {isUnread && <View style={styles.unreadIndicator} />}
        <View style={styles.itemContent}>
          <View style={styles.itemTitleRow}>
            <ThemedText style={[styles.itemTitle, isUnread && styles.itemTitleUnread]} numberOfLines={2}>
              {item.title}
            </ThemedText>
            <ThemedText style={styles.itemTimestamp}>
              {formatRelativeTime(item.receivedAt)}
            </ThemedText>
          </View>
          {item.body ? (
            <ThemedText style={styles.itemBody} numberOfLines={2}>
              {item.body}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function NotificationScreen() {
  const [items, setItems] = useState<PushNotificationHistoryItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadHistory = useCallback(() => {
    let isActive = true;
    void getNotificationHistory().then((historyItems) => {
      if (isActive) setItems(historyItems);
    });
    return () => { isActive = false; };
  }, []);

  useFocusEffect(loadHistory);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const historyItems = await getNotificationHistory();
      setItems(historyItems);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const openNotification = async (item: PushNotificationHistoryItem) => {
    await markNotificationRead(item.id);
    setItems((current) =>
      current.map((n) => (n.id === item.id ? { ...n, status: 'read' } : n)),
    );
    const targetUrl = getTargetUrl(item);
    if (targetUrl) navPush(targetUrl as Href);
  };

  const handleClearAll = () => {
    Alert.alert(
      'ล้างการแจ้งเตือน',
      'ต้องการลบการแจ้งเตือนทั้งหมดใช่หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ล้างทั้งหมด',
          style: 'destructive',
          onPress: async () => {
            await clearNotificationHistory();
            setItems([]);
          },
        },
      ],
    );
  };

  return (
    <ThemedView style={styles.container} lightColor={D.bg}>
      <StatusBar style="light" />
      <NavTopBar
        title="Notifications"
        showHomeButton={false}
        rightContent={
          items.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ล้างการแจ้งเตือนทั้งหมด"
              onPress={handleClearAll}
              style={({ pressed }) => [styles.clearBtn, pressed && styles.clearBtnPressed]}
            >
              <ThemedText style={styles.clearBtnText}>Clear all</ThemedText>
            </Pressable>
          ) : undefined
        }
      />

      <FlatList<PushNotificationHistoryItem>
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={D.primary} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <ThemedText style={styles.emptyTitle}>No notifications</ThemedText>
            <ThemedText style={styles.emptySubtitle}>New notifications will appear here</ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <NotificationItem item={item} onPress={() => openNotification(item)} />
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingVertical: 8, paddingBottom: 40 },

  clearBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  clearBtnPressed: { opacity: 0.6 },
  clearBtnText: {
    fontSize: 13,
    fontFamily: AppFonts.psuRegular,
    color: '#FFFFFF',
  },

  separator: {
    height: 1,
    backgroundColor: D.border,
    marginHorizontal: 24,
    marginVertical: 4,
  },

  itemPressable: {},
  itemPressed: { backgroundColor: '#F9FAFB' },

  itemCard: {
    flexDirection: 'row',
    backgroundColor: D.surface,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  itemCardUnread: {
    backgroundColor: D.unreadBg,
  },

  unreadIndicator: {
    width: 3,
    borderRadius: 2,
    backgroundColor: D.primary,
    marginRight: 12,
    alignSelf: 'stretch',
  },

  itemContent: { flex: 1, gap: 4 },

  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: AppFonts.psuBold,
    color: D.text,
  },
  itemTitleUnread: {
    color: D.text,
  },
  itemTimestamp: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: AppFonts.psuRegular,
    color: D.mutedText,
    flexShrink: 0,
    marginTop: 2,
  },

  itemBody: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: AppFonts.psuRegular,
    color: D.mutedText,
  },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: AppFonts.psuBold,
    color: D.text,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppFonts.psuRegular,
    color: D.mutedText,
    textAlign: 'center',
  },
});
