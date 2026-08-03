/**
 * Booking Room → ตารางจอง (tab key: booking_schedule).
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
import {
  getRoomWeekSchedule,
  listBookingRooms,
  type BookingRoom,
  type RoomBooking,
  type RoomWeekSchedule,
} from '@/services/bookingRoomService';

const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

/**
 * The booking's own colour, or nothing.
 *
 * The website stores whatever was picked in the form, so the value is trusted
 * only when it is a plain hex — an empty string, a stray label or a colour name
 * falls back to the card's normal surface instead of reaching the style engine.
 */
function bookingColor(value?: string) {
  const hex = (value ?? '').trim();
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return undefined;
  // Expand #abc so the alpha suffix below can just be appended.
  return hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
}

/** The same colour at a fraction of its strength, as #RRGGBBAA. */
function withAlpha(hex: string, alpha: number) {
  const aa = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${aa}`;
}

/** 'YYYY-MM-DD' -> local Date, avoiding the UTC shift `new Date(str)` applies. */
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

/**
 * "A303 (88 ที่นั่ง)" — the room and how many it seats on one line.
 *
 * Capacity used to sit on its own line under the picker, which read as a second
 * fact about the screen rather than part of the room's name. It belongs to the
 * room, so it travels with it.
 */
function roomLabel(room?: BookingRoom | null) {
  if (!room) return undefined;
  return room.capacity > 0
    ? `${room.name} (${room.capacity} ${TEXT.BOOKING_ROOM_SCHEDULE_SEAT_UNIT})`
    : room.name;
}

export default function BookingRoomScheduleScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);

  const [anchorDate, setAnchorDate] = useState(() => toISODate(new Date()));
  const [roomId, setRoomId] = useState<string | undefined>(undefined);

  const [schedule, setSchedule] = useState<RoomWeekSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rooms, setRooms] = useState<BookingRoom[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const data = await getRoomWeekSchedule(roomId, anchorDate);
        setSchedule(data);
        // The server picks the default room; adopt it so paging weeks afterwards
        // stays on the same room instead of silently re-defaulting.
        if (!roomId && data?.room?.id) setRoomId(data.room.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : TEXT.BOOKING_ROOM_SCHEDULE_LOAD_ERROR);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [anchorDate, roomId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const openPicker = useCallback(async () => {
    setPickerOpen(true);
    if (rooms.length === 0) {
      try {
        setRooms(await listBookingRooms());
      } catch {
        // The picker just stays empty; the schedule on screen is unaffected.
      }
    }
  }, [rooms.length]);

  // SelectSheet owns the searching and the empty state; this only maps rooms
  // onto its option shape.
  const roomOptions = useMemo(
    () =>
      rooms.map((r) => ({
        id: r.id,
        label: r.name,
        // "88 ที่นั่ง", not a bare "88" — the number alone could be read as a
        // floor, a code, anything.
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
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    }));
  }, [schedule]);

  const today = toISODate(new Date());

  function BookingRow({ booking }: { booking: RoomBooking }) {
    const subject = booking.section
      ? `${booking.subject_id} (${booking.section})`
      : booking.subject_id;
    // The colour picked when the booking was made. It fills the card, but at a
    // tenth of its strength: enough to tell two lecturers' blocks apart down a
    // day, faint enough that the themed text stays the readable thing on the
    // card. The dot on the rail carries the colour at full strength, so each
    // row still has one place where the colour is exactly itself. Anything that
    // is not a plain hex is dropped rather than passed to the style engine.
    const tint = bookingColor(booking.bgcolor);

    return (
      // The same timeline row the meeting screens use: start and end times sit
      // in the left gutter on two lines, a dot on a continuous rail marks the
      // slot, and the details float in a card beside it. A day's bookings are
      // already in time order, so consecutive rails read as one line down the day.
      <EventTimelineItem
        time={`${booking.start_time}\n${booking.end_time}`}
        cardStyle={
          tint
            ? { backgroundColor: withAlpha(tint, 0.1), borderColor: withAlpha(tint, 0.45) }
            : undefined
        }
        dotColor={tint}>
        <ThemedText style={styles.bookingTitle} numberOfLines={2}>
          {subject || booking.teacher || booking.objective}
        </ThemedText>
        {booking.teacher ? (
          <ThemedText style={styles.bookingNote} numberOfLines={1}>
            {booking.teacher}
          </ThemedText>
        ) : null}
        {booking.objective ? (
          <ThemedText style={styles.bookingNote} numberOfLines={2}>
            {booking.objective}
          </ThemedText>
        ) : null}
      </EventTimelineItem>
    );
  }

  const body = () => {
    // A reload with a schedule already on screen: the controls stay, and only
    // the week below them is replaced. The cold-start case never reaches here —
    // it takes over the whole screen, see `initialLoading` below.
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
      return <EmptyState iconName="calendar-range" message={TEXT.BOOKING_ROOM_SCHEDULE_EMPTY} />;
    }

    if (schedule.bookings.length === 0) {
      return (
        <EmptyState iconName="calendar-range" message={TEXT.BOOKING_ROOM_SCHEDULE_WEEK_FREE} />
      );
    }

    return days.map((day) => {
      const d = parseDate(day.date);
      const isToday = day.date === today;
      const isPicked = day.date === anchorDate;
      const free = day.bookings.length === 0;
      // The day being looked at, whichever way it was arrived at — tapped in
      // the calendar, or today on a week nobody has touched.
      const active = isPicked || (isToday && anchorDate === today);

      return (
        // Each day is its own card. A rule between days used to do this job,
        // but once a day could hold several timeline rows the gap inside a day
        // and the gap between two days looked the same; a card has an edge.
        <View key={day.date} style={[styles.dayCard, active && styles.dayCardActive]}>
          <View style={[styles.dayHeader, !free && styles.dayHeaderSplit]}>
            {/* The date as a plate rather than a grey sentence. Number over
                month, so the eye lands on the number — inside one week that
                is the only part that changes. The active day fills the plate
                with brand red; that reads from across the screen. */}
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

            {/* Whether the room is free is the reason to look at a day at
                all, so it sits with the date instead of as a grey line
                underneath. A free day needs nothing below its header. */}
            <View style={[styles.statusChip, free ? styles.statusFree : styles.statusBusy]}>
              <ThemedText style={[styles.statusText, free && styles.statusTextFree]}>
                {free
                  ? TEXT.BOOKING_ROOM_SCHEDULE_DAY_FREE
                  : `${day.bookings.length} ${TEXT.BOOKING_ROOM_SCHEDULE_BOOKING_UNIT}`}
              </ThemedText>
            </View>
          </View>

          {day.bookings.map((b) => (
            <BookingRow key={b.detail_id} booking={b} />
          ))}
        </View>
      );
    });
  };

  // Cold start: nothing has loaded yet, so the room picker has no room to name
  // and the week stepper no week to step from. Showing them empty invites a tap
  // that cannot be answered, so the screen waits as one thing instead.
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
        {/* Same card-style trigger the executive calendar uses for its source
            picker: a raised surface with the current choice and a chevron, not
            a pill. Both open the same sheet, so they should look the same too. */}
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

        {/* The week control is one stepper, not three loose parts: two arrows
            with the week between them, inside a single outlined pill. That
            shape is deliberately unlike the room card above it — a stepper you
            page through rather than a field that opens a list — so the two
            controls are told apart before either is read. */}
        <View style={styles.weekNav}>
          <Pressable
            style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}
            onPress={() => setAnchorDate((d) => shiftDays(d, -7))}
            accessibilityLabel={TEXT.BOOKING_ROOM_SCHEDULE_PREV_WEEK}>
            <IconSymbol name="chevron.left" size={18} color={LightColors.primary} />
          </Pressable>

          {/* The label is the date picker's trigger: tapping the week opens a
              calendar, and whatever day is chosen decides which week is shown.
              `hideLabel` keeps it looking like a label rather than a form field. */}
          <View style={styles.weekLabelWrap}>
            {/* The button shows the week, not the day that chose it: the picked
                date is only a way of pointing at a week, and showing it as well
                left two dates on screen competing to look like "the" date. */}
            <DatePickerField
              label={TEXT.BOOKING_ROOM_SCHEDULE_PICK_DATE}
              hideLabel
              value={parseDate(anchorDate)}
              displayValue={
                schedule
                  ? weekLabel(schedule.week.start, schedule.week.end)
                  : TEXT.BOOKING_ROOM_SCHEDULE_PICK_DATE
              }
              // The week is named in the caption below the grid rather than
              // painted across it — a filled band fought with the weekend and
              // holiday colours the days already carry.
              // A week runs Monday to Sunday and the room is bookable at the
              // weekend, so both ends of the band have to be reachable.
              allowWeekends
              // …and states that range in words under the grid, so the picker
              // says which week it is on rather than only drawing it.
              caption={
                schedule
                  ? `${TEXT.BOOKING_ROOM_SCHEDULE_WEEK_SHOWN} ${weekLabel(schedule.week.start, schedule.week.end)}`
                  : undefined
              }
              onChange={(date) => setAnchorDate(toISODate(date))}
              // The field sits on the white plate above, so its colours come
              // from the light palette rather than the theme's — otherwise the
              // dark theme would put pale text on white.
              buttonStyle={styles.weekField}
              textStyle={styles.weekFieldText}
              iconColor={LightColors.textMuted}
              // As tall as the line it sits next to (15pt bold ≈ 20pt line), so
              // glyph and range read as one object rather than a mark before a
              // label.
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
            onRefresh={() => void load(true)}
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
        selectedId={schedule?.room?.id}
        onSelect={(option) => setRoomId(option.id)}
      />
    </ThemedView>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    // Fills what is left of the screen so the loader sits in the middle of it,
    // not 48pt below whatever is above it.
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },

    toolbar: {
      paddingHorizontal: 16,
      // The room picker is a raised card; sitting it straight under the nav bar
      // made the two read as one block. This gives it room to be its own thing.
      paddingTop: 16,
      paddingBottom: 12,
      gap: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    // The room: a full-width white card, tall, with the room's name reading as
    // a heading. No border — on a darker panel an outline only muddies the edge
    // the tone gap already draws; the shadow does the lifting instead.
    // White in both themes, by request. Because the plate no longer follows the
    // theme, nothing drawn on it may either — text, placeholder and chevron all
    // come from the light palette.
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

    // The week: one white pill holding both arrows and the range, divided into
    // three segments. Deliberately unlike the card above it — a stepper you page
    // through, not a field that opens a list — so the two are told apart before
    // either is read, while the shared white keeps them a set.
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
    // The middle segment of the pill, divided from the arrows by hairlines so
    // it is legible as its own target — tapping the week opens the calendar,
    // tapping an arrow steps a week.
    weekLabelWrap: {
      flex: 1,
      // `stretch`, not `center`: the field inside has to take the full width of
      // the segment, otherwise its label has nothing to lay out in.
      alignItems: 'stretch',
      justifyContent: 'center',
      paddingHorizontal: 8,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderColor: LightColors.border,
    },
    // No underline: the pill around it is the affordance now. Centred as a pair
    // — glyph then range — rather than the glyph pinned left and the text
    // centred, which left a gap between them the width of the segment.
    weekField: {
      borderBottomWidth: 0,
      justifyContent: 'center',
      minHeight: 38,
      gap: 6,
    },
    // Sized to its own text so it sits right beside the glyph. Spelled out as
    // grow/shrink/basis rather than `flex: 0`, which resolves to a zero basis on
    // web and once left the range with no width at all — only the glyph showed.
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

    // flexGrow so a short body — the loader, an empty state — fills the
    // viewport and centres in it rather than sitting under the toolbar.
    scroll: { padding: 16, paddingBottom: 32, gap: 12, flexGrow: 1 },

    // One card per day. `surface` rather than `surfaceAlt`, because the date
    // badge and the busy chip are surfaceAlt — on a matching plate they would
    // disappear.
    dayCard: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: 12,
      paddingVertical: 12,
      boxShadow: boxShadow(c.shadow, { y: 2, blur: 8, opacity: 0.05 }),
    },
    // The day being looked at keeps a brand edge so it stays findable after
    // scrolling — the fill stays neutral, because the timeline rows inside it
    // have to stay readable.
    // The same blue the date picker fills the chosen day with — the card and
    // the calendar cell are marking the same thing, so they say it the same way.
    dayCardActive: { borderColor: c.belizeHole },
    dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    // A rule between the day and its bookings. It runs to the card's edges —
    // hence the negative margins undoing the card padding — so it reads as a
    // division of the card rather than as an underline on the header text.
    // Only drawn when there is something below it to divide from.
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
