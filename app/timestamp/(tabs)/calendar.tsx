import { ArrowRight, ChevronLeft, ChevronRight, Clock, LogIn, LogOut } from 'lucide-react-native';
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
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import { statsData } from '@/services/absenceService';
import {
  getTimestampCalendar,
  type TimestampCalendarDay,
} from '@/services/timestampService';

moment.locale('th');

type DayStatus = 'present' | 'incomplete' | 'absent' | 'leave' | 'holiday' | 'none';

const WEEKDAY_LABELS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

// Late arrival (ABSENCE.timestamp.flag_in = 2) is orthogonal to day status — a
// present day can still be flagged late — so it gets its own amber marker.
const LATE_COLOR = '#EA580C';

const STATUS_STYLE: Record<DayStatus, { bg: string; dot: string }> = {
  present: { bg: '#E6F4EA', dot: '#1E7E34' },
  incomplete: { bg: '#FEF3E2', dot: '#B45309' },
  absent: { bg: '#FDECEC', dot: '#B3261E' },
  leave: { bg: '#EEF0FF', dot: '#5B5BD6' },
  holiday: { bg: '#EFF1F5', dot: '#9AA0AA' },
  none: { bg: 'transparent', dot: 'transparent' },
};

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
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
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

  const goToPreviousMonth = useCallback(() => {
    setSelectedDay(null);
    if (month === 1) {
      setMonth(12);
      setYear((value) => value - 1);
    } else {
      setMonth((value) => value - 1);
    }
  }, [month]);

  const goToNextMonth = useCallback(() => {
    setSelectedDay(null);
    if (month === 12) {
      setMonth(1);
      setYear((value) => value + 1);
    } else {
      setMonth((value) => value + 1);
    }
  }, [month]);

  const selectedData = selectedDay ? byDay.get(selectedDay) : undefined;

  const monthHeader = (
    <View style={styles.monthHeader}>
      <Pressable accessibilityRole="button" onPress={goToPreviousMonth} style={styles.monthNavButton}>
        <ChevronLeft size={22} color={c.primary} />
      </Pressable>
      <ThemedText style={styles.monthLabel}>{monthLabel}</ThemedText>
      <Pressable accessibilityRole="button" onPress={goToNextMonth} style={styles.monthNavButton}>
        <ChevronRight size={22} color={c.primary} />
      </Pressable>
    </View>
  );

  const renderGrid = () => (
    <View style={styles.card}>
      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <View key={label} style={styles.weekCell}>
            <ThemedText
              style={[
                styles.weekLabel,
                (index === 0 || index === 6) && styles.weekendLabel,
              ]}
            >
              {label}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => {
          if (cell.day === null) {
            return <View key={cell.key} style={styles.dayCell} />;
          }
          const statusStyle = STATUS_STYLE[cell.status];
          const isSelected = cell.day === selectedDay;
          return (
            <Pressable
              key={cell.key}
              accessibilityRole="button"
              onPress={() => setSelectedDay(cell.day)}
              style={styles.dayCell}
            >
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
        })}
      </View>
    </View>
  );

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
        <ThemedText style={styles.hintText}>{TEXT.TIMESTAMP_CALENDAR_HINT}</ThemedText>
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
    const isForgetDay = Boolean(selectedData) && (status === 'incomplete' || status === 'absent');
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

        {hasTimes || isWorkDay ? (
          <>
            <View style={styles.timeRow}>
              <View style={styles.timeBox}>
                <LogIn size={18} color="#1E7E34" />
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
                <LogOut size={18} color="#B45309" />
                <View>
                  <ThemedText style={styles.timeLabel}>{TEXT.TIMESTAMP_CALENDAR_OUT}</ThemedText>
                  <ThemedText style={styles.timeValue}>{selectedData?.outTime || '—'}</ThemedText>
                </View>
              </View>
            </View>
            {!hasTimes ? (
              <ThemedText style={styles.detailCaption}>
                {selectedData?.note || TEXT.TIMESTAMP_CALENDAR_NO_TIME_DATA}
              </ThemedText>
            ) : null}
          </>
        ) : (
          <ThemedText style={styles.detailEmpty}>
            {status === 'holiday' && selectedData?.holidayName
              ? selectedData.holidayName
              : status === 'leave'
                ? getLeaveLabel(selectedData)
                : getDayMessage(status, selectedData?.note ?? '')}
          </ThemedText>
        )}

        {isForgetDay && selectedData && canRequest ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => openRequestForm(selectedData)}
            style={({ pressed }) => [styles.requestButton, pressed && styles.requestButtonPressed]}
          >
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.requestButtonText}>
              {TEXT.TIMESTAMP_CALENDAR_MAKE_REQUEST}
            </ThemedText>
            <ArrowRight size={18} color="#FFFFFF" />
          </Pressable>
        ) : null}
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
    if (isLoading) {
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

        {monthHeader}
        {renderGrid()}
        {legend}
        {renderSelectedDetail()}
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={TEXT.TIMESTAMP_TITLE} backHref="/" titleInNavBar />
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
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: 'rgba(223,191,189,0.4)',
  },
  monthLabel: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: c.primary,
    fontFamily: AppFonts.psuBold,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(223,191,189,0.25)',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  weekRow: {
    flexDirection: 'row',
    paddingBottom: 6,
  },
  weekCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
    fontFamily: AppFonts.psuBold,
  },
  weekendLabel: {
    color: c.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    padding: 2,
  },
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
    backgroundColor: c.primary,
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
  detailCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(223,191,189,0.25)',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailDate: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: c.text,
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
  detailEmpty: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  detailCaption: {
    fontSize: 12,
    lineHeight: 18,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: c.primary,
    paddingHorizontal: 16,
  },
  requestButtonPressed: {
    opacity: 0.85,
  },
  requestButtonText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: AppFonts.psuBold,
  },
  detailNote: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  inlineEmpty: {
    paddingVertical: 16,
  },
  hintText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
    paddingVertical: 8,
  },
});
