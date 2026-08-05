/**
 * Booking Room → รายการจอง (tab key: current_booking).
 *
 * The signed-in person's own bookings that have not finished yet, soonest
 * first, with a dashed button on top to make a new one — the same arrangement
 * notice-repair uses for "แจ้งซ่อม" above its list.
 *
 * A note on the source. The website page this screen was modelled on
 * (index.php?main=book_view&action=view) renders $_SESSION['book'] — the lines
 * someone has added in that browser session and not yet submitted. It reads no
 * table, so there is nothing for a phone to fetch. These rows come instead from
 * tb_book/tb_bookdetail, i.e. what was actually booked, which is what the
 * website's own "รายงานจองห้องของคุณ" page lists.
 */
import { useCallback, useState } from 'react';
import { InfinityLoader } from '@/components/infinity-loader';
import { useFocusEffect } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { ListCard } from '@/components/ui/list-card';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { listMyBookings, type MyBooking } from '@/services/bookingRoomService';
import { formatDateRange } from '@/utils/date-format';
import { navPush } from '@/utils/navigation';

/** Same three glyphs the type chooser uses, so a row points back at the form
 *  that made it. */
function bookingIcon(typeId: number): IconSymbolName {
  if (typeId === 2) return 'calendar-range';
  if (typeId === 3) return 'calendar-clock';
  return 'calendar';
}

export default function BookingRoomCurrentScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user, loading: authLoading } = useAuth();

  // The id the app signs in with — UNI_STAFF_ID, the OpenID auth id — which is
  // also what the booking website stores in tb_book.tb_user_id. `user` is
  // AuthContext's effective user, so a dev impersonation override is already
  // applied here and this cannot show one account's bookings under another's.
  const staffId = user?.staffId ?? '';

  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!staffId) {
        setBookings([]);
        setLoading(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        setBookings(await listMyBookings(staffId, 'current'));
      } catch (err) {
        setError(err instanceof Error ? err.message : TEXT.BOOKING_ROOM_CURRENT_ERROR);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [staffId],
  );

  // On focus rather than on mount: coming back from a booking form should show
  // the booking that was just made, without a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openNewBooking = useCallback(
    () => navPush('/booking-room/select-booking' as Parameters<typeof navPush>[0]),
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

  // Nothing booked yet → the dashed row above the list goes away and the same
  // action is drawn under the empty state's message instead, so the one thing
  // to do about an empty screen sits where the eye already is.
  const isEmpty = !listUnknown && Boolean(staffId) && !error && bookings.length === 0;

  // The row sits above the body rather than inside it, so unlike the loader it
  // would otherwise stay on screen while the list reloads — and for the half
  // second before an empty answer comes back it is the dashed row that shows,
  // then swaps for the button under the empty state. Which of the two is right
  // is not known until the list is, so neither is drawn until then.
  const showAddRow = !listUnknown && !isEmpty;

  const body = () => {
    // Still waiting on the session: without this the screen would flash the
    // "you have no bookings" message during sign-in, which is a different
    // statement from "we have not asked yet".
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

    if (bookings.length === 0) {
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

    return bookings.map((booking) => {
      // The slots' real span, falling back to the header's — a booking whose
      // detail rows were all removed still has the dates its form recorded.
      const from = booking.first_date || booking.start_date;
      const to = booking.last_date || booking.end_date;
      const dateLine = formatDateRange(from, to);

      return (
        <ListCard
          key={booking.book_id}
          icon={
            <IconSymbol name={bookingIcon(booking.booktype.id)} size={20} color={c.primary} />
          }
          title={booking.subject_id || booking.objective || TEXT.BOOKING_ROOM_ADD_BOOKING}
          // Three facts only — what it is, which kind of booking, and when it
          // runs. The type used to be a badge in the trailing corner, where it
          // competed with the chevron for the row's narrowest column; as a line
          // with its own glyph it reads at the same size, and in the same
          // shape, as everything else about the booking.
          meta={[
            {
              icon: (
                <IconSymbol
                  name={bookingIcon(booking.booktype.id)}
                  size={13}
                  color={c.textMuted}
                />
              ),
              text: booking.booktype.label,
            },
            {
              icon: <IconSymbol name="calendar-range" size={13} color={c.textMuted} />,
              text: dateLine,
            },
          ]}
          onPress={() =>
            navPush({
              pathname: '/booking-room/booking-detail',
              params: { book_id: String(booking.book_id) },
            } as Parameters<typeof navPush>[0])
          }
        />
      );
    });
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={TEXT.BOOKING_ROOM_TAB_CURRENT}
        backHref="/"
        titleInNavBar
        showHomeButton={false}
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
