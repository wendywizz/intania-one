import { ArrowRight, CalendarDays, Clock, LogIn, LogOut, UserX } from 'lucide-react-native';
import moment from 'moment';
import 'moment/locale/th';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { ErrorState } from '@/components/error-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MonthCalendar } from '@/components/ui';
import { DAY_STATUS_STYLE, type DayStatus } from '@/constants/calendar-status';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import { statsData } from '@/services/absenceService';
import {
  getTimestampCalendar,
  type TimestampCalendarDay,
} from '@/services/timestampService';
import { boxShadow } from '@/constants/shadows';

moment.locale('th');

// Day-status colours are shared app-wide (this calendar is the source of truth).
const STATUS_STYLE = DAY_STATUS_STYLE;

// Late arrival (ABSENCE.timestamp.flag_in = 2) is orthogonal to day status — a
// present day can still be flagged late — so it gets its own amber marker.
const LATE_COLOR = '#EA580C';

// ABSENCE.absence_type code -> Thai label (falls back to a generic "ลา").
const LEAVE_TYPE_LABELS: Record<string, string> = {
  '1': TEXT.ABSENCE_SICK_TITLE,
  '2': TEXT.ABSENCE_BUSINESS_TITLE,
  '3': TEXT.ABSENCE_BIRTH_TITLE,
  '4': TEXT.ABSENCE_RELAX_TITLE,
  '6': TEXT.ABSENCE_HAJJ_TITLE,
};

function getLeaveLabel(day: TimestampCalendarDay | undefined) {
  const type = String(day?.leaveType ?? '').trim();
  return LEAVE_TYPE_LABELS[type] || TEXT.TIMESTAMP_CALENDAR_LEGEND_LEAVE;
}

function deriveStatus(
  day: TimestampCalendarDay | undefined,
  isWeekend: boolean,
  isFuture: boolean,
  isToday: boolean,
): DayStatus {
  const status = (day?.status ?? '').toLowerCase();
  const hasIn = Boolean(day?.inTime);
  const hasOut = Boolean(day?.outTime);
  const isLeave = Boolean(day?.isLeave);
  const isHoliday = Boolean(day?.isHoliday);

  if (isToday) {
    // The workday isn't over yet: only mark "present" once BOTH stamps exist.
    if (hasIn && hasOut) return 'present';
    if (isLeave) return 'leave';
    if (isHoliday) return 'holiday';
    return 'none';
  }

  if (hasIn && hasOut) return 'present';
  if (hasIn || hasOut) return 'incomplete';
  if (isLeave) return 'leave';
  if (isHoliday) return 'holiday';
  if (/absent|ขาด/.test(status)) return 'absent';
  if (/incomplete|ไม่ครบ|forgot|ลืม/.test(status)) return 'incomplete';
  if (/present|มาทำงาน|ปกติ/.test(status)) return 'present';
  if (/holiday|วันหยุด|หยุด/.test(status)) return 'holiday';
  if (isWeekend) return 'holiday';
  if (isFuture) return 'none';
  // A past weekday with no "forget" record means the staff stamped normally.
  return 'present';
}

function getStatusLabel(status: DayStatus) {
  switch (status) {
    case 'present':
      return TEXT.TIMESTAMP_CALENDAR_LEGEND_PRESENT;
    case 'incomplete':
      return TEXT.TIMESTAMP_CALENDAR_LEGEND_INCOMPLETE;
    case 'absent':
      return TEXT.TIMESTAMP_CALENDAR_LEGEND_ABSENT;
    case 'leave':
      return TEXT.TIMESTAMP_CALENDAR_LEGEND_LEAVE;
    case 'holiday':
      return TEXT.TIMESTAMP_CALENDAR_LEGEND_HOLIDAY;
    default:
      return '';
  }
}

