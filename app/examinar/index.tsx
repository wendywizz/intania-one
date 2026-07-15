import { CalendarDays, ChevronRight, Clock, ClipboardX } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { ErrorState } from '@/components/error-state';
import { EmptyState } from '@/components/empty-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { ModalSelectField, type ModalSelectOption } from '@/components/modal-select-field';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { useAuth } from '@/context/AuthContext';
import type { ExamTask } from '@/models/types';
import { listExamTasks } from '@/services/examinarService';

// ─── Filter options ────────────────────────────────────────────────────────────

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS: ModalSelectOption[] = Array.from({ length: 4 }, (_, i) => {
  const y = currentYear - 3 + i;
  return { label: String(y + 543), value: String(y) };
});

const TERM_OPTIONS: ModalSelectOption[] = [
  { label: TEXT.EXAMINAR_TERM_1, value: '1' },
  { label: TEXT.EXAMINAR_TERM_2, value: '2' },
  { label: TEXT.EXAMINAR_TERM_SUMMER, value: '3' },
];

const PERIOD_OPTIONS: ModalSelectOption[] = [
  { label: TEXT.EXAMINAR_PERIOD_MIDTERM, value: 'mid' },
  { label: TEXT.EXAMINAR_PERIOD_FINAL, value: 'final' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getField(task: ExamTask, ...keys: string[]): string {
  for (const key of keys) {
    const v = task[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return '';
}

function getRoomId(task: ExamTask): string {
  return getField(task, 'room_id', 'roomId', 'room');
}

function getRoomName(task: ExamTask): string {
  return getField(task, 'room_name', 'room', 'roomName', 'room_id') || 'N/A';
}

type ExamDateStatus = 'past' | 'today' | 'incoming';

function getExamDateStatus(task: ExamTask): ExamDateStatus {
  const dateStr = getField(task, 'date', 'exam_date');
  if (!dateStr) return 'incoming';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const examDate = new Date(dateStr);
  examDate.setHours(0, 0, 0, 0);
  if (isNaN(examDate.getTime())) return 'incoming';
  if (examDate < today) return 'past';
  if (examDate.getTime() === today.getTime()) return 'today';
  return 'incoming';
}

function getPeriodLabel(period: string): string {
  return PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterBar({
  year, term, period,
  onYearChange, onTermChange, onPeriodChange,
}: {
  year: string; term: string; period: string;
  onYearChange: (v: string) => void;
  onTermChange: (v: string) => void;
  onPeriodChange: (v: string) => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.filterSection}>
      <View style={styles.filterRow}>
        <FilterDropdown
          label={TEXT.EXAMINAR_FILTER_YEAR}
          value={year}
          options={YEAR_OPTIONS}
          title={TEXT.EXAMINAR_FILTER_YEAR}
          onSelect={onYearChange}
        />
        <FilterDropdown
          label={TEXT.EXAMINAR_FILTER_TERM}
          value={term}
          options={TERM_OPTIONS}
          title={TEXT.EXAMINAR_FILTER_TERM}
          onSelect={onTermChange}
        />
        <FilterDropdown
          label={TEXT.EXAMINAR_FILTER_PERIOD}
          value={period}
          options={PERIOD_OPTIONS}
          title={TEXT.EXAMINAR_FILTER_PERIOD}
          onSelect={onPeriodChange}
        />
      </View>
    </View>
  );
}

function FilterDropdown({
  label, value, options, title, onSelect,
}: {
  label: string; value: string;
  options: ModalSelectOption[];
  title: string;
  onSelect: (v: string) => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const selected = options.find((o) => o.value === value);
  return (
    <View style={styles.filterItem}>
      <ThemedText style={styles.filterLabel}>{label}</ThemedText>
      <ModalSelectField
        options={options}
        placeholder={label}
        title={title}
        value={value}
        onSelect={onSelect}
      />
    </View>
  );
}

function TaskCount({ count }: { count: number }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.taskCount}>
      <View style={styles.taskCountAccent} />
      <ThemedText style={styles.taskCountNum}>{count}</ThemedText>
      <ThemedText style={styles.taskCountLabel}>{TEXT.EXAMINAR_HEADER_TITLE}</ThemedText>
    </View>
  );
}

function ExamCard({
  task,
  year,
  term,
  period,
}: {
  task: ExamTask;
  year: string;
  term: string;
  period: string;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const roomName = getRoomName(task);
  const roomId = getRoomId(task);
  const dateLabel = getField(task, 'date_label', 'date', 'exam_date');
  const timeFrom = getField(task, 'time_from', 'timeFrom', 'start_time');
  const timeFromLabel = getField(task, 'time_from_label', 'time_from', 'start_time');
  const timeToLabel = getField(task, 'time_to_label', 'time_to', 'end_time');
  const timeRange = timeToLabel ? `${timeFromLabel} - ${timeToLabel}` : timeFromLabel;
  const dateStatus = getExamDateStatus(task);
  const statusLabel =
    dateStatus === 'past' ? TEXT.EXAMINAR_STATUS_PAST :
    dateStatus === 'today' ? TEXT.EXAMINAR_STATUS_TODAY :
    TEXT.EXAMINAR_STATUS_INCOMING;

  function handleViewDetails() {
    router.push({
      pathname: '/examinar/detail',
      params: { year, term, period, date: getField(task, 'date', 'exam_date'), time_from: timeFrom, room_id: roomId },
    });
  }

  return (
    <View style={[styles.examCard, dateStatus === 'past' && styles.examCardPast]}>
      <View style={styles.examCardBody}>
        <View style={styles.examCardHeader}>
          <ThemedText style={[styles.roomName, dateStatus === 'past' && styles.textPast]}>{roomName}</ThemedText>
          <View style={[
            styles.statusBadge,
            dateStatus === 'past' && styles.statusBadgePast,
            dateStatus === 'today' && styles.statusBadgeToday,
            dateStatus === 'incoming' && styles.statusBadgeIncoming,
          ]}>
            <ThemedText style={styles.statusBadgeText}>{statusLabel}</ThemedText>
          </View>
        </View>

        <View style={styles.examMeta}>
          {dateLabel ? (
            <View style={styles.metaRow}>
              <View style={[styles.metaIconBox, dateStatus === 'past' && styles.metaIconBoxPast]}>
                <CalendarDays size={14} color={dateStatus === 'past' ? '#9AA0B0' : '#922124'} />
              </View>
              <ThemedText style={[styles.metaText, dateStatus === 'past' && styles.textPast]}>{dateLabel}</ThemedText>
            </View>
          ) : null}
          {timeFromLabel ? (
            <View style={styles.metaRow}>
              <View style={[styles.metaIconBox, dateStatus === 'past' && styles.metaIconBoxPast]}>
                <Clock size={14} color={dateStatus === 'past' ? '#9AA0B0' : '#922124'} />
              </View>
              <ThemedText style={[styles.metaText, dateStatus === 'past' && styles.textPast]}>{timeRange}</ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={handleViewDetails}
        style={[styles.viewDetailsButton, dateStatus === 'past' && styles.viewDetailsButtonPast]}
      >
        <ThemedText style={[styles.viewDetailsText, dateStatus === 'past' && styles.textPast]}>{TEXT.EXAMINAR_VIEW_DETAILS}</ThemedText>
        <ChevronRight size={16} color={dateStatus === 'past' ? '#9AA0B0' : '#922124'} />
      </Pressable>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExaminarListScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId ?? '';

  const [year, setYear] = useState(String(currentYear));
  const [term, setTerm] = useState('1');
  const [period, setPeriod] = useState('mid');

  const [tasks, setTasks] = useState<ExamTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadTasks = useCallback(
    async (showRefreshing = false) => {
      if (!staffId) return;
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setError('');
      try {
        const result = await listExamTasks({ staff_id: staffId, year, term, period });
        setTasks(result);
      } catch (err) {
        setTasks([]);
        setError(err instanceof Error ? err.message : TEXT.EXAMINAR_UNABLE_TO_LOAD);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [staffId, year, term, period],
  );

  useFocusEffect(useCallback(() => { loadTasks(); }, [loadTasks]));

  // Reload when filters change (after initial load)
  useEffect(() => {
    if (!isLoading) loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, term, period]);

  const filterBar = (
    <FilterBar
      year={year} term={term} period={period}
      onYearChange={setYear}
      onTermChange={setTerm}
      onPeriodChange={setPeriod}
    />
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style="light" />
        <NavTopBar
          title={TEXT.EXAMINAR_HEADER_TITLE}
          subtitle={TEXT.EXAMINAR_HEADER_SUBTITLE}
          moduleIcon="checkmark.circle.fill"
          backHref="/"
        />
        {filterBar}
        <LoadingAnimate title={TEXT.EXAMINAR_LOADING} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style="light" />
        <NavTopBar
          title={TEXT.EXAMINAR_HEADER_TITLE}
          subtitle={TEXT.EXAMINAR_HEADER_SUBTITLE}
          moduleIcon="checkmark.circle.fill"
          backHref="/"
        />
        {filterBar}
        <ErrorState
          title={TEXT.SHARED_SOMETHING_WENT_WRONG}
          message={error}
          onRetry={() => loadTasks()}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar
        title={TEXT.EXAMINAR_HEADER_TITLE}
        subtitle={TEXT.EXAMINAR_HEADER_SUBTITLE}
        moduleIcon="checkmark.circle.fill"
        backHref="/"
      />
      {filterBar}
      <FlatList<ExamTask>
        contentContainerStyle={styles.listContent}
        data={tasks}
        keyExtractor={(item, i) => `${getRoomId(item)}-${i}`}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadTasks(true)}
            tintColor="#922124"
            colors={['#922124']}
          />
        }
        ListHeaderComponent={tasks.length > 0 ? <TaskCount count={tasks.length} /> : null}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <ExamCard task={item} year={year} term={term} period={period} />
        )}
        ListEmptyComponent={<EmptyState icon={ClipboardX} message={TEXT.EXAMINAR_NO_EXAMS} />}
      />
    </ThemedView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },

  // Filter section
  filterSection: {
    backgroundColor: c.background,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterItem: { flex: 1, gap: 4 },
  filterLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: AppFonts.psuBold,
    color: c.textMuted,
    letterSpacing: 0.5,
  },

  // List
  listContent: { flexGrow: 1, padding: 16, paddingBottom: 32 },
  separator: { height: 12 },

  // Task count
  taskCount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 14,
  },
  taskCountAccent: {
    width: 4,
    height: 28,
    borderRadius: 2,
    backgroundColor: c.primary,
    alignSelf: 'center',
    marginRight: 2,
  },
  taskCountNum: {
    fontFamily: AppFonts.psuBold,
    fontSize: 28,
    lineHeight: 32,
    color: c.primary,
  },
  taskCountLabel: {
    fontFamily: AppFonts.psuBold,
    fontSize: 15,
    color: c.textMuted,
  },

  // Exam card
  examCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(223, 191, 189, 0.2)',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
  },
  examCardPast: {
    backgroundColor: c.border,
    opacity: 0.85,
  },
  examCardBody: { padding: 16, gap: 10 },
  examCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  roomName: {
    fontFamily: AppFonts.psuBold,
    fontSize: 18,
    lineHeight: 24,
    color: c.text,
    flex: 1,
  },
  statusBadge: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeIncoming: { backgroundColor: c.primary },
  statusBadgeToday: { backgroundColor: c.success },
  statusBadgePast: { backgroundColor: c.surfaceMuted },
  statusBadgeText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 11,
    color: c.textOnPrimary,
  },

  examMeta: { gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: c.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaText: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    lineHeight: 20,
    color: c.text,
  },

  // Past (grey) overrides
  textPast: { color: c.textFaint },
  metaIconBoxPast: { backgroundColor: c.surfaceMuted },
  viewDetailsButtonPast: { borderTopColor: c.border },

  // View Details button
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    backgroundColor: c.surfaceMuted,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  viewDetailsText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 14,
    color: c.primary,
  },

  // Empty / Error
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
  },
  centerWrap: { flex: 1, padding: 16, justifyContent: 'center' },
  errorCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(223, 191, 189, 0.3)',
    padding: 20,
    gap: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)',
  },
  errorTitle: { fontFamily: AppFonts.psuBold, fontSize: 15, color: c.primary },
  errorMessage: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    lineHeight: 20,
    color: c.textMuted,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: c.primary,
  },
  retryText: { color: c.textOnPrimary, fontFamily: AppFonts.psuBold, fontSize: 14 },
});
