/**
 * Booking Room → รายละเอียดการจอง.
 *
 * One booking with every room-and-time slot it holds — the mobile form of the
 * website's index.php?main=reportdetail page.
 *
 * The slot list used to be one dated timeline row per slot, and on real data
 * that was unreadable. Booking 41411 is thirty-two slots that are really two
 * sentences: Wednesdays 09:00–10:20 in CE109, sixteen times, and Thursdays
 * 10:30–11:50 in CE105, sixteen times. Thirty-two date headings said the same
 * thing at fifteen times the length, and the median term booking has eighteen
 * slots with the ninetieth percentile at forty-eight — so that was the normal
 * case, not an outlier.
 *
 * The rows are therefore folded back into the rule that created them: one card
 * per weekday+time+room, with the individual dates a tap away. That is also
 * exactly what the person filled into the booking form, so the screen reads
 * back what they entered rather than the machine's expansion of it. The list is
 * headed by the booking type, because which of the three forms was filled in is
 * what decides whether there is one date here or sixty.
 *
 * Reached from either list tab. Owner-scoped on the server: a book_id that is
 * not the signed-in person's answers 404 like one that does not exist, so this
 * screen needs no permission logic of its own.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { InfinityLoader } from '@/components/infinity-loader';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { useToast } from '@/components/toast-provider';
import { ScreenHeader } from '@/components/screen-header';
import { SectionCard } from '@/components/section-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { BookingTypeStrip } from '@/components/booking-room/booking-type-strip';
import { todayISO, fill } from '@/components/booking-room/slot-group-card';
import { DetailInfoCard, type DetailRow } from '@/components/ui/detail-info-card';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  deleteMyBooking,
  getMyBookingDetail,
  type MyBookingDetail,
} from '@/services/bookingRoomService';
import { formatDateRange, formatDateTime, formatFullDate } from '@/utils/date-format';

export default function BookingDetailScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const params = useLocalSearchParams<{ book_id?: string; from?: string }>();

  const bookId = Array.isArray(params.book_id) ? params.book_id[0] : params.book_id;
  const staffId = user?.staffId ?? '';

  // Two lists lead here — รายการจอง and เสร็จสิ้น — and back has to return to
  // whichever one was left. The caller says which by passing `from`; anything
  // else falls back to รายการจอง, which is the tab a deep link or a
  // notification should land on.
  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  const backHref: Href = from === 'completed' ? '/booking-room/completed' : '/booking-room';

  const [booking, setBooking] = useState<MyBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const load = useCallback(async () => {
    if (!staffId || !bookId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setBooking(await getMyBookingDetail(staffId, bookId));
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXT.BOOKING_ROOM_DETAIL_ERROR);
    } finally {
      setLoading(false);
    }
  }, [staffId, bookId]);

  // On mount, not on focus: a booking detail is a fixed record, so unlike the
  // list tabs there is nothing to be stale about.
  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Cancel the booking, then leave.
   *
   * Back to the list rather than staying on a screen describing something that
   * no longer exists — the list is also where the result is visible, since the
   * row is gone from it. The toast carries the confirmation, because by the
   * time it shows, this screen is not on top any more.
   */
  const confirmDelete = useCallback(async () => {
    if (!staffId || !bookId) return;

    setDeleting(true);
    try {
      await deleteMyBooking(staffId, bookId);
      setConfirmOpen(false);
      showToast(TEXT.BOOKING_ROOM_DELETE_SUCCESS, 'success');
      router.replace(backHref);
    } catch (err) {
      setConfirmOpen(false);
      // The server's own wording: a 403 explains that this booking is not this
      // person's to cancel, which a generic failure would not.
      showToast(err instanceof Error ? err.message : TEXT.BOOKING_ROOM_DELETE_ERROR, 'error');
    } finally {
      setDeleting(false);
    }
  }, [staffId, bookId, showToast, router, backHref]);

  /**
   * Is there anything left to cancel?
   *
   * A booking whose last date has passed is a record, not a reservation: the
   * rooms it held are long free again, and cancelling it would only erase the
   * evidence that it happened. The server still allows it — the website's own
   * delete has no date rule and an admin clearing up bad data needs it — so
   * this is the app declining to offer the action, not a rule being enforced
   * twice.
   *
   * Judged on the dates, not on which tab the screen was opened from: a
   * booking can finish while it is on screen, and the list it came from does
   * not decide what it is.
   */
  const finished = useMemo(() => {
    if (!booking) return false;
    const last = booking.last_date || booking.end_date;
    return Boolean(last) && last < todayISO();
  }, [booking]);

  /** How many rooms the whole booking touches — the header's second fact. */
  const roomCount = useMemo(
    () => new Set((booking?.slots ?? []).map((s) => s.room_id)).size,
    [booking],
  );

  /**
   * The next date still to come, or '' once they have all passed.
   *
   * Read off the slots rather than the header's own dates: a booking can have
   * had its early dates cancelled one by one, and the header's start date does
   * not move when that happens.
   */
  const nextDate = useMemo(() => {
    const today = todayISO();
    return (booking?.slots ?? [])
      .map((s) => s.date)
      .filter((d) => d >= today)
      .sort()[0] ?? '';
  }, [booking]);

  const infoRows = (b: MyBookingDetail): DetailRow[] => {
    const term = [b.term, b.year].filter(Boolean).join('/');

    // Widest to narrowest scope: the term the booking sits in, then what it is
    // for, then who owns it, then when it was made. Software stays last — it is
    // present on a minority of bookings and belongs to none of that sequence.
    return [
      { label: TEXT.BOOKING_ROOM_TERM_LABEL, value: term === '/' ? '' : term },
      { label: TEXT.BOOKING_ROOM_SUBJECT_LABEL, value: b.subject_id },
      // The website writes '-' into these when a booking is ad-hoc rather than
      // for a registered subject. A dash is not information, so it is dropped
      // and DetailInfoCard drops the row with it.
      { label: TEXT.BOOKING_ROOM_OBJECTIVE_LABEL, value: meaningful(b.objective) },
      { label: TEXT.BOOKING_ROOM_SECTION_LABEL, value: meaningful(b.section) },
      { label: TEXT.BOOKING_ROOM_TEACHER_LABEL, value: b.teacher },
      { label: TEXT.BOOKING_ROOM_BOOKED_AT_LABEL, value: bookedAtText(b.booked_at) },
      { label: TEXT.BOOKING_ROOM_SOFTWARE_LABEL, value: meaningful(b.software) },
    ];
  };

  const body = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <InfinityLoader size={60} />
        </View>
      );
    }

    if (error || !booking) {
      return (
        <ErrorState
          title={TEXT.BOOKING_ROOM_DETAIL_ERROR}
          message={error ?? ''}
          onRetry={() => void load()}
        />
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <DetailInfoCard
          title={TEXT.BOOKING_ROOM_DETAIL_INFO}
          // The booking type as a badge rather than a labelled row: it is one
          // word out of three fixed values, which is what a badge is for, and
          // the same treatment the list rows already give it.
          trailing={
            <View style={styles.typeBadge}>
              <ThemedText style={styles.typeText}>{booking.booktype.label}</ThemedText>
            </View>
          }
          rows={infoRows(booking)}
        />

        <SectionCard
          title={TEXT.BOOKING_ROOM_DETAIL_SLOTS}
          trailing={
            booking.slots.length > 0 ? (
              <ThemedText style={styles.slotTotal}>
                {fill(TEXT.BOOKING_ROOM_SLOT_TOTAL, { count: booking.slots.length })}
                {roomCount > 1
                  ? ` · ${fill(TEXT.BOOKING_ROOM_SLOT_ROOM_COUNT, { count: roomCount })}`
                  : ''}
              </ThemedText>
            ) : null
          }
          style={styles.slotCard}>
          <BookingTypeStrip code={booking.booktype.code} label={booking.booktype.label} />

          {booking.slots.length === 0 ? (
            <ThemedText style={styles.noSlots}>{TEXT.BOOKING_ROOM_DETAIL_NO_SLOTS}</ThemedText>
          ) : (
            <>
              {/* The shape of the booking without the dates themselves: when it
                  runs, where, and when the next one is. Enough to answer the
                  question most people open this screen with; the list behind
                  the link answers the rest. */}
              <View style={styles.overview}>
                <View style={styles.overviewRow}>
                  <IconSymbol name="calendar-range" size={15} color={c.textMuted} />
                  <ThemedText style={styles.overviewText}>
                    {formatDateRange(
                      booking.first_date || booking.start_date,
                      booking.last_date || booking.end_date,
                    )}
                  </ThemedText>
                </View>

                <View style={styles.overviewRow}>
                  <IconSymbol name="door.open" size={15} color={c.textMuted} />
                  <ThemedText style={styles.overviewText} numberOfLines={2}>
                    {booking.rooms.join(', ')}
                  </ThemedText>
                </View>

                {nextDate ? (
                  <View style={styles.overviewRow}>
                    <IconSymbol name="calendar-clock" size={15} color={c.primary} />
                    <ThemedText style={styles.overviewNext}>
                      {fill(TEXT.BOOKING_ROOM_SLOT_NEXT, { date: formatFullDate(nextDate) })}
                    </ThemedText>
                  </View>
                ) : (
                  <View style={styles.overviewRow}>
                    <IconSymbol name="calendar-clock" size={15} color={c.textMuted} />
                    <ThemedText style={styles.overviewText}>
                      {TEXT.BOOKING_ROOM_SLOT_FINISHED}
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* The dates themselves are a screen of their own — see
                  booking-slots. Outlined in the brand colour: the outline is
                  what separates it from the solid red cancel below, so going
                  somewhere and changing something still do not look alike. */}
              <Button
                title={fill(TEXT.BOOKING_ROOM_SLOT_SHOW_ALL, {
                  count: booking.slots.length,
                })}
                variant="primaryOutline"
                icon="calendar"
                onPress={() =>
                  router.push({
                    pathname: '/booking-room/booking-slots',
                    params: { book_id: String(bookId), from: from ?? '' },
                  } as unknown as Href)
                }
                style={styles.allSlots}
              />
            </>
          )}
        </SectionCard>

        {/* Cancelling sits at the foot of what it would cancel, not in the nav
            bar: a term booking is sixty dates and the decision should follow
            reading them. Drawn only when the server says this person may, and
            only while there is still something to cancel. */}
        {booking.can_delete && !finished ? (
          <Button
            title={TEXT.BOOKING_ROOM_DELETE_ACTION}
            // Solid red: the only action on the screen that changes anything,
            // and it is guarded by a confirm, so it can carry the weight.
            variant="danger"
            icon="trash.fill"
            onPress={() => setConfirmOpen(true)}
            loading={deleting}
            style={styles.deleteButton}
          />
        ) : null}
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* The reference number is the screen's identity, so it belongs in the
          nav bar rather than as the first row of a card. It comes from the
          route params, which means it is there before the fetch lands — the
          header never shows a placeholder that later changes. */}
      <ScreenHeader
        title={
          bookId
            ? `${TEXT.BOOKING_ROOM_REF_ID_SHORT} ${bookId}`
            : TEXT.BOOKING_ROOM_DETAIL_TITLE
        }
        backHref={backHref}
        titleInNavBar
        showHomeButton={false}
        tone="primary"
      />
      {body()}

      {/* The count is the whole reason this confirm exists: one term booking is
          thirty-two dates, and "cancel this booking" reads like one. */}
      <ConfirmDialog
        visible={confirmOpen}
        icon="trash.fill"
        destructive
        loading={deleting}
        title={TEXT.BOOKING_ROOM_DELETE_CONFIRM_TITLE}
        message={
          (booking?.slots.length ?? 0) > 1
            ? fill(TEXT.BOOKING_ROOM_DELETE_CONFIRM_MANY, { count: booking?.slots.length ?? 0 })
            : TEXT.BOOKING_ROOM_DELETE_CONFIRM_ONE
        }
        confirmLabel={TEXT.BOOKING_ROOM_DELETE_CONFIRM_YES}
        cancelLabel={TEXT.BOOKING_ROOM_DELETE_CONFIRM_NO}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirmOpen(false)}
      />

    </ThemedView>
  );
}

