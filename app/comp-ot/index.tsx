import moment from 'moment';
import 'moment/locale/th';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EventTimelineItem } from '@/components/ui/event-timeline-item';
import { CompOtStampModal } from '@/components/comp-ot/comp-ot-stamp-modal';
import { ErrorState } from '@/components/error-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MonthCalendar } from '@/components/ui/month-calendar';
import { TopTabs, type TopTabItem } from '@/components/ui/top-tabs';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/toast-provider';
import {
  getCompOtSchedule,
  stampCompOtEvent,
  type CompOtEvent,
  type CompOtScope,
  type CompOtShiftType,
  type CompOtStampFlag,
} from '@/services/compOtService';

moment.locale('th');

const SCOPE_TABS: TopTabItem<CompOtScope>[] = [
  { key: 'mine', label: TEXT.COMP_OT_SCOPE_MINE },
  { key: 'dept', label: TEXT.COMP_OT_SCOPE_DEPT },
];

const SHIFT_TYPE_LABEL: Record<CompOtShiftType, string> = {
  after_hours: TEXT.COMP_OT_SHIFT_AFTER_HOURS,
  lunch: TEXT.COMP_OT_SHIFT_LUNCH,
  holiday: TEXT.COMP_OT_SHIFT_HOLIDAY,
  unknown: '',
};