function getDayMessage(status: DayStatus, note: string) {
  if (note) return note;
  switch (status) {
    case 'present':
      return TEXT.TIMESTAMP_CALENDAR_PRESENT_DESC;
    case 'holiday':
      return TEXT.TIMESTAMP_CALENDAR_LEGEND_HOLIDAY;
    case 'none':
      return TEXT.TIMESTAMP_CALENDAR_SELECTED_NO_DATA;
    default:
      return getStatusLabel(status);
  }
}

type CalendarCell = {
  key: string;
  day: number | null;
  data?: TimestampCalendarDay;
  status: DayStatus;
  isWeekend: boolean;
  isToday: boolean;
};

function buildCells(
  year: number,
  month: number,
  byDay: Map<number, TimestampCalendarDay>,
  todayKey: string,
): CalendarCell[] {
  const first = moment({ year, month: month - 1, day: 1 });
  const daysInMonth = first.daysInMonth();
  const leading = first.day(); // 0 (Sun) – 6 (Sat)
  const cells: CalendarCell[] = [];

  for (let i = 0; i < leading; i += 1) {
    cells.push({ key: `blank-${i}`, day: null, status: 'none', isWeekend: false, isToday: false });
  }

  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = moment({ year, month: month - 1, day: d });
    const dateKey = date.format('YYYY-MM-DD');
    const weekday = date.day();
    const isWeekend = weekday === 0 || weekday === 6;
    const isFuture = dateKey > todayKey;
    const isToday = dateKey === todayKey;
    const data = byDay.get(d);
    cells.push({
      key: `day-${d}`,
      day: d,
      data,
      status: deriveStatus(data, isWeekend, isFuture, isToday),
      isWeekend,
      isToday,
    });
  }

  return cells;
}

