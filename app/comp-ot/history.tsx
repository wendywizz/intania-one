import moment from 'moment';
import 'moment/locale/th';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { EmptyState } from '@/components/empty-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ListCard, type ListCardBadge } from '@/components/ui/list-card';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { getCompOtSchedule, type CompOtEvent, type CompOtShiftType } from '@/services/compOtService';

moment.locale('th');

const SHIFT_TYPE_LABEL: Record<CompOtShiftType, string> = {
  after_hours: TEXT.COMP_OT_SHIFT_AFTER_HOURS,
  lunch: TEXT.COMP_OT_SHIFT_LUNCH,
  holiday: TEXT.COMP_OT_SHIFT_HOLIDAY,
  unknown: '',
};

function formatDateLabel(dateStr: string) {
  const m = moment(dateStr, 'YYYY-MM-DD');
  return m.isValid() ? `${m.format('D MMMM')} ${m.year() + 543}` : dateStr;
}

function statusBadge(event: CompOtEvent, c: AppColors): ListCardBadge {
  if (event.flag_in && event.flag_out) {
    return { text: TEXT.COMP_OT_LEGEND_STAMPED_OUT, bg: c.successSoft, color: c.successOnSoft };
  }
  if (event.flag_in) {
    return { text: TEXT.COMP_OT_LEGEND_STAMPED_IN, bg: c.warningSoft, color: c.warningOnSoft };
  }
  return { text: TEXT.COMP_OT_LEGEND_NOT_STAMPED, bg: c.surfaceAlt, color: c.textMuted };
}

export default function CompOtHistoryScreen() {
  const c = useColors();
  const { isDarkMode } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId ?? '';

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState<CompOtEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = useCallback(
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
          scope: 'mine',
        });
        // Newest first — a history reads back-to-front.
        setEvents([...result.events].sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time)));
      } catch (err) {
        setEvents([]);
        setError(err instanceof Error ? err.message : TEXT.COMP_OT_HISTORY_LOAD_ERROR);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [staffId, visibleMonth],
  );

  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));

  const monthLabel = useMemo(
    () => `${moment(visibleMonth).format('MMMM')} ${visibleMonth.getFullYear() + 543}`,
    [visibleMonth],
  );

  function goToPreviousMonth() {
    setEvents([]);
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }
  function goToNextMonth() {
    setEvents([]);
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <NavTopBar title={TEXT.COMP_OT_HISTORY_TITLE} subtitle={TEXT.COMP_OT_HISTORY_SUBTITLE} tone="primary" />

      <View style={styles.monthNav}>
        <Pressable accessibilityRole="button" onPress={goToPreviousMonth} style={styles.monthNavButton}>
          <IconSymbol name="chevron.left" size={20} color={c.text} />
        </Pressable>
        <ThemedText style={styles.monthNavLabel}>{monthLabel}</ThemedText>
        <Pressable accessibilityRole="button" onPress={goToNextMonth} style={styles.monthNavButton}>
          <IconSymbol name="chevron.right" size={20} color={c.text} />
        </Pressable>
      </View>

      {isLoading && events.length === 0 ? (
        <LoadingAnimate title={TEXT.SHARED_LOADING_HISTORY} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadHistory()} />
      ) : (
        <FlatList<CompOtEvent>
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={events}
          keyExtractor={(item) => item.event_id}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => loadHistory(true)} tintColor={c.primary} colors={[c.primary]} />
          }
          renderItem={({ item }) => (
            <ListCard
              icon={<IconSymbol name="display" size={18} color={c.primary} />}
              title={SHIFT_TYPE_LABEL[item.shift_type] || item.shift_type}
              date={formatDateLabel(item.date)}
              meta={[{ text: `${item.start_time.slice(0, 5)} - ${item.end_time.slice(0, 5)}` }]}
              badge={statusBadge(item, c)}
              showChevron={false}
            />
          )}
          ListEmptyComponent={<EmptyState preset="history" message={TEXT.COMP_OT_HISTORY_EMPTY} />}
        />
      )}
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  monthNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceMuted,
  },
  monthNavLabel: {
    fontSize: 15,
    fontFamily: AppFonts.psuBold,
    color: c.text,
  },
  list: { flex: 1 },
  listContent: { flexGrow: 1, padding: 16 },
});
