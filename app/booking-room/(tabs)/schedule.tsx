/**
 * Booking Room → ตารางจอง (tab key: booking_schedule).
 *
 * One room's week, whichever room-booking system owns it — classroom rooms
 * from booking-room, meeting rooms (ห้องประชุมดงยาง, มงคลสุข, S307, ...) from
 * meeting-room, in the same picker and the same timeline view. Kept as one
 * shared tab rather than split by system: unlike the current/history tabs,
 * splitting this one would mean the schedule tab silently "not covering"
 * whichever system it currently isn't showing, which only gets more visible
 * as a third room-booking system (studio) joins the other two.
 *
 * Confirmed the two systems' rooms are genuinely disjoint sets (classroom's
 * tb_room does hold a few department-level ห้องประชุม of its own — EEMEETINGROOM,
 * IEMEET1-3 — but those are a different, smaller class of room than the
 * faculty-level ones meeting-room manages) — so the picker can offer both
 * lists side by side with no id collision, as long as each option's id stays
 * namespaced by kind (see `roomKey`/`splitRoomKey` below).
 *
 * Shows the same week the website's roombook page shows — one room, Monday to
 * Sunday — but not the same way. That page is a 32-column grid (07:00–23:00 in
 * half-hours) which works on a projector and not at all on a phone. The data is
 * identical; here each day is a section and its bookings run down a timeline —
 * the same EventTimelineItem the meeting screens use, so a day of bookings reads
 * like a day of meetings rather than like a third kind of list.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { InfinityLoader } from '@/components/infinity-loader';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { DatePickerField } from '@/components/date-picker-field';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { EventTimelineItem } from '@/components/ui';
import { SelectSheet } from '@/components/ui/select-sheet';
import { AppFonts } from '@/constants/fonts';
import { boxShadow } from '@/constants/shadows';
import { TEXT } from '@/constants/text';
import { LightColors, useColors, useThemedStyles } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  getRoomWeekSchedule,
  listBookingRooms,
  type BookingRoom,
} from '@/services/bookingRoomService';
import {
  getMeetingRoomOptions,
  getMeetingRoomWeek,
  type MeetingRoomOption,
} from '@/services/meetingRoomService';

const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

/** Which system a picked room belongs to — carried in the room id itself
 *  (`classroom:5` / `meeting-room:6`) so the two id-spaces never collide. */
type RoomKind = 'classroom' | 'meeting-room';

type UnifiedRoom = { key: string; kind: RoomKind; nativeId: string; name: string; capacity: number };

type UnifiedWeekBooking = {
  key: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  subtitle: string;
  color?: string;
};

type UnifiedWeekSchedule = {
  room: UnifiedRoom | null;
  week: { start: string; end: string; dates: string[] };
  bookings: UnifiedWeekBooking[];
};

function roomKey(kind: RoomKind, nativeId: string): string {
  return `${kind}:${nativeId}`;
}

function splitRoomKey(key: string): { kind: RoomKind; nativeId: string } {
  const [kind, ...rest] = key.split(':');
  return { kind: kind as RoomKind, nativeId: rest.join(':') };
}

function toUnifiedClassroomRoom(room: BookingRoom): UnifiedRoom {
  return { key: roomKey('classroom', room.id), kind: 'classroom', nativeId: room.id, name: room.name, capacity: room.capacity };
}

function toUnifiedMeetingRoom(room: MeetingRoomOption): UnifiedRoom {
  return {
    key: roomKey('meeting-room', String(room.id)),
    kind: 'meeting-room',
    nativeId: String(room.id),
    name: room.name,
    capacity: room.arrangements[0]?.capacity ?? 0,
  };
}

/** The booking's own colour, or nothing — classroom bookings carry one,
 *  meeting-room requests don't (there is no equivalent field server-side). */
function bookingColor(value?: string) {
  const hex = (value ?? '').trim();
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return undefined;
  return hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
}

function withAlpha(hex: string, alpha: number) {
  const aa = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${aa}`;
}

function parseDate(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function toISODate(date: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function shiftDays(iso: string, days: number) {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function weekLabel(start: string, end: string) {
  const a = parseDate(start);
  const b = parseDate(end);
  const year = b.getFullYear() + 543;
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${THAI_MONTHS[b.getMonth()]} ${year}`
    : `${a.getDate()} ${THAI_MONTHS[a.getMonth()]} – ${b.getDate()} ${THAI_MONTHS[b.getMonth()]} ${year}`;
}

function roomLabel(room?: UnifiedRoom | null) {
  if (!room) return undefined;
  return room.capacity > 0
    ? `${room.name} (${room.capacity} ${TEXT.BOOKING_ROOM_SCHEDULE_SEAT_UNIT})`
    : room.name;
}

