import { type Href, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import moment from 'moment';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { NavTopBar } from '@/components/nav-top-bar';
import { Bell, BellOff } from 'lucide-react-native';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { useTheme } from '@/context/ThemeContext';
import {
  clearNotificationHistory,
  getNotificationHistory,
  markNotificationRead,
  type PushNotificationHistoryItem,
} from '@/services/notificationService';
import { navPush } from '@/utils/navigation';

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
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const isUnread = item.status === 'unread';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.itemPressable, pressed && styles.itemPressed]}
    >
      <View style={[styles.itemCard, isUnread && styles.itemCardUnread]}>
        <View style={[styles.iconCircle, isUnread && styles.iconCircleUnread]}>
          <Bell size={18} color={isUnread ? c.textOnPrimary : c.primary} />
        </View>
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
  const c = useColors();
  const { isDarkMode } = useTheme();
  const styles = useThemedStyles(makeStyles);
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
      TEXT.NOTIFICATION_CLEAR_CONFIRM_TITLE,
      TEXT.NOTIFICATION_CLEAR_CONFIRM_MESSAGE,
      [
        { text: TEXT.CANCEL, style: 'cancel' },
        {
          text: TEXT.NOTIFICATION_CLEAR_ALL,
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
    <ThemedView style={styles.container}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <NavTopBar
        title={TEXT.NOTIFICATION_TITLE}
        showHomeButton
        rightContent={
          items.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={TEXT.NOTIFICATION_CLEAR_ALL_ACCESSIBILITY_LABEL}
              onPress={handleClearAll}
              style={({ pressed }) => [styles.clearBtn, pressed && styles.clearBtnPressed]}
            >
              <ThemedText style={styles.clearBtnText}>{TEXT.NOTIFICATION_CLEAR_ALL}</ThemedText>
            </Pressable>
          ) : undefined
        }
      />

      <FlatList<PushNotificationHistoryItem>
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={c.primary} />}
        ListEmptyComponent={<EmptyState icon={BellOff} message={TEXT.NOTIFICATION_EMPTY} />}
        renderItem={({ item }) => (
          <NotificationItem item={item} onPress={() => openNotification(item)} />
        )}
      />
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1 },
  listContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 },

  clearBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  clearBtnPressed: { opacity: 0.6 },
  clearBtnText: {
    fontSize: 13,
    fontFamily: AppFonts.psuRegular,
    color: c.textOnPrimary,
  },

  itemPressable: {},
  itemPressed: { opacity: 0.72 },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  itemCardUnread: {
    backgroundColor: c.primarySoft,
    borderColor: c.primarySoft,
  },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconCircleUnread: {
    backgroundColor: c.primary,
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
    color: c.text,
  },
  itemTitleUnread: {
    color: c.text,
  },
  itemTimestamp: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: AppFonts.psuRegular,
    color: c.textMuted,
    flexShrink: 0,
    marginTop: 2,
  },

  itemBody: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: AppFonts.psuRegular,
    color: c.textMuted,
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
    color: c.text,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppFonts.psuRegular,
    color: c.textMuted,
    textAlign: 'center',
  },
});
