/**
 * Booking Room → ประวัติจอง (tab key: booking_history).
 *
 * The signed-in person's finished bookings — everything whose last slot is
 * behind us — most recent first. The same rows the website's
 * "รายงานจองห้องของคุณ" page lists (index.php?main=report), minus the ones that
 * have not happened yet: those live on the รายการจอง tab instead, and showing
 * them in both places would only make the two tabs argue.
 *
 * Paged: the busiest accounts here have several hundred finished bookings, so
 * the list loads thirty at a time. Scrolling near the bottom fetches the next
 * thirty — the same FlatList/onEndReached arrangement the notice-repair lists
 * use, so paging feels the same wherever it happens in the app.
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
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { ListCard } from '@/components/ui/list-card';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { listMyBookings, type MyBooking } from '@/services/bookingRoomService';
import { formatDateRange } from '@/utils/date-format';
import { navPush } from '@/utils/navigation';

/** Rows per fetch. Matches the server's own default. */
const PAGE_SIZE = 30;

/** Same three glyphs the type chooser uses, so a row points back at the form
 *  that made it. */
function bookingIcon(typeId: number): IconSymbolName {
  if (typeId === 2) return 'calendar-range';
  if (typeId === 3) return 'calendar-clock';
  return 'calendar';
}

export default function BookingRoomHistoryScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user, loading: authLoading } = useAuth();

  // UNI_STAFF_ID — the id the app signs in with, and what the booking website
  // stores in tb_book.tb_user_id.
  const staffId = user?.staffId ?? '';

  const [bookings, setBookings] = useState<MyBooking[]>([]);
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

  const loadFirstPage = useCallback(
    async (isRefresh = false) => {
      if (!staffId) {
        setBookings([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const page = await listMyBookings(staffId, 'history', { limit: PAGE_SIZE, offset: 0 });
        setBookings(page);
        // A short page is the last page. Cheaper than asking the server for a
        // total, and wrong only where the count lands exactly on a page
        // boundary — then one empty fetch settles it.
        setHasMore(page.length === PAGE_SIZE);
      } catch (err) {
        setError(err instanceof Error ? err.message : TEXT.BOOKING_ROOM_HISTORY_ERROR);
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
      const offset = bookings.length;
      const page = await listMyBookings(staffId, 'history', { limit: PAGE_SIZE, offset });

      setBookings((prev) => {
        // The list may have been replaced underneath this fetch — a refresh, or
        // a sign-in landing — in which case appending a page read from the old
        // offset would interleave two different lists. Drop it.
        if (prev.length !== offset) return prev;

        const seen = new Set(prev.map((b) => b.book_id));
        return [...prev, ...page.filter((b) => !seen.has(b.book_id))];
      });

      setHasMore(page.length === PAGE_SIZE);
    } catch (err) {
      // The rows already on screen stay; only the attempt to extend them failed.
      setError(err instanceof Error ? err.message : TEXT.BOOKING_ROOM_HISTORY_ERROR);
    } finally {
      fetching.current = false;
      setLoadingMore(false);
    }
  }, [staffId, hasMore, loading, refreshing, bookings.length]);

  useFocusEffect(
    useCallback(() => {
      void loadFirstPage();
    }, [loadFirstPage]),
  );

  // Title, kind of booking, and when it ran — nothing else. The rooms, the
  // teacher and the slot count were all true and all noise: this is a log of
  // past bookings, and a log wants to be scannable. Whatever was dropped is a
  // tap away on the detail screen.
  const renderItem = useCallback(
    ({ item }: { item: MyBooking }) => (
      <ListCard
        onPress={() =>
          navPush({
            pathname: '/booking-room/booking-detail',
            // `from` tells the detail screen which list to send back to.
            params: { book_id: String(item.book_id), from: 'history' },
          } as Parameters<typeof navPush>[0])
        }
        icon={<IconSymbol name={bookingIcon(item.booktype.id)} size={20} color={c.textMuted} />}
        // Muted rather than the brand tint the current list uses: these are
        // done, and should not compete with what is still coming up.
        iconBackground={c.surfaceAlt}
        title={item.subject_id || item.objective || TEXT.BOOKING_ROOM_TAB_HISTORY}
        // Both facts as meta lines rather than the type sitting on the plain
        // `date` line: a line with a glyph in front of it and a line without
        // read as two different kinds of fact, and these are the same kind.
        //
        // The dates are when the booking ran, not when it was made — in a log
        // of finished bookings the span is what identifies one, and "จองเมื่อ"
        // is a fact about the paperwork.
        meta={[
          {
            icon: (
              <IconSymbol
                name={bookingIcon(item.booktype.id)}
                size={13}
                color={c.textMuted}
              />
            ),
            text: item.booktype.label,
          },
          {
            icon: <IconSymbol name="calendar-range" size={13} color={c.textMuted} />,
            text: formatDateRange(
              item.first_date || item.start_date,
              item.last_date || item.end_date,
            ),
          },
        ]}
      />
    ),
    [c.surfaceAlt, c.textMuted],
  );

  const listFooter = () => {
    if (bookings.length === 0) return null;

    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <InfinityLoader size={44} strokeWidth={4} />
        </View>
      );
    }

    if (!hasMore) {
      return (
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>{TEXT.BOOKING_ROOM_END_OF_LIST}</ThemedText>
        </View>
      );
    }

    // hasMore but not fetching: onEndReached has not fired yet. A spinner here
    // says "there is more coming" without asking for a tap.
    return (
      <View style={styles.footer}>
        <InfinityLoader size={44} strokeWidth={4} />
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
          title={TEXT.BOOKING_ROOM_TAB_HISTORY}
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

  if (!staffId || (error && bookings.length === 0)) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader
          title={TEXT.BOOKING_ROOM_TAB_HISTORY}
          backHref="/"
          titleInNavBar
          showHomeButton={false}
        />
        {staffId ? (
          <ErrorState
            title={TEXT.BOOKING_ROOM_HISTORY_ERROR}
            message={error ?? ''}
            onRetry={() => void loadFirstPage()}
          />
        ) : (
          <ErrorState variant="empty" message={TEXT.BOOKING_ROOM_NEED_SIGNIN} />
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={TEXT.BOOKING_ROOM_TAB_HISTORY}
        backHref="/"
        titleInNavBar
        showHomeButton={false}
      />

      <FlatList
        data={bookings}
        keyExtractor={(item) => String(item.book_id)}
        renderItem={renderItem}
        contentContainerStyle={
          bookings.length === 0 ? styles.emptyContainer : styles.list
        }
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
          <EmptyState iconName="history" message={TEXT.BOOKING_ROOM_HISTORY_EMPTY} />
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