export default function BookingRoomScheduleScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const staffId = user?.staffId ?? '';

  const [anchorDate, setAnchorDate] = useState(() => toISODate(new Date()));
  const [roomSelection, setRoomSelection] = useState<string | undefined>(undefined);

  const [schedule, setSchedule] = useState<UnifiedWeekSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rooms, setRooms] = useState<UnifiedRoom[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(
    async (selection?: string) => {
      const current = selection ?? roomSelection;

      setLoading((wasLoading) => wasLoading);
      setError(null);

      try {
        let data: UnifiedWeekSchedule;

        if (current) {
          const { kind, nativeId } = splitRoomKey(current);
          if (kind === 'meeting-room') {
            const week = await getMeetingRoomWeek(nativeId, anchorDate);
            data = {
              room: { key: current, kind, nativeId, name: week.room.name, capacity: 0 },
              week: week.week,
              bookings: week.bookings.map((b, i) => ({
                key: `${b.date}-${b.start_time}-${i}`,
                date: b.date,
                startTime: b.start_time,
                endTime: b.end_time,
                title: b.title,
                subtitle: b.requester ?? '',
              })),
            };
          } else {
            const week = await getRoomWeekSchedule(nativeId, anchorDate);
            data = {
              room: toUnifiedClassroomRoom(week.room),
              week: week.week,
              bookings: week.bookings.map((b) => ({
                key: String(b.detail_id),
                date: b.date,
                startTime: b.start_time,
                endTime: b.end_time,
                title: b.section ? `${b.subject_id} (${b.section})` : b.subject_id,
                subtitle: b.teacher || b.objective || '',
                color: bookingColor(b.bgcolor),
              })),
            };
          }
        } else {
          // Cold start: no room chosen yet — default to the classroom
          // schedule's own default room, matching what happened before this
          // screen knew about a second system.
          const week = await getRoomWeekSchedule(undefined, anchorDate);
          data = {
            room: toUnifiedClassroomRoom(week.room),
            week: week.week,
            bookings: week.bookings.map((b) => ({
              key: String(b.detail_id),
              date: b.date,
              startTime: b.start_time,
              endTime: b.end_time,
              title: b.section ? `${b.subject_id} (${b.section})` : b.subject_id,
              subtitle: b.teacher || b.objective || '',
              color: bookingColor(b.bgcolor),
            })),
          };
        }

        setSchedule(data);
        if (!current && data.room) setRoomSelection(data.room.key);
      } catch (err) {
        setError(err instanceof Error ? err.message : TEXT.BOOKING_ROOM_SCHEDULE_LOAD_ERROR);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [anchorDate, roomSelection],
  );

  useEffect(() => {
    setLoading(true);
    void load();
    // Deliberately excludes `load` — this should only re-run when the anchor
    // date or the chosen room actually changes, not on every render load()
    // itself is recreated for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorDate, roomSelection]);

  const openPicker = useCallback(async () => {
    setPickerOpen(true);
    if (rooms.length === 0) {
      try {
        const [classroomRooms, meetingRoomOptions] = await Promise.allSettled([
          listBookingRooms(),
          staffId ? getMeetingRoomOptions(staffId) : Promise.resolve(null),
        ]);

        const combined: UnifiedRoom[] = [];
        if (classroomRooms.status === 'fulfilled') {
          combined.push(...classroomRooms.value.map(toUnifiedClassroomRoom));
        }
        if (meetingRoomOptions.status === 'fulfilled' && meetingRoomOptions.value) {
          combined.push(...meetingRoomOptions.value.rooms.map(toUnifiedMeetingRoom));
        }
        setRooms(combined);
      } catch {
        // The picker just stays empty; the schedule on screen is unaffected.
      }
    }
  }, [rooms.length, staffId]);

  // SelectSheet owns the searching and the empty state; this only maps rooms
  // onto its option shape. `overline` names the kind, since the same picker
  // now mixes two systems' rooms.
  const roomOptions = useMemo(
    () =>
      rooms.map((r) => ({
        id: r.key,
        label: r.name,
        overline: r.kind === 'meeting-room' ? TEXT.MEETING_ROOM_KIND_LABEL : TEXT.BOOKING_ROOM_KIND_LABEL,
        meta:
          r.capacity > 0
            ? `${r.capacity} ${TEXT.BOOKING_ROOM_SCHEDULE_SEAT_UNIT}`
            : undefined,
      })),
    [rooms],
  );

  /** Bookings grouped onto the week's seven days, empty days included. */
  const days = useMemo(() => {
    if (!schedule) return [];
    return schedule.week.dates.map((date) => ({
      date,
      bookings: schedule.bookings
        .filter((b) => b.date === date)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }));
  }, [schedule]);

  const today = toISODate(new Date());

  function BookingRow({ booking }: { booking: UnifiedWeekBooking }) {
    const tint = bookingColor(booking.color);

    return (
      <EventTimelineItem
        time={`${booking.startTime}\n${booking.endTime}`}
        cardStyle={
          tint
            ? { backgroundColor: withAlpha(tint, 0.1), borderColor: withAlpha(tint, 0.45) }
            : undefined
        }
        dotColor={tint}>
        <ThemedText style={styles.bookingTitle} numberOfLines={2}>
          {booking.title}
        </ThemedText>
        {booking.subtitle ? (
          <ThemedText style={styles.bookingNote} numberOfLines={1}>
            {booking.subtitle}
          </ThemedText>
        ) : null}
      </EventTimelineItem>
    );
  }

  const body = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <InfinityLoader size={60} />
        </View>
      );
    }

    if (error) {
      return (
        <ErrorState
          title={TEXT.BOOKING_ROOM_SCHEDULE_LOAD_ERROR}
          message={error}
          onRetry={() => void load()}
        />
      );
    }

    if (!schedule) {
      return <EmptyState preset="schedule" message={TEXT.BOOKING_ROOM_SCHEDULE_EMPTY} />;
    }

    if (schedule.bookings.length === 0) {
      return (
        <EmptyState preset="schedule" message={TEXT.BOOKING_ROOM_SCHEDULE_WEEK_FREE} />
      );
    }

    return days.map((day) => {
      const d = parseDate(day.date);
      const isToday = day.date === today;
      const isPicked = day.date === anchorDate;
      const free = day.bookings.length === 0;
      const active = isPicked || (isToday && anchorDate === today);

      return (
        <View key={day.date} style={[styles.dayCard, active && styles.dayCardActive]}>
          <View style={[styles.dayHeader, !free && styles.dayHeaderSplit]}>
            <View style={[styles.dateBadge, active && styles.dateBadgeActive]}>
              <ThemedText style={[styles.dateNum, active && styles.dateOnActive]}>
                {d.getDate()}
              </ThemedText>
              <ThemedText style={[styles.dateMonth, active && styles.dateOnActive]}>
                {THAI_MONTHS[d.getMonth()]}
              </ThemedText>
            </View>

            <View style={styles.dayTitleCol}>
              <ThemedText
                style={[
                  styles.dayTitle,
                  isToday && styles.dayTitleToday,
                  active && styles.dayTitleActive,
                ]}
                numberOfLines={1}>
                {THAI_DAYS[d.getDay()]}
              </ThemedText>
              {isToday ? (
                <ThemedText style={styles.todayTag}>
                  {TEXT.BOOKING_ROOM_SCHEDULE_TODAY}
                </ThemedText>
              ) : null}
            </View>

            <View style={[styles.statusChip, free ? styles.statusFree : styles.statusBusy]}>
              <ThemedText style={[styles.statusText, free && styles.statusTextFree]}>
                {free
                  ? TEXT.BOOKING_ROOM_SCHEDULE_DAY_FREE
                  : `${day.bookings.length} ${TEXT.BOOKING_ROOM_SCHEDULE_BOOKING_UNIT}`}
              </ThemedText>
            </View>
          </View>

          {day.bookings.map((b) => (
            <BookingRow key={b.key} booking={b} />
          ))}
        </View>
      );
    });
  };

  const initialLoading = loading && !schedule;

  if (initialLoading) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader
          title={TEXT.BOOKING_ROOM_TAB_SCHEDULE}
          backHref="/"
          titleInNavBar
          showHomeButton={false}
        />
        <LoadingAnimate
          title={TEXT.SHARED_LOADING_DATA_TITLE}
          desc={TEXT.SHARED_LOADING_DESCRIPTION}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={TEXT.BOOKING_ROOM_TAB_SCHEDULE}
        backHref="/"
        titleInNavBar
        showHomeButton={false}
      />

      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={TEXT.BOOKING_ROOM_SCHEDULE_PICK_ROOM}
          onPress={openPicker}
          style={styles.roomButton}>
          <ThemedText
            style={[styles.roomText, !schedule?.room && styles.roomPlaceholder]}
            numberOfLines={1}>
            {roomLabel(schedule?.room) ?? TEXT.BOOKING_ROOM_SCHEDULE_PICK_ROOM}
          </ThemedText>
          <IconSymbol name="chevron.down" size={24} color={LightColors.primary} />
        </Pressable>

        <View style={styles.weekNav}>
          <Pressable
            style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}
            onPress={() => setAnchorDate((d) => shiftDays(d, -7))}
            accessibilityLabel={TEXT.BOOKING_ROOM_SCHEDULE_PREV_WEEK}>
            <IconSymbol name="chevron.left" size={18} color={LightColors.primary} />
          </Pressable>

          <View style={styles.weekLabelWrap}>
            <DatePickerField
              label={TEXT.BOOKING_ROOM_SCHEDULE_PICK_DATE}
              hideLabel
              value={parseDate(anchorDate)}
              displayValue={
                schedule
                  ? weekLabel(schedule.week.start, schedule.week.end)
                  : TEXT.BOOKING_ROOM_SCHEDULE_PICK_DATE
              }
              allowWeekends
              caption={
                schedule
                  ? `${TEXT.BOOKING_ROOM_SCHEDULE_WEEK_SHOWN} ${weekLabel(schedule.week.start, schedule.week.end)}`
                  : undefined
              }
              onChange={(date) => setAnchorDate(toISODate(date))}
              buttonStyle={styles.weekField}
              textStyle={styles.weekFieldText}
              iconColor={LightColors.textMuted}
              iconSize={19}
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}
            onPress={() => setAnchorDate((d) => shiftDays(d, 7))}
            accessibilityLabel={TEXT.BOOKING_ROOM_SCHEDULE_NEXT_WEEK}>
            <IconSymbol name="chevron.right" size={18} color={LightColors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={c.primary}
          />
        }>
        {body()}
      </ScrollView>

      <SelectSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={TEXT.BOOKING_ROOM_SCHEDULE_PICK_ROOM}
        searchPlaceholder={TEXT.BOOKING_ROOM_SCHEDULE_SEARCH_ROOM}
        options={roomOptions}
        selectedId={schedule?.room?.key}
        onSelect={(option) => setRoomSelection(option.id)}
      />
    </ThemedView>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },

    toolbar: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      gap: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    roomButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      minHeight: 50,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      boxShadow: boxShadow(c.shadow, { y: 3, blur: 10, opacity: 0.14 }),
    },
    roomText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 20,
      color: LightColors.text,
      fontFamily: AppFonts.psuBold,
    },
    roomPlaceholder: { color: LightColors.textMuted, fontFamily: AppFonts.psuRegular },

    weekNav: {
      flexDirection: 'row',
      alignItems: 'stretch',
      minHeight: 44,
      backgroundColor: '#FFFFFF',
      borderRadius: 999,
      overflow: 'hidden',
      boxShadow: boxShadow(c.shadow, { y: 3, blur: 10, opacity: 0.14 }),
    },
    navButton: {
      width: 46,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navButtonPressed: { backgroundColor: LightColors.primarySoft },
    weekLabelWrap: {
      flex: 1,
      alignItems: 'stretch',
      justifyContent: 'center',
      paddingHorizontal: 8,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderColor: LightColors.border,
    },
    weekField: {
      borderBottomWidth: 0,
      justifyContent: 'center',
      minHeight: 38,
      gap: 6,
    },
    weekFieldText: {
      flexGrow: 0,
      flexShrink: 1,
      flexBasis: 'auto',
      textAlign: 'center',
      fontSize: 15,
      lineHeight: 19,
      color: LightColors.text,
      fontFamily: AppFonts.psuBold,
    },

    scroll: { padding: 16, paddingBottom: 32, gap: 12, flexGrow: 1 },

    dayCard: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: 12,
      paddingVertical: 12,
      boxShadow: boxShadow(c.shadow, { y: 2, blur: 8, opacity: 0.05 }),
    },
    dayCardActive: { borderColor: c.belizeHole },
    dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    dayHeaderSplit: {
      marginHorizontal: -12,
      paddingHorizontal: 12,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },

    dateBadge: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceAlt,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    dateBadgeActive: { backgroundColor: c.belizeHole, borderColor: c.belizeHole },
    dateNum: { fontSize: 17, lineHeight: 20, fontFamily: AppFonts.psuBold, color: c.text },
    dateMonth: { fontSize: 10, lineHeight: 13, color: c.textMuted },
    dateOnActive: { color: c.textOnPrimary },

    dayTitleCol: { flex: 1 },
    dayTitle: { color: c.text, fontSize: 14 },
    dayTitleToday: { color: c.primary },
    dayTitleActive: { fontFamily: AppFonts.psuBold },
    todayTag: { fontSize: 11, lineHeight: 15, color: c.primary },

    statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    statusFree: { backgroundColor: c.successSoft },
    statusBusy: { backgroundColor: c.surfaceAlt },
    statusText: { fontSize: 11, color: c.textMuted },
    statusTextFree: { color: c.success },
    bookingTitle: { fontSize: 15, lineHeight: 20, color: c.text },
    bookingNote: { fontSize: 12, color: c.textMuted },
  });
