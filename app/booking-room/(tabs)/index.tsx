/**
 * Booking Room → รายการจอง (tab key: current_booking).
 *
 * The signed-in person's own bookings and requests that have not finished yet
 * — classroom bookings and meeting-room requests together, soonest first —
 * with a dashed button on top to make a new one. See
 * services/roomBookingAggregator.ts for why the two room-booking systems are
 * merged into one list here rather than shown as two sections: this is meant
 * to scale to however many room-booking systems the faculty ends up with, not
 * just these two.
 *
 * A meeting-room row carries a status badge (รออนุมัติ/อนุมัติแล้ว/ไม่อนุมัติ);
 * a classroom row never does, since classroom booking has no approval step.
 * ListCard's badge is already optional per-row for exactly this reason — see
 * components/ui/list-card.tsx.
 *
 * A note on the source. The website page this screen was modelled on
 * (index.php?main=book_view&action=view) renders $_SESSION['book'] — the lines
 * someone has added in that browser session and not yet submitted. It reads no
 * table, so there is nothing for a phone to fetch. These rows come instead from
 * tb_book/tb_bookdetail and REQUEST_ORDER, i.e. what was actually booked or
 * requested.
 */
import { useCallback, useState } from 'react';
import { InfinityLoader } from '@/components/infinity-loader';
import { useFocusEffect } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { BookingCartButton } from '@/components/booking-room/cart-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ListCard } from '@/components/ui/list-card';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { listUnifiedBookings, type UnifiedBooking } from '@/services/roomBookingAggregator';
import { navPush } from '@/utils/navigation';

export default function BookingRoomCurrentScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user, loading: authLoading } = useAuth();

  // The id the app signs in with — UNI_STAFF_ID, the OpenID auth id — which is
  // also what booking-room stores in tb_book.tb_user_id and meeting-room
  // resolves via CENTRAL.STAFF_INFO. `user` is AuthContext's effective user, so
  // a dev impersonation override is already applied here.
  const staffId = user?.staffId ?? '';

  const [items, setItems] = useState<UnifiedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!staffId) {
        setItems([]);
        setLoading(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const result = await listUnifiedBookings(staffId, 'current');
        setItems(result.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : TEXT.BOOKING_ROOM_CURRENT_ERROR);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [staffId],
  );

  // On focus rather than on mount: coming back from a booking/request form
  // should show the one that was just made, without a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // The room-type hub now sits between this button and either form — see
  // select-room-type.tsx and the plan this module was built from.
  const openNewBooking = useCallback(
    () => navPush('/booking-room/select-room-type' as Parameters<typeof navPush>[0]),
    [],
  );

  const addButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={TEXT.BOOKING_ROOM_ADD_BOOKING}
      onPress={openNewBooking}
      style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}>
      <IconSymbol name="plus" size={20} color={c.primary} />
      <ThemedText style={styles.addButtonText}>{TEXT.BOOKING_ROOM_ADD_BOOKING}</ThemedText>
    </Pressable>
  );

  // Whether the list is still being fetched — the same question `body()` asks
  // to decide on the loader. `loading` goes true again on every focus, so this
  // is also the state the screen passes through on the way back from a form.
  const listUnknown = loading || (authLoading && !staffId);

  // Nothing booked/requested yet → the dashed row above the list goes away and
  // the same action is drawn under the empty state's message instead, so the
  // one thing to do about an empty screen sits where the eye already is.
  const isEmpty = !listUnknown && Boolean(staffId) && !error && items.length === 0;

  // The row sits above the body rather than inside it, so unlike the loader it
  // would otherwise stay on screen while the list reloads — and for the half
  // second before an empty answer comes back it is the dashed row that shows,
  // then swaps for the button under the empty state. Which of the two is right
  // is not known until the list is, so neither is drawn until then.
  const showAddRow = !listUnknown && !isEmpty;

  const body = () => {
    if (loading || (authLoading && !staffId)) {
      return (
        <View style={styles.centered}>
          <InfinityLoader size={60} />
        </View>
      );
    }

    if (!staffId) {
      return <ErrorState variant="empty" art={null} message={TEXT.BOOKING_ROOM_NEED_SIGNIN} />;
    }

    if (error) {
      return (
        <ErrorState
          title={TEXT.BOOKING_ROOM_CURRENT_ERROR}
          message={error}
          onRetry={() => void load()}
        />
      );
    }

    if (items.length === 0) {
      return (
        <EmptyState
          preset="room"
          message={TEXT.BOOKING_ROOM_CURRENT_EMPTY}
          action={
            <Button title={TEXT.BOOKING_ROOM_ADD_BOOKING} icon="plus" onPress={openNewBooking} />
          }
        />
      );
    }

    return items.map((item) => (
      <ListCard
        key={item.id}
        icon={<IconSymbol name={item.icon} size={20} color={c.primary} />}
        title={item.title}
        badge={item.badge}
        // Kind then date — the same two-fact shape whichever system the row
        // came from, so a classroom row and a meeting-room row read as the
        // same kind of thing, not two kinds of card that happen to sit in one
        // list.
        meta={[
          { icon: <IconSymbol name={item.icon} size={13} color={c.textMuted} />, text: item.kindLabel },
          {
            icon: <IconSymbol name="calendar-range" size={13} color={c.textMuted} />,
            text: item.dateLabel,
          },
        ]}
        onPress={() => navPush(item.onPressRoute as Parameters<typeof navPush>[0])}
      />
    ));
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={TEXT.BOOKING_ROOM_TAB_CURRENT}
        backHref="/"
        titleInNavBar
        showHomeButton={false}
        rightContent={<BookingCartButton />}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={c.primary}
          />
        }>
        {showAddRow ? addButton : null}
        {body()}
      </ScrollView>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    // flexGrow so a short body — the loader, an empty state — can fill the
    // viewport and centre itself in it rather than sitting at the top.
    scroll: { padding: 16, paddingTop: 24, paddingBottom: 32, flexGrow: 1 },
    // Fills what is left of the screen so the loader sits in the middle of it,
    // not 48pt below whatever is above it.
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },

    // Copied in shape from the notice-repair list screen's add row: a dashed
    // outline reads as "there is nothing here yet, put something here", which
    // a solid filled button does not.
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 54,
      borderRadius: 12,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: c.primary,
      backgroundColor: c.primarySoft,
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    addButtonPressed: { opacity: 0.7 },
    addButtonText: {
      color: c.primary,
      fontSize: 15,
      lineHeight: 21,
      fontFamily: AppFonts.psuBold,
    },
  });
