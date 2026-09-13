import moment from 'moment';
import 'moment/locale/th';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { CompOtDutyCard } from '@/components/comp-ot/comp-ot-duty-card';
import { CompOtStampModal } from '@/components/comp-ot/comp-ot-stamp-modal';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { ModalSelectField, type ModalSelectOption } from '@/components/modal-select-field';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Toggle } from '@/components/ui/toggle';
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
  type CompOtShiftConfig,
  type CompOtShiftType,
  type CompOtStampFlag,
} from '@/services/compOtService';

moment.locale('th');

const PAGE_SIZE = 10;

/** Month dropdown options — Thai full names, via the locale set above. */
const MONTH_OPTIONS: ModalSelectOption[] = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: moment().month(i).format('MMMM'),
}));

/** Year dropdown options — a duty roster is only ever browsed a year or two
 * either side of now, so a short fixed range beats an open-ended picker. */
const YEAR_OPTIONS: ModalSelectOption[] = (() => {
  const current = new Date().getFullYear();
  const years: ModalSelectOption[] = [];
  for (let y = current - 2; y <= current + 1; y += 1) {
    years.push({ value: String(y), label: String(y + 543) });
  }
  return years;
})();

type ShiftTypeFilter = 'all' | CompOtShiftType;

const SHIFT_TYPE_OPTIONS: ModalSelectOption[] = [
  { value: 'all', label: TEXT.COMP_OT_FILTER_ALL },
  { value: 'after_hours', label: TEXT.COMP_OT_SHIFT_AFTER_HOURS },
  { value: 'lunch', label: TEXT.COMP_OT_SHIFT_LUNCH },
  { value: 'holiday', label: TEXT.COMP_OT_SHIFT_HOLIDAY },
];

