/**
 * Booking Room → รายการจอง → meeting-room request → วันที่จอง.
 *
 * The dates of one multi-day meeting-room request, moved off the detail
 * screen the same way booking-slots.tsx moves a classroom booking's dates off
 * booking-detail.tsx: a request covering a week of days would otherwise bury
 * the approver and the cancel button under a dozen date/time rows. Only the
 * current tab's detail links here — see meeting-room-detail.tsx.
 *
 * Read-only: meeting-room cancels a whole request, never a single day, so
 * there is no per-date action to offer.
 */
import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, type Href } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { InfinityLoader } from '@/components/infinity-loader';
import { ScreenHeader } from '@/components/screen-header';
import { SectionCard } from '@/components/section-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fill } from '@/components/booking-room/slot-group-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { useContentBottomPadding } from '@/hooks/use-action-bar-padding';
import { useAuth } from '@/context/AuthContext';
import {
  getMeetingRoomRequestDetail,
  type MeetingRoomRequestDetail,
} from '@/services/meetingRoomService';
import { formatFullDate, formatWeekday } from '@/utils/date-format';

export default function MeetingRoomBookedDatesScreen() {
  const c = useColors();
  const contentBottomPadding = useContentBottomPadding(32);
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const params = useLocalSearchParams<{ order_id?: string; from?: string }>();

  const orderId = Array.isArray(params.order_id) ? params.order_id[0] : params.order_id;
  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  const staffId = user?.staffId ?? '';

  // Back to the request this list belongs to, carrying `from` so that screen's
  // own back button still knows which tab the trip started in.
  const backHref = {
    pathname: '/booking-room/meeting-room-detail',
    params: { order_id: String(orderId ?? ''), ...(from ? { from } : {}) },
  } as unknown as Href;

  const [request, setRequest] = useState<MeetingRoomRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetched again rather than handed over in params: the detail is small and
  // owner-scoped, and a deep link or a reload here then still works.
  const load = useCallback(async () => {
    if (!staffId || !orderId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setRequest(await getMeetingRoomRequestDetail(staffId, orderId));
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXT.MEETING_ROOM_DETAIL_ERROR);
    } finally {
      setLoading(false);
    }
  }, [staffId, orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const body = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <InfinityLoader size={60} />
        </View>
      );
    }

    if (error || !request) {
      return (
        <ErrorState
          title={TEXT.MEETING_ROOM_DETAIL_ERROR}
          message={error ?? ''}
          onRetry={() => void load()}
        />
      );
    }

    return (
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: contentBottomPadding }]}
        showsVerticalScrollIndicator={false}>
        <SectionCard
          title={request.room_name ?? TEXT.MEETING_ROOM_FORM_ROOM_LABEL}
          trailing={
            <ThemedText style={styles.total}>
              {fill(TEXT.MEETING_ROOM_DATES_TOTAL, { count: request.dates.length })}
            </ThemedText>
          }>
          {request.dates.map((d, index) => (
            <View
              key={d.count}
              style={[styles.row, index === request.dates.length - 1 && styles.rowLast]}>
              <View style={styles.dayBadge}>
                <ThemedText style={styles.dayIndex}>{index + 1}</ThemedText>
              </View>
              <View style={styles.rowText}>
                <ThemedText style={styles.date}>
                  {formatWeekday(d.date)} {formatFullDate(d.date)}
                </ThemedText>
                <View style={styles.timeRow}>
                  <IconSymbol name="clock.fill" size={13} color={c.textMuted} />
                  <ThemedText style={styles.time}>
                    {d.start_time} – {d.end_time} น.
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}
        </SectionCard>
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={TEXT.MEETING_ROOM_DATES_TITLE}
        backHref={backHref}
        titleInNavBar
        tone="primary"
      />
      {body()}
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
    scroll: { flexGrow: 1, padding: 16, gap: 12 },
    total: { fontSize: 12, lineHeight: 16, color: c.textMuted },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowLast: { borderBottomWidth: 0 },
    dayBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primarySoft,
    },
    dayIndex: { fontSize: 13, lineHeight: 16, fontFamily: AppFonts.psuBold, color: c.primary },
    rowText: { flex: 1, gap: 2 },
    date: { fontSize: 15, lineHeight: 22, fontFamily: AppFonts.psuRegular, color: c.text },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    time: { fontSize: 13, lineHeight: 18, color: c.textMuted },
  });