/** Local calendar date as YYYY-MM-DD — matches the plain DATE column PHP returns. */
function toDateKey(date: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function timeRange(event: CompOtEvent) {
  return `${event.start_time.slice(0, 5)}\n${event.end_time.slice(0, 5)}`;
}

export default function CompOtScheduleScreen() {
  const c = useColors();
  const { isDarkMode } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { showToast } = useToast();
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId ?? '';

  const [scope, setScope] = useState<CompOtScope>('mine');
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const [events, setEvents] = useState<CompOtEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [stampTarget, setStampTarget] = useState<{ event: CompOtEvent; flag: CompOtStampFlag } | null>(null);
  const [isSubmittingStamp, setIsSubmittingStamp] = useState(false);

  const loadSchedule = useCallback(
    async (showRefreshing = false) => {
      if (!staffId) return;
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setError('');
      try {
        const result = await getCompOtSchedule({
          staffId,
          month: visibleMonth.getMonth() + 1,
          year: visibleMonth.getFullYear(),
          scope,
        });
        setEvents(result.events);
      } catch (err) {
        setEvents([]);
        setError(err instanceof Error ? err.message : TEXT.COMP_OT_LOAD_ERROR);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [staffId, visibleMonth, scope],
  );

  useFocusEffect(useCallback(() => { loadSchedule(); }, [loadSchedule]));

  // A new month/scope asks a different question — the old answer must go first,
  // or last month's (or the other scope's) events would sit under the new
  // header until the request comes back. Same reasoning as examinar's filters.
  useEffect(() => {
    if (!isLoading) {
      setEvents([]);
      loadSchedule();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleMonth, scope]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CompOtEvent[]>();
    events.forEach((event) => {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    });
    return map;
  }, [events]);

  const monthLabel = useMemo(
    () => `${moment(visibleMonth).format('MMMM')} ${visibleMonth.getFullYear() + 543}`,
    [visibleMonth],
  );

  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const selectedKey = toDateKey(selectedDate);
  const selectedDayEvents = eventsByDate.get(selectedKey) ?? [];

  const goToPreviousMonth = useCallback(() => {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);
  const goToNextMonth = useCallback(() => {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  function renderDay(date: Date) {
    const key = toDateKey(date);
    const dayEvents = eventsByDate.get(key) ?? [];
    const hasEvents = dayEvents.length > 0;
    const isSelected = key === selectedKey;
    const isToday = key === todayKey;
    const allStamped = hasEvents && dayEvents.every((e) => e.flag_in && e.flag_out);
    const hasMine = dayEvents.some((e) => e.is_mine);

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setSelectedDate(date)}
        style={[
          styles.dayPill,
          isToday && styles.dayPillToday,
          isSelected && styles.dayPillSelected,
        ]}>
        <ThemedText
          style={[
            styles.dayNumber,
            isSelected && styles.dayNumberSelected,
          ]}>
          {date.getDate()}
        </ThemedText>
        {hasEvents ? (
          <View
            style={[
              styles.dayDot,
              hasMine ? styles.dayDotMine : styles.dayDotOther,
              allStamped && styles.dayDotStamped,
              isSelected && { borderColor: c.primary },
            ]}
          />
        ) : (
          <View style={styles.dayDotPlaceholder} />
        )}
      </Pressable>
    );
  }

  async function handleStampSubmit(amount: string) {
    if (!stampTarget || !staffId) return;
    setIsSubmittingStamp(true);
    try {
      await stampCompOtEvent({
        staffId,
        eventId: stampTarget.event.event_id,
        flag: stampTarget.flag,
        amount,
      });
      setStampTarget(null);
      showToast(TEXT.COMP_OT_STAMP_SUCCESS, 'success');
      await loadSchedule(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : TEXT.COMP_OT_STAMP_ERROR, 'error');
    } finally {
      setIsSubmittingStamp(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <NavTopBar
        title={TEXT.COMP_OT_HEADER_TITLE}
        subtitle={TEXT.COMP_OT_HEADER_SUBTITLE}
        backHref="/"
        showHomeButton={false}
        tone="primary"
        rightContent={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={TEXT.COMP_OT_HISTORY_BUTTON}
            onPress={() => router.push('/comp-ot/history')}
            style={styles.historyButton}>
            <IconSymbol name="history" size={22} color={c.textOnPrimary} />
          </Pressable>
        }
      />

      <TopTabs tabs={SCOPE_TABS} activeKey={scope} onChange={setScope} />

      {isLoading && events.length === 0 ? (
        <LoadingAnimate title={TEXT.SHARED_LOADING_DATA_TITLE} desc={TEXT.SHARED_LOADING_DESCRIPTION} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadSchedule()} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <MonthCalendar
            visibleMonth={visibleMonth}
            monthLabel={monthLabel}
            onPrevMonth={goToPreviousMonth}
            onNextMonth={goToNextMonth}
            renderDay={renderDay}
            footer={
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.dayDot, styles.dayDotMine]} />
                  <ThemedText style={styles.legendText}>{TEXT.COMP_OT_SCOPE_MINE}</ThemedText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.dayDot, styles.dayDotOther]} />
                  <ThemedText style={styles.legendText}>{TEXT.COMP_OT_SCOPE_DEPT}</ThemedText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.dayDot, styles.dayDotStamped]} />
                  <ThemedText style={styles.legendText}>{TEXT.COMP_OT_LEGEND_STAMPED_OUT}</ThemedText>
                </View>
              </View>
            }
          />

          <View style={styles.dayDetail}>
            {selectedDayEvents.length === 0 ? (
              <ThemedText style={styles.emptyDayText}>{TEXT.COMP_OT_DAY_NO_SHIFT}</ThemedText>
            ) : (
              selectedDayEvents.map((event) => (
                <EventTimelineItem
                  key={event.event_id}
                  time={timeRange(event)}
                  dotColor={event.is_mine ? c.primary : c.textFaint}>
                  <ThemedText style={styles.eventTitle} numberOfLines={2}>
                    {SHIFT_TYPE_LABEL[event.shift_type] || event.shift_type}
                  </ThemedText>
                  {event.staff_name ? (
                    <View style={styles.eventMetaRow}>
                      <ThemedText style={styles.eventMeta} numberOfLines={1}>
                        {event.staff_name}
                      </ThemedText>
                      {event.is_mine ? (
                        <View style={styles.mineBadge}>
                          <ThemedText style={styles.mineBadgeText}>{TEXT.COMP_OT_MINE_BADGE}</ThemedText>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {event.is_mine ? (
                    <View style={styles.stampRow}>
                      {!event.flag_in ? (
                        <Pressable
                          accessibilityRole="button"
                          style={[styles.stampButton, { backgroundColor: c.pomegranate }]}
                          onPress={() => setStampTarget({ event, flag: 'in' })}>
                          <ThemedText style={styles.stampButtonText}>{TEXT.COMP_OT_STAMP_IN_BUTTON}</ThemedText>
                        </Pressable>
                      ) : !event.flag_out ? (
                        <Pressable
                          accessibilityRole="button"
                          style={[styles.stampButton, { backgroundColor: c.belizeHole }]}
                          onPress={() => setStampTarget({ event, flag: 'out' })}>
                          <ThemedText style={styles.stampButtonText}>{TEXT.COMP_OT_STAMP_OUT_BUTTON}</ThemedText>
                        </Pressable>
                      ) : (
                        <View style={[styles.stampDoneBadge, { backgroundColor: c.successSoft }]}>
                          <ThemedText style={[styles.stampDoneText, { color: c.successOnSoft }]}>
                            {TEXT.COMP_OT_LEGEND_STAMPED_OUT}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  ) : null}
                </EventTimelineItem>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <CompOtStampModal
        visible={stampTarget !== null}
        flag={stampTarget?.flag ?? 'in'}
        loading={isSubmittingStamp}
        onCancel={() => setStampTarget(null)}
        onSubmit={handleStampSubmit}
      />
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  historyButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32, gap: 16 },

  dayPill: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    gap: 3,
  },
  dayPillToday: {
    borderWidth: 1,
    borderColor: c.primary,
  },
  dayPillSelected: {
    backgroundColor: c.primarySoft,
  },
  dayNumber: {
    fontSize: 13,
    fontFamily: AppFonts.psuRegular,
    color: c.text,
  },
  dayNumberSelected: {
    fontFamily: AppFonts.psuBold,
    color: c.primary,
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayDotPlaceholder: {
    width: 8,
    height: 8,
  },
  dayDotMine: { backgroundColor: c.primary },
  dayDotOther: { backgroundColor: c.textFaint },
  dayDotStamped: { backgroundColor: c.success },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingTop: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: AppFonts.psuRegular,
    color: c.textMuted,
  },

  dayDetail: { gap: 4 },
  emptyDayText: {
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 13,
    fontFamily: AppFonts.psuRegular,
    color: c.textMuted,
  },
  eventTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: AppFonts.psuBold,
    color: c.text,
  },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppFonts.psuRegular,
    color: c.textMuted,
    flexShrink: 1,
  },
  mineBadge: {
    backgroundColor: c.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  mineBadgeText: {
    fontSize: 11,
    fontFamily: AppFonts.psuBold,
    color: c.primary,
  },
  stampRow: { marginTop: 6 },
  stampButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stampButtonText: {
    fontSize: 13,
    fontFamily: AppFonts.psuBold,
    color: c.textOnPrimary,
  },
  stampDoneBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stampDoneText: {
    fontSize: 12,
    fontFamily: AppFonts.psuBold,
  },
});