export default function TimestampCalendarScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;
  const today = useMemo(() => moment(), []);
  const todayKey = today.format('YYYY-MM-DD');

  const [year, setYear] = useState(today.year());
  const [month, setMonth] = useState(today.month() + 1); // 1-12
  const [days, setDays] = useState<TimestampCalendarDay[]>([]);
  // Today, selected on open. The month shown starts on the current one, so the
  // day panel below the grid has something in it from the first frame — an
  // empty panel invited a tap to find out what the screen was for.
  const [selectedDay, setSelectedDay] = useState<number | null>(today.date());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  // Fiscal-year late-arrival tally, from the same source as /absence/stats
  // (ABSENCE.timestamp flag_in = 2). Independent of the shown month.
  const [lateInfo, setLateInfo] = useState<{ used: number; limit: number } | null>(null);

  const loadLateCount = useCallback(async () => {
    try {
      const result = (await statsData(staffId)) as Record<string, unknown> | null;
      if (result && typeof result === 'object') {
        setLateInfo({
          used: Number(result.lateUsedCount) || 0,
          limit: Number(result.lateLimitCount) || 0,
        });
      } else {
        setLateInfo(null);
      }
    } catch {
      setLateInfo(null);
    }
  }, [staffId]);

  const loadCalendar = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setError('');
      try {
        const result = await getTimestampCalendar(staffId, year, month);
        setDays(result.days);
      } catch (loadError) {
        setDays([]);
        setError(
          loadError instanceof Error ? loadError.message : TEXT.SHARED_SOMETHING_WENT_WRONG,
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [month, staffId, year],
  );

  useFocusEffect(
    useCallback(() => {
      loadCalendar();
      loadLateCount();
    }, [loadCalendar, loadLateCount]),
  );

  const byDay = useMemo(() => {
    const map = new Map<number, TimestampCalendarDay>();
    days.forEach((item) => {
      if (item.day) map.set(item.day, item);
    });
    return map;
  }, [days]);

  const cells = useMemo(
    () => buildCells(year, month, byDay, todayKey),
    [byDay, month, todayKey, year],
  );

  const monthLabel = useMemo(
    () => `${moment({ year, month: month - 1, day: 1 }).format('MMMM')} ${year + 543}`,
    [month, year],
  );

  // Changing month asks a different question, so the answer to the old one has
  // to go. The loader only stands in for an empty grid now, and leaving last
  // month's marks under the new month's header would be worse than a loader.
  const goToPreviousMonth = useCallback(() => {
    setSelectedDay(null);
    setDays([]);
    if (month === 1) {
      setMonth(12);
      setYear((value) => value - 1);
    } else {
      setMonth((value) => value - 1);
    }
  }, [month]);

  const goToNextMonth = useCallback(() => {
    setSelectedDay(null);
    setDays([]);
    if (month === 12) {
      setMonth(1);
      setYear((value) => value + 1);
    } else {
      setMonth((value) => value + 1);
    }
  }, [month]);

  const selectedData = selectedDay ? byDay.get(selectedDay) : undefined;

  // Per-day status/data keyed by day number, so the shared calendar's date-based
  // `renderDay` can look each day up.
  const cellByDay = useMemo(() => {
    const map = new Map<number, CalendarCell>();
    cells.forEach((cell) => {
      if (cell.day !== null) map.set(cell.day, cell);
    });
    return map;
  }, [cells]);

  const renderDay = (date: Date) => {
    const cell = cellByDay.get(date.getDate());
    if (!cell || cell.day === null) return null;
    const statusStyle = STATUS_STYLE[cell.status];
    const isSelected = cell.day === selectedDay;
    return (
      <Pressable accessibilityRole="button" onPress={() => setSelectedDay(cell.day)}>
        <View
          style={[
            styles.dayInner,
            { backgroundColor: statusStyle.bg },
            cell.isToday && styles.dayToday,
            isSelected && styles.daySelected,
          ]}
        >
          <ThemedText
            style={[
              styles.dayNumber,
              cell.isWeekend && styles.dayNumberWeekend,
              isSelected && styles.dayNumberSelected,
            ]}
          >
            {cell.day}
          </ThemedText>
          {cell.status !== 'none' ? (
            <View style={[styles.dayDot, { backgroundColor: statusStyle.dot }]} />
          ) : (
            <View style={styles.dayDotPlaceholder} />
          )}
          {cell.data?.isLate ? (
            <View style={styles.lateBadge}>
              <ThemedText style={styles.lateBadgeText}>
                {TEXT.TIMESTAMP_CALENDAR_LATE_SHORT}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  const openRequestForm = useCallback((dayData: TimestampCalendarDay) => {
    router.push({
      pathname: '/timestamp/detail',
      params: {
        item: JSON.stringify({
          stampDate: dayData.date,
          stampType: dayData.stampType ?? '',
        }),
      },
    } as Parameters<typeof router.push>[0]);
  }, []);

  const renderSelectedDetail = () => {
    if (!selectedDay) {
      return (
        <View style={styles.emptyDetail}>
          <CalendarDays size={18} color={c.textFaint} strokeWidth={1.75} />
          <ThemedText style={styles.emptyDetailText}>{TEXT.TIMESTAMP_CALENDAR_HINT}</ThemedText>
        </View>
      );
    }
    const selectedMoment = moment({ year, month: month - 1, day: selectedDay });
    const dateLabel = `${selectedDay} ${selectedMoment.format('MMMM')} ${year + 543}`;
    const selectedKey = selectedMoment.format('YYYY-MM-DD');
    const isWeekend = [0, 6].includes(selectedMoment.day());
    const isFuture = selectedKey > todayKey;
    const isToday = selectedKey === todayKey;
    const status = deriveStatus(selectedData, isWeekend, isFuture, isToday);
    const statusStyle = STATUS_STYLE[status];
    const hasTimes = Boolean(selectedData?.inTime || selectedData?.outTime);
    const isWorkDay = status === 'present' || status === 'incomplete' || status === 'absent';
    // 'incomplete' (one stamp missing) can still be corrected via a
    // forgot-timestamp request. 'absent' (neither stamp at all) has nothing to
    // correct, so it gets its own hand-off to the leave module below instead.
    const isForgetDay = Boolean(selectedData) && status === 'incomplete';
    const isAbsentDay = Boolean(selectedData) && status === 'absent';
    const canRequest = Boolean(selectedData?.canRequest);

    return (
      <View style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <ThemedText style={styles.detailDate}>{dateLabel}</ThemedText>
          {getStatusLabel(status) ? (
            <View style={[styles.statusChip, { backgroundColor: statusStyle.bg }]}>
              <View style={[styles.statusChipDot, { backgroundColor: statusStyle.dot }]} />
              <ThemedText style={[styles.statusChipText, { color: statusStyle.dot }]}>
                {getStatusLabel(status)}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.detailBody}>
        {isAbsentDay ? (
          // Neither stamp exists, so the in/out pair has nothing to show — two
          // dashes there read as a data problem, not an answer. One row saying
          // "ขาดงาน" replaces both boxes instead of sitting awkwardly beside them.
          <View style={styles.timeRow}>
            <View style={styles.timeBox}>
              <View style={[styles.timeIcon, { backgroundColor: 'rgba(179,38,30,0.12)' }]}>
                <UserX size={18} color={STATUS_STYLE.absent.dot} />
              </View>
              <View>
                <ThemedText style={styles.timeValue}>
                  {TEXT.TIMESTAMP_CALENDAR_LEGEND_ABSENT}
                </ThemedText>
                {selectedData?.note ? (
                  <ThemedText style={styles.timeLabel}>{selectedData.note}</ThemedText>
                ) : null}
              </View>
            </View>
          </View>
        ) : hasTimes || isWorkDay ? (
          <View style={styles.timeRow}>
            <View style={styles.timeBox}>
              {/* The glyph in a tinted circle, the shape every other icon on
                  this screen already has — bare it read as decoration beside
                  the time rather than as a label for it. */}
              <View style={[styles.timeIcon, { backgroundColor: 'rgba(30,126,52,0.12)' }]}>
                <LogIn size={18} color="#1E7E34" />
              </View>
              <View>
                <ThemedText style={styles.timeLabel}>{TEXT.TIMESTAMP_CALENDAR_IN}</ThemedText>
                <ThemedText style={styles.timeValue}>{selectedData?.inTime || '—'}</ThemedText>
                {selectedData?.isLate ? (
                  <View style={styles.lateChip}>
                    <Clock size={11} color={LATE_COLOR} />
                    <ThemedText style={styles.lateChipText}>{TEXT.TIMESTAMP_CALENDAR_LATE}</ThemedText>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeBox}>
              <View style={[styles.timeIcon, { backgroundColor: 'rgba(180,83,9,0.12)' }]}>
                <LogOut size={18} color="#B45309" />
              </View>
              <View>
                <ThemedText style={styles.timeLabel}>{TEXT.TIMESTAMP_CALENDAR_OUT}</ThemedText>
                <ThemedText style={styles.timeValue}>{selectedData?.outTime || '—'}</ThemedText>
              </View>
            </View>
          </View>
        ) : (
          // A day with no in/out times at all: a holiday, a leave day, or one
          // the system simply has nothing for. Just the sentence, set flush left
          // under the date it belongs to — a centred drawing here made a
          // one-line answer look like its own empty screen inside the card.
          <ThemedText style={styles.detailMessage}>
            {status === 'holiday' && selectedData?.holidayName
              ? selectedData.holidayName
              : status === 'leave'
                ? getLeaveLabel(selectedData)
                : getDayMessage(status, selectedData?.note ?? '')}
          </ThemedText>
        )}

        {isForgetDay && selectedData ? (
          // The button itself never disappears once a day qualifies as a forget
          // day — only its enabled state changes. Hiding it entirely when
          // `canRequest` is false left no way to tell "nothing to do here" apart
          // from "the window to ask has closed"; the disabled button plus the
          // hint below says which one it is.
          <View style={styles.requestSection}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canRequest }}
              disabled={!canRequest}
              onPress={() => openRequestForm(selectedData)}
              style={({ pressed }) => [
                styles.requestButton,
                !canRequest && styles.requestButtonDisabled,
                pressed && canRequest && styles.requestButtonPressed,
              ]}
            >
              <ThemedText
                lightColor={canRequest ? '#FFFFFF' : c.textFaint}
                darkColor={canRequest ? '#FFFFFF' : c.textFaint}
                style={styles.requestButtonText}
              >
                {TEXT.TIMESTAMP_CALENDAR_MAKE_REQUEST}
              </ThemedText>
              <ArrowRight size={18} color={canRequest ? '#FFFFFF' : c.textFaint} />
            </Pressable>
            {!canRequest ? (
              <ThemedText style={styles.requestDisabledHint}>
                {TEXT.TIMESTAMP_CALENDAR_REQUEST_CLOSED}
              </ThemedText>
            ) : null}
          </View>
        ) : null}
        </View>
      </View>
    );
  };

  const legend = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.legend}
    >
      {(['present', 'incomplete', 'absent', 'leave', 'holiday'] as DayStatus[]).map((status) => (
        <View key={status} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: STATUS_STYLE[status].dot }]} />
          <ThemedText style={styles.legendText} numberOfLines={1}>
            {getStatusLabel(status)}
          </ThemedText>
        </View>
      ))}
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: LATE_COLOR }]} />
        <ThemedText style={styles.legendText} numberOfLines={1}>
          {TEXT.TIMESTAMP_CALENDAR_LEGEND_LATE}
        </ThemedText>
      </View>
    </ScrollView>
  );

  const renderBody = () => {
    // Only while the grid is empty. The focus refetch — and the one on every
    // month change — must not tear the calendar down and rebuild it; see the
    // same guard in timestamp-forgot-list.
    if (isLoading && days.length === 0) {
      return (
        <LoadingAnimate
          title={TEXT.SHARED_LOADING_DATA_TITLE}
          desc={TEXT.SHARED_LOADING_DESCRIPTION}
        />
      );
    }

    if (error) {
      return <ErrorState title={TEXT.SHARED_ERROR_TITLE_THAI} message={error} onRetry={() => loadCalendar()} />;
    }

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              loadCalendar(true);
              loadLateCount();
            }}
          />
        }
      >
        {/* The selected day reads above the grid it was picked from: it is the
            answer to the tap, and putting it under a full month of cells meant
            scrolling away from the calendar to see what the tap did. */}
        {renderSelectedDetail()}

        <MonthCalendar
          style={styles.calendarCard}
          visibleMonth={new Date(year, month - 1, 1)}
          monthLabel={monthLabel}
          onPrevMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
          colorWeekendLabels
          renderDay={renderDay}
        />
        {legend}

        {/* Last: a running total for the month, not something to act on. The
            legend stays directly under the grid because it explains the grid. */}
        {lateInfo ? (
          <View style={styles.lateSummary}>
            <Clock size={16} color={LATE_COLOR} />
            <ThemedText style={styles.lateSummaryLabel} numberOfLines={1}>
              {TEXT.TIMESTAMP_CALENDAR_LATE_COUNT_LABEL}
            </ThemedText>
            <ThemedText style={styles.lateSummaryValue}>
              {lateInfo.used}
              {lateInfo.limit > 0 ? ` / ${lateInfo.limit}` : ''} {TEXT.ABSENCE_STATS_UNIT_TIMES}
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={TEXT.TIMESTAMP_CALENDAR_TAB} backHref="/" titleInNavBar showHomeButton={false} />
      <View style={styles.content}>{renderBody()}</View>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  lateSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.warningSoft,
    borderWidth: 1,
    borderColor: 'rgba(234,88,12,0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lateSummaryLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  lateSummaryValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: LATE_COLOR,
    fontFamily: AppFonts.psuBold,
  },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.surfaceMuted,
    borderLeftWidth: 4,
    borderLeftColor: c.primary,
    borderRadius: 12,
    padding: 14,
  },
  introText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  // The whole picker (header + grid) is one bordered component; the header sits
  // flush on top of the grid with no gap.
  calendarCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    boxShadow: boxShadow(c.shadow, { y: 2, blur: 8, opacity: 0.04 }),
  },
  // The inner day pill; the shared MonthCalendar provides the card, primary
  // header band, weekday row and 1/7 grid columns around it.
  dayInner: {
    borderRadius: 10,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 3,
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: c.primary,
  },
  daySelected: {
    // Blue, not brand red: red already means "today" on the cell next to it,
    // and a selection is the user's own mark rather than a state of the day.
    backgroundColor: c.belizeHole,
  },
  dayNumber: {
    fontSize: 14,
    lineHeight: 18,
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  dayNumberWeekend: {
    color: c.primary,
  },
  dayNumberSelected: {
    color: c.textOnPrimary,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dayDotPlaceholder: {
    width: 6,
    height: 6,
  },
  lateBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: LATE_COLOR,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  lateBadgeText: {
    fontSize: 8,
    lineHeight: 11,
    color: c.textOnPrimary,
    fontFamily: AppFonts.psuBold,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    lineHeight: 16,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  // No padding of its own any more: the header is a band that runs to the card's
  // edges, so the padding moved into detailHeader and detailBody. `overflow`
  // clips the band's top corners to the card radius.
  detailCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(223,191,189,0.25)',
  },
  // Slate, deliberately NOT the brand red: MonthCalendar's month header sits a
  // few points below this one, and two red bands on one screen read as the same
  // control repeated — the month nav — rather than as two different cards.
  //
  // Deep rather than tinted, though: the status chip beside the date carries a
  // pale status colour (see DAY_STATUS_STYLE), and every pale band collides with
  // one of them — #FDECEC "ขาดงาน" with a red tint, #EFF1F5 "วันหยุด" with a grey
  // one. On a dark band every chip reads.
  //
  // A fixed Defo swatch, so it is the same slate in light and dark; the card
  // surface moves around it and `textOnPrimary` is white in both themes.
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: c.wetAsphalt,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  detailBody: {
    padding: 16,
    gap: 12,
  },
  // Reads on the brand band, not on the card surface. `style` is applied after
  // ThemedText's own colour, so this wins without needing lightColor/darkColor.
  detailDate: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: c.textOnPrimary,
    fontFamily: AppFonts.psuBold,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: AppFonts.psuBold,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.background,
    borderRadius: 12,
    padding: 14,
  },
  timeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Tinted circle behind the in/out glyph. The tint is set at the call site so
  // each direction keeps its own colour — green for arriving, amber for
  // leaving — at the same strength.
  timeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timeDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: c.surfaceMuted,
    marginHorizontal: 8,
  },
  timeLabel: {
    fontSize: 11,
    lineHeight: 15,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  timeValue: {
    fontSize: 16,
    lineHeight: 22,
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  lateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    marginTop: 4,
    backgroundColor: c.warningSoft,
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  lateChipText: {
    fontSize: 11,
    lineHeight: 15,
    color: LATE_COLOR,
    fontFamily: AppFonts.psuBold,
  },
  // The whole answer for a day with no stamps. Left-aligned like the date above
  // it, so the card reads as one column rather than a heading over a centred
  // block.
  detailMessage: {
    alignSelf: 'stretch',
    textAlign: 'left',
    fontSize: 14,
    lineHeight: 20,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  requestSection: {
    gap: 8,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: c.pomegranate,
    paddingHorizontal: 16,
  },
  requestButtonPressed: {
    opacity: 0.85,
  },
  // Deadline passed (or the record no longer qualifies): the button stays put
  // so the row doesn't shift, but reads as inert — muted fill, no brand red.
  requestButtonDisabled: {
    backgroundColor: c.surfaceMuted,
    borderWidth: 1,
    borderColor: c.border,
  },
  requestButtonText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: AppFonts.psuBold,
  },
  requestDisabledHint: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    color: c.textFaint,
    fontFamily: AppFonts.psuRegular,
  },
  detailNote: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  // One compact row, not the 200pt empty panel this was while it sat at the
  // bottom of the screen. Above the grid it holds the slot the detail card will
  // fill, and paging a month clears the selection — so a tall placeholder would
  // shove the calendar down the screen on every press of the month arrows.
  emptyDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emptyDetailText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
});
