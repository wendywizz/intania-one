/**
 * Meeting Room → รายละเอียดคำขอใช้ห้องประชุม.
 *
 * A separate screen from booking-detail.tsx on purpose — see the plan this
 * module was built from: the two data shapes (equipment/leader/approval vs
 * subject/teacher) are different enough that a shared screen would be mostly
 * branches. Reached from the same merged current/history list row either way
 * (services/roomBookingAggregator.ts decides which detail screen a row opens).
 *
 * Owner-scoped on the server: an order_id that is not the signed-in person's
 * answers 404 like one that does not exist, so this screen needs no
 * permission logic of its own.
 */
import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { InfinityLoader } from '@/components/infinity-loader';
import { useToast } from '@/components/toast-provider';
import { ScreenHeader } from '@/components/screen-header';
import { SectionCard } from '@/components/section-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DetailInfoCard, DetailRows, type DetailRow } from '@/components/ui/detail-info-card';
import { fill } from '@/components/booking-room/slot-group-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PersonRow } from '@/components/ui/person-row';
import {
  getMeetingRoomStatusBadge,
  shortMeetingRoomStatus,
} from '@/components/meeting-room/status-badge';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { useContentBottomPadding } from "@/hooks/use-action-bar-padding";
import { useAuth } from '@/context/AuthContext';
import {
  cancelMeetingRoomRequest,
  getMeetingRoomRequestDetail,
  type MeetingRoomRequestDetail,
} from '@/services/meetingRoomService';
import { formatDateRange, formatFullDate } from '@/utils/date-format';

/** Mirrors Request_Order_Model::CANCELLED_STATUS on the server. */
const CANCELLED_STATUS = 90;
/** Mirrors cancel_request()'s own tier boundary. */
const HARD_DELETE_STATUS_MAX = 3;