/** '' for the placeholders the booking forms write when a field is unused. */
function meaningful(value: string) {
  const trimmed = (value ?? '').trim();
  return trimmed === '-' ? '' : trimmed;
}

/**
 * "จองเมื่อ" with the clock time only when there is one.
 *
 * booktime is a timestamp, but rows imported or written without a time land on
 * exactly midnight — and "5 มีนาคม 2569 - 0:00" reads as a real 12am booking
 * rather than as a missing value. Anything else keeps its time.
 */
function bookedAtText(value: string) {
  if (!value) return '';
  return /[ T]0?0:00(:00)?$/.test(value.trim())
    ? formatFullDate(value)
    : formatDateTime(value);
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scroll: { padding: 16, paddingTop: 20, paddingBottom: 32, gap: 16 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    // Set apart from the cards above it: a destructive action reached by
    // scrolling past everything it destroys should not look like the next card
    // in the stack.
    deleteButton: { marginTop: 8 },

    // Same pill the absence and repair detail screens use for their status
    // badge, so a badge in a card header looks the same everywhere.
    typeBadge: {
      borderRadius: 9999,
      paddingHorizontal: 12,
      paddingVertical: 5,
      backgroundColor: c.primarySoft,
      flexShrink: 0,
    },
    typeText: {
      fontFamily: AppFonts.psuBold,
      fontSize: 13,
      lineHeight: 18,
      color: c.primary,
    },

    slotCard: { gap: 16 },
    slotTotal: { fontSize: 13, lineHeight: 18, color: c.textMuted },
    noSlots: { fontSize: 15, color: c.textMuted, paddingVertical: 12 },

    // The one action in the card, spaced off the facts it follows. The shape
    // and colour come from the shared Button — nothing to restyle here.
    allSlots: { marginTop: 8 },

    // The booking's shape without its dates: three quiet facts, then the way
    // through to the dates themselves.
    overview: { gap: 12 },
    overviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    overviewText: { flex: 1, fontSize: 14, lineHeight: 21, color: c.text },
    overviewNext: {
      flex: 1,
      fontSize: 14,
      lineHeight: 21,
      color: c.primary,
      fontFamily: AppFonts.psuBold,
    },
  });
