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
import { useTheme } from '@/context/ThemeContext';
import type { ExamTask } from '@/models/types';
import { listExamTasks } from '@/services/examinarService';
import { boxShadow } from '@/constants/shadows';

// ─── Filter options ────────────────────────────────────────────────────────────

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS: ModalSelectOption[] = Array.from({ length: 4 }, (_, i) => {
  const y = currentYear - 3 + i;
  return { label: String(y + 543), value: String(y) };
});

const TERM_OPTIONS: ModalSelectOption[] = [
  { label: TEXT.EXAMINAR_TERM_1, value: '1' },
  { label: TEXT.EXAMINAR_TERM_2, value: '2' },
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
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.filterSection}>
      <ThemedText style={styles.filterTitle}>{TEXT.EXAMINAR_FILTER_TITLE}</ThemedText>
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
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.filterItem}>
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
    <Pressable
      accessibilityRole="button"
      onPress={handleViewDetails}
      style={({ pressed }) => [
        styles.examCard,
        dateStatus === 'past' && styles.examCardPast,
        pressed && styles.examCardPressed,
      ]}
    >
      <View style={[styles.iconCircle, dateStatus === 'past' && styles.iconCirclePast]}>
        <CalendarDays size={18} color={dateStatus === 'past' ? c.textFaint : c.primary} />
      </View>

      <View style={styles.examCardBody}>
        <ThemedText style={[styles.roomName, dateStatus === 'past' && styles.textPast]} numberOfLines={1}>{roomName}</ThemedText>
        {dateLabel ? (
          <View style={styles.metaRow}>
            <CalendarDays size={13} color={c.textMuted} />
            <ThemedText style={[styles.metaText, dateStatus === 'past' && styles.textPast]} numberOfLines={1}>{dateLabel}</ThemedText>
          </View>
        ) : null}
        {timeFromLabel ? (
          <View style={styles.metaRow}>
            <Clock size={13} color={c.textMuted} />
            <ThemedText style={[styles.metaText, dateStatus === 'past' && styles.textPast]} numberOfLines={1}>{timeRange}</ThemedText>
          </View>
        ) : null}
      </View>

      <View style={styles.examCardRight}>
        <View style={[
          styles.statusBadge,
          dateStatus === 'past' && styles.statusBadgePast,
          dateStatus === 'today' && styles.statusBadgeToday,
          dateStatus === 'incoming' && styles.statusBadgeIncoming,
        ]}>
          <ThemedText style={styles.statusBadgeText}>{statusLabel}</ThemedText>
        </View>
        <ChevronRight size={16} color={c.textFaint} />
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExaminarListScreen() {
  const c = useColors();
  const { isDarkMode } = useTheme();
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

  return (
    <ThemedView style={styles.container}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <NavTopBar
        title={TEXT.EXAMINAR_HEADER_TITLE}
        backHref="/"
        showHomeButton={false}
        tone="primary"
      />
      <View style={styles.content}>
        <FilterBar
          year={year} term={term} period={period}
          onYearChange={setYear}
          onTermChange={setTerm}
          onPeriodChange={setPeriod}
        />
        {isLoading ? (
          <LoadingAnimate title={TEXT.EXAMINAR_LOADING} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
        ) : error ? (
          <ErrorState
            title={TEXT.SHARED_SOMETHING_WENT_WRONG}
            message={error}
            onRetry={() => loadTasks()}
          />
        ) : (
          <FlatList<ExamTask>
            style={styles.flatList}
            contentContainerStyle={styles.listContent}
            data={tasks}
            keyExtractor={(item, i) => `${getRoomId(item)}-${i}`}
            ListHeaderComponent={
              tasks.length > 0 ? (
                <ThemedText style={styles.resultCount}>
                  {`คุมสอบทั้งหมด ${tasks.length} รายการ`}
                </ThemedText>
              ) : null
            }
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => loadTasks(true)}
                tintColor={c.primary}
                colors={[c.primary]}
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <ExamCard task={item} year={year} term={term} period={period} />
            )}
            ListEmptyComponent={<EmptyState icon={ClipboardX} message={TEXT.EXAMINAR_NO_EXAMS} />}
          />
        )}
      </View>
    </ThemedView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  pageTitle: {
    fontSize: 26,
    lineHeight: 32,
    color: c.text,
    fontFamily: AppFonts.psuBold,
    marginBottom: 28,
  },
  resultCount: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
    marginBottom: 10,
  },

  // Filter section
  filterTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: AppFonts.psuBold,
    color: c.text,
    marginBottom: 14,
  },
  filterSection: {
    marginBottom: 28,
    padding: 18,
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    boxShadow: boxShadow(c.shadow, { y: 3, blur: 10, opacity: 0.06 }),
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
  flatList: { flex: 1 },
  listContent: { flexGrow: 1, paddingTop: 4, paddingBottom: 24 },
  separator: { height: 12 },

  // Exam card
  examCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 16,
    paddingVertical: 22,
    boxShadow: boxShadow(c.shadow, { y: 2, blur: 8, opacity: 0.04 }),
  },
  examCardPast: {
    opacity: 0.7,
  },
  examCardPressed: {
    opacity: 0.72,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconCirclePast: {
    backgroundColor: c.surfaceMuted,
  },
  examCardBody: { flex: 1, gap: 3 },
  examCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  roomName: {
    fontFamily: AppFonts.psuBold,
    fontSize: 15,
    lineHeight: 21,
    color: c.text,
  },
  statusBadge: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusBadgeIncoming: { backgroundColor: c.primary },
  statusBadgeToday: { backgroundColor: c.success },
  statusBadgePast: { backgroundColor: c.surfaceMuted },
  statusBadgeText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 11,
    color: c.textOnPrimary,
  },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
  },

  // Past (grey) overrides
  textPast: { color: c.textFaint },

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
    backgroundColor: c.pomegranate,
  },
  retryText: { color: c.textOnPrimary, fontFamily: AppFonts.psuBold, fontSize: 14 },
});