export default function MeetingRoomDetailScreen() {
  const c = useColors();
  const contentBottomPadding = useContentBottomPadding(32);
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const params = useLocalSearchParams<{ order_id?: string; from?: string }>();

  const orderId = Array.isArray(params.order_id) ? params.order_id[0] : params.order_id;
  const staffId = user?.staffId ?? '';

  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  const backHref: Href = from === 'completed' ? '/booking-room/completed' : '/booking-room';

  const [request, setRequest] = useState<MeetingRoomRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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

  // On mount, not on focus — a request's own record does not go stale while
  // this screen is open, the same reasoning booking-detail.tsx uses.
  useEffect(() => {
    void load();
  }, [load]);

  const confirmCancel = useCallback(async () => {
    if (!staffId || !orderId) return;

    setCancelling(true);
    try {
      await cancelMeetingRoomRequest(staffId, orderId);
      setConfirmOpen(false);
      showToast(TEXT.MEETING_ROOM_CANCEL_SUCCESS, 'success');
      router.replace(backHref);
    } catch (err) {
      setConfirmOpen(false);
      showToast(err instanceof Error ? err.message : TEXT.MEETING_ROOM_CANCEL_ERROR, 'error');
    } finally {
      setCancelling(false);
    }
  }, [staffId, orderId, showToast, router, backHref]);

  const status = request?.status ?? 0;
  const canCancel = status < CANCELLED_STATUS;
  const isHardDelete = status <= HARD_DELETE_STATUS_MAX;

  // Same icon + label-above-value rows as timestamp/history-detail.
  const infoRows = (r: MeetingRoomRequestDetail): DetailRow[] => [
    { label: TEXT.MEETING_ROOM_FORM_PURPOSE_LABEL, value: r.detail ?? "", icon: "list.bullet" },
    // The badge shows a shortened status; the full wording lives here, and only
    // when it actually says more than the badge does.
    {
      label: TEXT.MEETING_ROOM_DETAIL_STATUS_LABEL,
      value:
        r.status_label && shortMeetingRoomStatus(r.status_label) !== r.status_label.trim()
          ? r.status_label.trim()
          : "",
      icon: "info.circle.fill",
    },
    { label: TEXT.MEETING_ROOM_FORM_TYPE_LABEL, value: r.type_name ?? "", icon: "tag.fill" },
      { label: TEXT.MEETING_ROOM_FORM_MAN_LABEL, value: r.total_man ? String(r.total_man) : "", icon: "person.2.fill" },
      { label: TEXT.MEETING_ROOM_DETAIL_REQUEST_DATE_LABEL, value: r.request_date ? formatFullDate(r.request_date) : "", icon: "calendar" },
    { label: TEXT.MEETING_ROOM_FORM_COMMENT_LABEL, value: r.comment ?? "", icon: "text.bubble" },
  ];

  // Where and when: the room, then a date row and a time row per slot. With
  // several slots the labels carry the slot's number, which also keeps
  // DetailRows' label keys unique.
  const usageRows = (r: MeetingRoomRequestDetail): DetailRow[] => {
    const many = r.dates.length > 1;
    return [
      { label: TEXT.MEETING_ROOM_FORM_ROOM_LABEL, value: r.room_name ?? "", icon: "presentation" },
      ...r.dates.flatMap((d, i): DetailRow[] => {
        const n = many ? ` (${i + 1})` : "";
        return [
          { label: TEXT.MEETING_ROOM_DETAIL_DATE_LABEL + n, value: formatFullDate(d.date), icon: "calendar" },
          { label: TEXT.MEETING_ROOM_DETAIL_TIME_LABEL + n, value: `${d.start_time} – ${d.end_time} น.`, icon: "clock.fill" },
        ];
      }),
    ];
  };

  /** First to last day of the request, e.g. '18 - 20 กรกฎาคม 2569'. */
  const dateSpan = (r: MeetingRoomRequestDetail) => {
    const days = r.dates.map((d) => d.date).sort();
    return days.length ? formatDateRange(days[0], days[days.length - 1]) : '';
  };

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

    const badge = request.status_label ? getMeetingRoomStatusBadge(request.status_label) : null;
    const collapseDates = from !== 'completed' && request.dates.length > 1;

    return (
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: contentBottomPadding }]} showsVerticalScrollIndicator={false}>
        {/* Request info — the same titled card, header badge and icon rows as
            timestamp/history-detail. */}
        <DetailInfoCard
          title={TEXT.MEETING_ROOM_DETAIL_INFO}
          trailing={
            badge ? (
              <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                <ThemedText style={[styles.statusText, { color: badge.color }]}>
                  {badge.text}
                </ThemedText>
              </View>
            ) : null
          }
          rows={infoRows(request)}
        />

        {/* From รายการจอง, a request covering several days shows only the room
            and the span here; the days themselves are a screen of their own
            (meeting-room-booked-dates), the same split booking-detail makes for
            a classroom booking's slots. History still lists them inline. */}
        {collapseDates ? (
          <SectionCard title={TEXT.MEETING_ROOM_DETAIL_USAGE}>
            <DetailRows
              rows={[
                { label: TEXT.MEETING_ROOM_FORM_ROOM_LABEL, value: request.room_name ?? '', icon: 'presentation' },
                { label: TEXT.MEETING_ROOM_DETAIL_DATE_SPAN_LABEL, value: dateSpan(request), icon: 'calendar-range' },
              ]}
            />
            <Button
              title={fill(TEXT.MEETING_ROOM_DETAIL_SHOW_DATES, { count: request.dates.length })}
              variant="primaryOutline"
              icon="calendar"
              style={styles.showDates}
              onPress={() =>
                router.push({
                  pathname: '/booking-room/meeting-room-booked-dates',
                  params: { order_id: String(orderId), ...(from ? { from } : {}) },
                } as unknown as Href)
              }
            />
          </SectionCard>
        ) : (
          <DetailInfoCard title={TEXT.MEETING_ROOM_DETAIL_USAGE} rows={usageRows(request)} />
        )}

        {/* Its own card, like the approver on every other module's detail
            screen. The API names the leader but sends no id for them, so the
            avatar is the placeholder portrait. */}
        {request.leader_name ? (
          <SectionCard title={TEXT.MEETING_ROOM_DETAIL_LEADER_LABEL}>
            <PersonRow name={request.leader_name} />
          </SectionCard>
        ) : null}

        {request.things.length > 0 ? (
          <SectionCard title={TEXT.MEETING_ROOM_DETAIL_THINGS} style={styles.card}>
            {request.things.map((t, index) => (
              <View key={`${t.thing_type}-${t.thing_id}-${index}`} style={styles.dateRow}>
                <IconSymbol
                  name={t.thing_type === 1 ? 'mic' : 'chair'}
                  size={15}
                  color={c.textMuted}
                />
                <ThemedText style={styles.dateText}>
                  {t.name ?? ''} × {t.total}
                </ThemedText>
              </View>
            ))}
          </SectionCard>
        ) : null}

        {canCancel ? (
          <Button
            title={TEXT.MEETING_ROOM_CANCEL_ACTION}
            variant="danger"
            icon="trash.fill"
            onPress={() => setConfirmOpen(true)}
            loading={cancelling}
            style={styles.cancelButton}
          />
        ) : null}
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={
          orderId
            ? `${TEXT.MEETING_ROOM_HUB_CARD_TITLE} #${orderId}`
            : TEXT.MEETING_ROOM_DETAIL_TITLE
        }
        backHref={backHref}
        titleInNavBar
        tone="primary"
      />
      {body()}

      <ConfirmDialog
        visible={confirmOpen}
        icon="trash.fill"
        destructive
        loading={cancelling}
        title={TEXT.MEETING_ROOM_CANCEL_CONFIRM_TITLE}
        message={
          isHardDelete
            ? TEXT.MEETING_ROOM_CANCEL_CONFIRM_EARLY
            : TEXT.MEETING_ROOM_CANCEL_CONFIRM_LATE
        }
        confirmLabel={TEXT.MEETING_ROOM_CANCEL_ACTION}
        cancelLabel={TEXT.CANCEL}
        onConfirm={() => void confirmCancel()}
        onCancel={() => setConfirmOpen(false)}
      />
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
    scroll: { padding: 16, paddingBottom: 32, gap: 12 },
    card: { gap: 8 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    dateText: { fontSize: 14, color: c.text, fontFamily: AppFonts.psuRegular },
    // Same pill as timestamp/history-detail's header badge.
    statusBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 9999,
    },
    statusText: { fontSize: 12, lineHeight: 16, fontFamily: AppFonts.psuBold },
    // Same gap booking-detail leaves above its "show all slots" button.
    showDates: { marginTop: 8 },
    cancelButton: { marginTop: 8 },
  });
