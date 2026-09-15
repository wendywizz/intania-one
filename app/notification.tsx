import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import moment from 'moment';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { NavTopBar } from '@/components/nav-top-bar';
import { Bell, ChevronRight } from 'lucide-react-native';
import { EmptyState } from '@/components/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { useTheme } from '@/context/ThemeContext';
import {
  clearNotificationHistory,
  deleteNotificationHistoryItem,
  getNotificationHistory,
  markNotificationRead,
  type PushNotificationHistoryItem,
} from '@/services/notificationService';
import { navPush } from '@/utils/navigation';
import { getNotificationRoute } from '@/utils/notification-link';
import { boxShadow } from '@/constants/shadows';

function formatRelativeTime(value: string) {
  const m = moment(value);
  if (!m.isValid()) return value;
  return m.fromNow();
}

function NotificationItem({
  item,
  onPress,
  onDelete,
}: {
  item: PushNotificationHistoryItem;
  onPress: () => void;
  onDelete: () => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const isUnread = item.status === 'unread';
  // Not every notification leads anywhere — a chevron only where tapping
  // actually goes somewhere, so the row does not promise a screen it has none of.
  const isActionable = getNotificationRoute(item) !== null;

  const renderRightActions = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={TEXT.DELETE}
      onPress={onDelete}
      style={({ pressed }) => [styles.deleteAction, pressed && styles.deleteActionPressed]}
    >
      <IconSymbol name="trash.fill" size={20} color="#FFFFFF" />
      <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.deleteActionText}>
        {TEXT.DELETE}
      </ThemedText>
    </Pressable>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
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
          {isActionable ? (
            <View style={styles.itemChevron}>
              <ChevronRight size={18} color={c.textMuted} />
            </View>
          ) : null}
        </View>
      </Pressable>
    </Swipeable>
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
    // A notification with nowhere to go still gets marked read — the tap was
    // the person acknowledging it, and that is all this one had to offer.
    const route = getNotificationRoute(item);
    if (route) navPush(route);
  };

  const handleDelete = async (item: PushNotificationHistoryItem) => {
    // No confirm dialog — a swipe already IS the deliberate action, and one
    // row is cheap to be wrong about.
    setItems((current) => current.filter((n) => n.id !== item.id));
    await deleteNotificationHistoryItem(item.id);
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
        tone="primary"
        showHomeButton={false}
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
        ListEmptyComponent={<EmptyState preset="notification" message={TEXT.NOTIFICATION_EMPTY} />}
        renderItem={({ item }) => (
          <NotificationItem
            item={item}
            onPress={() => openNotification(item)}
            onDelete={() => handleDelete(item)}
          />
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
    boxShadow: boxShadow(c.shadow, { y: 2, blur: 8, opacity: 0.04 }),
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

  // Nudged down so the chevron sits against the title line rather than the top
  // edge of a two-line card.
  itemChevron: { flexShrink: 0, marginTop: 10 },

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

  deleteAction: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: c.pomegranate,
    marginLeft: 8,
    // Repeats itemCard's own bottom margin, same reasoning as
    // repair-computer-job-list-item.tsx: the swipe row is as tall as the card
    // plus its margin, so the action has to match or it hangs below the card.
    marginBottom: 12,
  },
  deleteActionPressed: {
    opacity: 0.85,
  },
  deleteActionText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppFonts.psuBold,
  },
});
