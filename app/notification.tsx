import MaterialIcons from '@react-native-vector-icons/material-icons';
import { type Href, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

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
import { formatDateTime } from '@/utils/date-format';
import { navPush } from '@/utils/navigation';

function getTargetUrl(item: PushNotificationHistoryItem) {
  const url = item.data?.url;
  return typeof url === 'string' && url.trim() ? url.trim() : '';
}

function NotificationItem({ item, onPress }: { item: PushNotificationHistoryItem; onPress: () => void }) {
  const isUnread = item.status === 'unread';
  const hasLink = Boolean(getTargetUrl(item));

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.itemPressable, pressed && styles.itemPressed]}
    >
      <View style={[styles.itemCard, isUnread && styles.itemCardUnread]}>
        <View style={[styles.iconCircle, isUnread ? styles.iconCircleUnread : styles.iconCircleRead]}>
          <MaterialIcons name="notifications" size={20} color={isUnread ? '#FFFFFF' : '#5D6371'} />
        </View>

        <View style={styles.itemBody}>
          <View style={styles.itemTitleRow}>
            <ThemedText style={[styles.itemTitle, isUnread && styles.itemTitleUnread]} numberOfLines={2}>
              {item.title}
            </ThemedText>
            {isUnread ? <View style={styles.unreadDot} /> : null}
          </View>

          {item.body ? (
            <ThemedText style={styles.itemMessage} numberOfLines={3}>
              {item.body}
            </ThemedText>
          ) : null}

          <View style={styles.itemFooter}>
            <MaterialIcons name="access-time" size={12} color="#8B9099" />
            <ThemedText style={styles.itemTimestamp}>{formatDateTime(item.receivedAt)}</ThemedText>
          </View>
        </View>

        {hasLink ? (
          <MaterialIcons name="chevron-right" size={20} color="#8B716F" style={styles.chevron} />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function NotificationScreen() {
  const [items, setItems] = useState<PushNotificationHistoryItem[]>([]);

  const loadHistory = useCallback(() => {
    let isActive = true;

    void getNotificationHistory().then((historyItems) => {
      if (isActive) setItems(historyItems);
    });

    return () => { isActive = false; };
  }, []);

  useFocusEffect(loadHistory);

  const openNotification = async (item: PushNotificationHistoryItem) => {
    await markNotificationRead(item.id);
    setItems((current) =>
      current.map((n) => (n.id === item.id ? { ...n, status: 'read' } : n)),
    );

    const targetUrl = getTargetUrl(item);
    if (targetUrl) {
      navPush(targetUrl as Href);
    }
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

  const unreadCount = items.filter((n) => n.status === 'unread').length;

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar
        title="การแจ้งเตือน"
        showHomeButton={false}
        rightContent={
          items.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ล้างการแจ้งเตือนทั้งหมด"
              onPress={handleClearAll}
              style={({ pressed }) => [styles.clearBtn, pressed && styles.clearBtnPressed]}
            >
              <ThemedText style={styles.clearBtnText}>ล้างทั้งหมด</ThemedText>
            </Pressable>
          ) : undefined
        }
      />

      <FlatList<PushNotificationHistoryItem>
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          unreadCount > 0 ? (
            <View style={styles.unreadBanner}>
              <MaterialIcons name="notifications-active" size={14} color="#922124" />
              <ThemedText style={styles.unreadBannerText}>
                {unreadCount} รายการยังไม่ได้อ่าน
              </ThemedText>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="notifications-none" size={36} color="#5D6371" />
            </View>
            <ThemedText style={styles.emptyTitle}>ไม่มีการแจ้งเตือน</ThemedText>
            <ThemedText style={styles.emptySubtitle}>การแจ้งเตือนใหม่จะปรากฏที่นี่</ThemedText>
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
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  listContent: { padding: 16, paddingBottom: 40 },

  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F4C7C3',
    backgroundColor: '#FFF4F2',
  },
  clearBtnPressed: { opacity: 0.7 },
  clearBtnText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppFonts.psuBold,
    color: '#B33939',
  },

  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F4C7C3',
  },
  unreadBannerText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppFonts.psuRegular,
    color: '#922124',
  },

  separator: { height: 10 },

  itemPressable: { borderRadius: 12 },
  itemPressed: { opacity: 0.75 },

  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E2E6',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemCardUnread: {
    borderColor: '#F4C7C3',
    backgroundColor: '#FFFAFA',
  },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconCircleUnread: { backgroundColor: '#B33939' },
  iconCircleRead: { backgroundColor: '#DADFF0' },

  itemBody: { flex: 1, gap: 4 },

  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: AppFonts.psuRegular,
    color: '#191C1F',
  },
  itemTitleUnread: {
    fontFamily: AppFonts.psuBold,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B33939',
    marginTop: 6,
    flexShrink: 0,
  },

  itemMessage: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppFonts.psuRegular,
    color: '#585E6D',
  },

  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemTimestamp: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: AppFonts.psuRegular,
    color: '#8B9099',
  },

  chevron: { flexShrink: 0, marginTop: 10 },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DADFF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: AppFonts.psuBold,
    color: '#191C1F',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppFonts.psuRegular,
    color: '#585E6D',
    textAlign: 'center',
  },
});
