/**
 * Booking Room → รายการจอง: the dates of one booking.
 *
 * This is the "วันและเวลาที่จอง" section of the booking detail, moved out into a
 * screen of its own. Nothing about it changed in the move: the same folded rule
 * cards ("ทุกวันพุธ 08:30-09:50 ห้อง A200"), the same grid of date chips behind
 * a tap, the same per-date cancel.
 *
 * Why a screen rather than a section: a term booking's slots run past sixty
 * rows, and everything above them on the detail screen — the reference number,
 * the subject, who booked it — is answering a different question. Splitting them
 * lets the detail stay a page you read and this stay a list you work in.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { InfinityLoader } from '@/components/infinity-loader';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast-provider';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { fill, groupSlots, SlotGroupCard } from '@/components/booking-room/slot-group-card';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  deleteMyBookingSlot,
  getMyBookingDetail,
  type MyBookingDetail,
} from '@/services/bookingRoomService';
import { formatFullDate } from '@/utils/date-format';

export default function BookingSlotsScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const params = useLocalSearchParams<{ book_id?: string; from?: string }>();

  const bookId = Array.isArray(params.book_id) ? params.book_id[0] : params.book_id;
  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  const staffId = user?.staffId ?? '';

  // Back to the booking this list belongs to, carrying `from` so that screen's
  // own back button still knows which tab the trip started in.
  const backHref = {
    pathname: '/booking-room/booking-detail',
    params: { book_id: String(bookId ?? ''), from: from ?? '' },
  } as unknown as Href;

  const [booking, setBooking] = useState<MyBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDate, setPendingDate] = useState<{ detailId: number; date: string } | null>(null);
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

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => groupSlots(booking?.slots ?? []), [booking]);

  /** The date awaiting confirmation, resolved back to its slot for the times. */
  const pendingSlot = useMemo(
    () =>
      pendingDate
        ? (booking?.slots ?? []).find((s) => s.detail_id === pendingDate.detailId)
        : undefined,
    [pendingDate, booking],
  );

  /**
   * Cancel one date, then reload in place.
   *
   * The exception is the last date: the server cancels the booking with it, so
   * there is nothing left to list and the screen leaves rather than reloading
   * into a 404.
   */
  const confirmDeleteDate = useCallback(async () => {
    if (!staffId || !pendingDate) return;

    setDeleting(true);
    try {
      const result = await deleteMyBookingSlot(staffId, pendingDate.detailId);
      setPendingDate(null);
      showToast(TEXT.BOOKING_ROOM_SLOT_DELETE_SUCCESS, 'success');

      if (result.booking_deleted) {
        router.replace((from === 'history' ? '/booking-room/history' : '/booking-room') as Href);
        return;
      }

      await load();
    } catch (err) {
      setPendingDate(null);
      showToast(err instanceof Error ? err.message : TEXT.BOOKING_ROOM_SLOT_DELETE_ERROR, 'error');
    } finally {
      setDeleting(false);
    }
  }, [staffId, pendingDate, showToast, router, from, load]);

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
        {groups.length === 0 ? (
          // A booking whose slots have all been removed: the screen is empty,
          // and a grey line at the top of it reads as a loading glitch rather
          // than as an answer.
          <EmptyState preset="schedule" message={TEXT.BOOKING_ROOM_DETAIL_NO_SLOTS} />
        ) : (
          groups.map((group) => (
            <SlotGroupCard
              key={group.key}
              group={group}
              canDelete={booking.can_delete}
              multiSlot={booking.slots.length > 1}
              onDeleteDate={(detailId, date) => setPendingDate({ detailId, date })}
            />
          ))
        )}
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={TEXT.BOOKING_ROOM_SLOT_LIST_TITLE}
        backHref={backHref}
        titleInNavBar
        showHomeButton={false}
        tone="primary"
      />
      {body()}

      {/* Cancelling a single date. Says which date and which hours, because a
          chip reads '14 ก.ย. 69' and the grid holds thirty of them — a tap on
          the wrong one should not be silently agreed to. */}
      <ConfirmDialog
        visible={pendingDate !== null}
        icon="xmark.circle"
        destructive
        loading={deleting}
        title={TEXT.BOOKING_ROOM_SLOT_DELETE_TITLE}
        message={
          pendingDate
            ? `${fill(TEXT.BOOKING_ROOM_SLOT_DELETE_MESSAGE, {
                date: formatFullDate(pendingDate.date),
                time: pendingSlot ? `${pendingSlot.start_time} - ${pendingSlot.end_time}` : '',
              })}${
                (booking?.slots.length ?? 0) === 1
                  ? `\n${TEXT.BOOKING_ROOM_SLOT_DELETE_LAST}`
                  : ''
              }`
            : ''
        }
        confirmLabel={TEXT.BOOKING_ROOM_DELETE_CONFIRM_YES}
        cancelLabel={TEXT.BOOKING_ROOM_DELETE_CONFIRM_NO}
        onConfirm={() => void confirmDeleteDate()}
        onCancel={() => setPendingDate(null)}
      />
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    // flexGrow so the empty state has a full screen to centre itself in; with
    // cards in the list it changes nothing.
    scroll: { flexGrow: 1, padding: 16, paddingTop: 16, paddingBottom: 32, gap: 12 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