/** Local calendar date as YYYY-MM-DD — matches the plain DATE column PHP returns. */
function toDateKey(date: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function formatDateLabel(dateStr: string) {
  const m = moment(dateStr, 'YYYY-MM-DD');
  return m.isValid() ? `${m.format('ddd D MMMM')} ${m.year() + 543}` : dateStr;
}

export default function CompOtScheduleScreen() {
  const c = useColors();
  const { isDarkMode } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { showToast } = useToast();
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId ?? '';

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [shiftType, setShiftType] = useState<ShiftTypeFilter>('all');
  // OFF (default): the list reveals 10 more rows as the reader scrolls down.
  // ON: every shift in the selected month/year is rendered at once — no more
  // rows to reveal, so there is nothing left for the pagination to do.
  const [showAllMonth, setShowAllMonth] = useState(false);

  const [events, setEvents] = useState<CompOtEvent[]>([]);
  // login_period per cid, for the stamp-window gate on each card — see
  // CompOtDutyCard and services/compOtService.ts's getCompOtStampWindow().
  const [shiftConfigs, setShiftConfigs] = useState<CompOtShiftConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // How much of `filteredEvents` is actually rendered when `showAllMonth` is
  // off — grows by PAGE_SIZE as the reader scrolls near the bottom.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [stampTarget, setStampTarget] = useState<{ event: CompOtEvent; flag: CompOtStampFlag } | null>(null);
  const [isSubmittingStamp, setIsSubmittingStamp] = useState(false);

  // Every department member's shifts, not just the caller's — the single list
  // carries what used to be two tabs, told apart by each card's badge.
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
          scope: 'dept',
        });
        const sorted = [...result.events].sort(
          (a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time),
        );
        setEvents(sorted);
        setShiftConfigs(result.shift_types);
      } catch (err) {
        setEvents([]);
        setError(err instanceof Error ? err.message : TEXT.COMP_OT_LOAD_ERROR);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [staffId, visibleMonth],
  );

  useFocusEffect(useCallback(() => { loadSchedule(); }, [loadSchedule]));

  // A new month asks a different question — the old answer must go first, or
  // last month's events would sit under the new header until the request
  // comes back. Same reasoning as examinar's filters.
  useEffect(() => {
    if (!isLoading) {
      setEvents([]);
      loadSchedule();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleMonth]);

  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const currentMonthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);

  // A month/year filter that has already passed can never show anything with
  // the toggle off — everything in it is a past date, and the paginated view
  // drops those entirely (see filteredEvents below). Rather than leave the
  // reader looking at an empty list for a month that plainly has data, flip
  // the toggle on for them the moment they browse into the past.
  useEffect(() => {
    if (visibleMonth < currentMonthStart) {
      setShowAllMonth(true);
    }
  }, [visibleMonth, currentMonthStart]);

  // The shift-type filter is a client-side view over one already-fetched
  // month — every shift type comes back in the same request, so narrowing it
  // needs no extra round trip. With the toggle off, past dates are dropped
  // too: the paginated view is meant to read as "what's coming up", not a
  // history — so the list starts right at today instead of needing several
  // scroll-triggered reveals to reach it. With the toggle on, every date in
  // the month is kept, past included.
  const filteredEvents = useMemo(() => {
    const byShiftType = shiftType === 'all' ? events : events.filter((e) => e.shift_type === shiftType);
    return showAllMonth ? byShiftType : byShiftType.filter((e) => e.date >= todayKey);
  }, [events, shiftType, showAllMonth, todayKey]);

  const configByCid = useMemo(() => new Map(shiftConfigs.map((c) => [c.cid, c])), [shiftConfigs]);

  // A new month, a new filter, or flipping the "show all" toggle is a new
  // list — start back at the first page rather than stranding the reader
  // deep in a list that may no longer exist at that length.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [visibleMonth, shiftType, showAllMonth]);

  const visibleEvents = showAllMonth ? filteredEvents : filteredEvents.slice(0, visibleCount);
  const hasMore = !showAllMonth && visibleCount < filteredEvents.length;

  function handleEndReached() {
    if (!hasMore) return;
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredEvents.length));
  }

  function selectMonth(value: string) {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), Number(value) - 1, 1));
  }
  function selectYear(value: string) {
    setVisibleMonth((prev) => new Date(Number(value), prev.getMonth(), 1));
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
      />

      <View style={styles.content}>
        <View style={styles.filterSection}>
          <ThemedText style={styles.filterTitle}>{TEXT.COMP_OT_FILTER_TITLE}</ThemedText>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <ThemedText style={styles.filterLabel}>{TEXT.COMP_OT_FILTER_YEAR_LABEL}</ThemedText>
              <ModalSelectField
                title={TEXT.COMP_OT_YEAR_FIELD_TITLE}
                placeholder={TEXT.COMP_OT_FILTER_YEAR_LABEL}
                options={YEAR_OPTIONS}
                value={String(visibleMonth.getFullYear())}
                onSelect={selectYear}
              />
            </View>
            <View style={styles.filterItem}>
              <ThemedText style={styles.filterLabel}>{TEXT.COMP_OT_FILTER_MONTH_LABEL}</ThemedText>
              <ModalSelectField
                title={TEXT.COMP_OT_MONTH_FIELD_TITLE}
                placeholder={TEXT.COMP_OT_FILTER_MONTH_LABEL}
                options={MONTH_OPTIONS}
                value={String(visibleMonth.getMonth() + 1)}
                onSelect={selectMonth}
              />
            </View>
            <View style={styles.filterItem}>
              <ThemedText style={styles.filterLabel}>{TEXT.COMP_OT_FILTER_SHIFT_TYPE_LABEL}</ThemedText>
              <ModalSelectField
                title={TEXT.COMP_OT_SHIFT_TYPE_FIELD_TITLE}
                placeholder={TEXT.COMP_OT_FILTER_SHIFT_TYPE_LABEL}
                options={SHIFT_TYPE_OPTIONS}
                value={shiftType}
                onSelect={(v) => setShiftType(v as ShiftTypeFilter)}
              />
            </View>
          </View>

          <View style={styles.toggleRow}>
            <ThemedText style={styles.toggleLabel}>{TEXT.COMP_OT_SHOW_ALL_MONTH_LABEL}</ThemedText>
            <Toggle value={showAllMonth} onValueChange={setShowAllMonth} />
          </View>
        </View>

        {isLoading && events.length === 0 ? (
          <LoadingAnimate title={TEXT.SHARED_LOADING_DATA_TITLE} desc={TEXT.SHARED_LOADING_DESCRIPTION} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => loadSchedule()} />
        ) : (
          <FlatList<CompOtEvent>
            style={styles.list}
            contentContainerStyle={styles.listContent}
            data={visibleEvents}
            keyExtractor={(item) => item.event_id}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.3}
            ListHeaderComponent={
              filteredEvents.length > 0 ? (
                <ThemedText style={styles.resultCount}>
                  {`เวรทั้งหมด ${filteredEvents.length} รายการ`}
                </ThemedText>
              ) : null
            }
            renderItem={({ item }) => (
              <CompOtDutyCard
                event={item}
                isToday={item.date === todayKey}
                isPast={item.date < todayKey}
                dateLabel={formatDateLabel(item.date)}
                loginPeriodMinutes={configByCid.get(item.cid)?.login_period ?? 0}
                onStampPress={(flag) => setStampTarget({ event: item, flag })}
              />
            )}
            ListEmptyComponent={<EmptyState preset="schedule" message={TEXT.COMP_OT_MONTH_EMPTY} />}
            ListFooterComponent={hasMore ? <ActivityIndicator style={styles.footer} color={c.primary} /> : null}
          />
        )}
      </View>

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
  content: { flex: 1 },

  filterTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: AppFonts.psuBold,
    color: c.text,
    marginBottom: 14,
  },
  filterSection: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterItem: { flexGrow: 1, flexBasis: '30%', gap: 4 },
  filterLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: AppFonts.psuBold,
    color: c.textMuted,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  toggleLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: AppFonts.psuRegular,
    color: c.text,
  },

  list: { flex: 1 },
  listContent: { flexGrow: 1, padding: 16, paddingTop: 8, paddingBottom: 32 },
  resultCount: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
    marginBottom: 10,
  },
  footer: { marginVertical: 16 },
});
