/**
 * Booking Room → เสร็จสิ้น (tab key: booking_history).
 *
 * The signed-in person's finished bookings and closed meeting-room requests —
 * everything whose last slot is behind us, or whose request has been
 * cancelled/closed — most recent first, from both room-booking systems in one
 * list. See services/roomBookingAggregator.ts for why the two are merged here
 * rather than shown as two separate sections, and why only classroom
 * bookings are paged (meeting-room's own request volume per person is too low
 * to need it — its whole set rides along on page one).
 *
 * The tab was called ประวัติจอง and the file history.tsx until people — the
 * author of the feature included — read an empty list here as a booking that
 * had failed to save. A booking made today for next month is not history and
 * not absent; it simply has not finished yet, and only the word "เสร็จสิ้น"
 * says which of the two lists it belongs in.
 *
 * The API scope is still `history` on purpose: that is the upstream's own
 * wording (both upstreams', now), in a PHP route and a gateway endpoint the
 * app does not get to rename. The boundary is this file — everything the
 * reader sees says "เสร็จสิ้น", everything on the wire says "history".
 *
 * Paged: the busiest accounts here have several hundred finished classroom
 * bookings, so that side loads thirty at a time. Scrolling near the bottom
 * fetches the next thirty — the same FlatList/onEndReached arrangement the
 * notice-repair lists use, so paging feels the same wherever it happens in
 * the app.
 */
import { useCallback, useRef, useState } from 'react';
import { InfinityLoader } from '@/components/infinity-loader';
import { useFocusEffect } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ListCard } from '@/components/ui/list-card';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { listUnifiedBookings, type UnifiedBooking } from '@/services/roomBookingAggregator';
import { navPush } from '@/utils/navigation';

/** Rows per fetch, classroom side. Matches the server's own default. */
const PAGE_SIZE = 30;

export default function BookingRoomHistoryScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user, loading: authLoading } = useAuth();

  // UNI_STAFF_ID — the id the app signs in with, and what both upstreams key
  // a person's own rows by (booking-room's tb_book.tb_user_id, meeting-room
  // via CENTRAL.STAFF_INFO).
  const staffId = user?.staffId ?? '';

  const [items, setItems] = useState<UnifiedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Guards the next-page fetch.
   *
   * FlatList fires onEndReached more than once for a single scroll to the
   * bottom, and state set inside an async callback is not visible to the calls
   * that land before React re-renders. A ref changes synchronously, so the
   * second and third calls see the fetch already in flight and drop out —
   * without it the same page arrives two or three times and the list grows
   * duplicate rows.
   */
  const fetching = useRef(false);

  // Only classroom rows count toward the offset — meeting-room's whole set
  // rode along on page one and is not repeated on later pages.
  const classroomCount = useCallback(
    (list: UnifiedBooking[]) => list.filter((item) => item.kind === 'classroom').length,
    [],
  );

  const loadFirstPage = useCallback(
    async (isRefresh = false) => {
      if (!staffId) {
        setItems([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const page = await listUnifiedBookings(staffId, 'history', { limit: PAGE_SIZE, offset: 0 });
        setItems(page.items);
        setHasMore(page.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : TEXT.BOOKING_ROOM_COMPLETED_ERROR);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [staffId],
  );

  const loadMore = useCallback(async () => {
    if (!staffId || !hasMore || loading || refreshing || fetching.current) return;

    fetching.current = true;
    setLoadingMore(true);

    try {
      const offset = classroomCount(items);
      const page = await listUnifiedBookings(staffId, 'history', { limit: PAGE_SIZE, offset });

      setItems((prev) => {
        // The list may have been replaced underneath this fetch — a refresh, or
        // a sign-in landing — in which case appending a page read from the old
        // offset would interleave two different lists. Drop it.
        if (classroomCount(prev) !== offset) return prev;

        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...page.items.filter((item) => !seen.has(item.id))];
      });

      setHasMore(page.hasMore);
    } catch (err) {
      // The rows already on screen stay; only the attempt to extend them failed.
      setError(err instanceof Error ? err.message : TEXT.BOOKING_ROOM_COMPLETED_ERROR);
    } finally {
      fetching.current = false;
      setLoadingMore(false);
    }
  }, [staffId, hasMore, loading, refreshing, items, classroomCount]);

  useFocusEffect(
    useCallback(() => {
      void loadFirstPage();
    }, [loadFirstPage]),
  );

  // Title, kind of room, and when it ran — nothing else. Whatever was dropped
  // is a tap away on the detail screen the row already points at.
  const renderItem = useCallback(
    ({ item }: { item: UnifiedBooking }) => (
      <ListCard
        onPress={() => navPush(item.onPressRoute as Parameters<typeof navPush>[0])}
        icon={<IconSymbol name={item.icon} size={20} color={c.textMuted} />}
        // Muted rather than the brand tint the current list uses: these are
        // done, and should not compete with what is still coming up.
        iconBackground={c.surfaceAlt}
        title={item.title}
        badge={item.badge}
        meta={[
          { icon: <IconSymbol name={item.icon} size={13} color={c.textMuted} />, text: item.kindLabel },
          {
            icon: <IconSymbol name="calendar-range" size={13} color={c.textMuted} />,
            text: item.dateLabel,
          },
        ]}
      />
    ),
    [c.surfaceAlt, c.textMuted],
  );

  const listFooter = () => {
    if (items.length === 0) return null;

    if (loadingMore || hasMore) {
      return (
        <View style={styles.footer}>
          <InfinityLoader size={44} strokeWidth={4} />
        </View>
      );
    }

    return (
      <View style={styles.footer}>
        <ThemedText style={styles.footerText}>{TEXT.BOOKING_ROOM_END_OF_LIST}</ThemedText>
      </View>
    );
  };

  // Still waiting on the session: without this the screen would flash the "no
  // history" message during sign-in, which is a different statement from "we
  // have not asked yet".
  if (loading || (authLoading && !staffId)) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader
          title={TEXT.BOOKING_ROOM_TAB_COMPLETED}
          backHref="/"
          titleInNavBar
          showHomeButton={false}
        />
        <View style={styles.centered}>
          <InfinityLoader size={60} />
        </View>
      </ThemedView>
    );
  }

  if (!staffId || (error && items.length === 0)) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader
          title={TEXT.BOOKING_ROOM_TAB_COMPLETED}
          backHref="/"
          titleInNavBar
          showHomeButton={false}
        />
        {staffId ? (
          <ErrorState
            title={TEXT.BOOKING_ROOM_COMPLETED_ERROR}
            message={error ?? ''}
            onRetry={() => void loadFirstPage()}
          />
        ) : (
          <ErrorState variant="empty" art={null} message={TEXT.BOOKING_ROOM_NEED_SIGNIN} />
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={TEXT.BOOKING_ROOM_TAB_COMPLETED}
        backHref="/"
        titleInNavBar
        showHomeButton={false}
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadFirstPage(true)}
            tintColor={c.primary}
          />
        }
        // 0.3 rather than the default 0.5: these cards are tall, so half a
        // screen of remaining content is a lot of scrolling to pre-fetch.
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <EmptyState preset="history" message={TEXT.BOOKING_ROOM_COMPLETED_EMPTY} />
        }
        ListFooterComponent={listFooter()}
      />
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    list: { padding: 16, paddingTop: 24, paddingBottom: 32 },
    emptyContainer: { flexGrow: 1, justifyContent: 'center' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    footer: { paddingVertical: 20, alignItems: 'center' },
    footerText: { fontSize: 13, color: c.textFaint },
  });
