import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { ErrorState } from '@/components/error-state';
import { Inbox } from 'lucide-react-native';
import { EmptyState } from '@/components/empty-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TEXT } from '@/constants/text';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import { statsData } from '@/services/absenceService';

interface StatsData {
  staffId: string;
  servantAge: number;
  budgetStartDate: string;
  budgetEndDate: string;
  absenceLimitCount: number;
  absenceLimitDays: number;
  absenceUsedCount: number;
  absenceUsedDays: number;
  sickUsedCount: number;
  sickUsedDays: number;
  businessUsedCount: number;
  businessUsedDays: number;
  birthUsedCount: number;
  relaxStoreDays: number;
  relaxTotalYearDays: number;
  relaxUsedDays: number;
  relaxRemainDays: number;
  relaxLimitDays: number;
  lateLimitCount: number;
  lateUsedCount: number;
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toText(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function mapStatsData(data: unknown): StatsData | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<keyof StatsData, unknown>;
  return {
    staffId: toText(row.staffId),
    servantAge: toNumber(row.servantAge),
    budgetStartDate: toText(row.budgetStartDate),
    budgetEndDate: toText(row.budgetEndDate),
    absenceLimitCount: toNumber(row.absenceLimitCount),
    absenceLimitDays: toNumber(row.absenceLimitDays),
    absenceUsedCount: toNumber(row.absenceUsedCount),
    absenceUsedDays: toNumber(row.absenceUsedDays),
    sickUsedCount: toNumber(row.sickUsedCount),
    sickUsedDays: toNumber(row.sickUsedDays),
    businessUsedCount: toNumber(row.businessUsedCount),
    businessUsedDays: toNumber(row.businessUsedDays),
    birthUsedCount: toNumber(row.birthUsedCount),
    relaxStoreDays: toNumber(row.relaxStoreDays),
    relaxTotalYearDays: toNumber(row.relaxTotalYearDays),
    relaxUsedDays: toNumber(row.relaxUsedDays),
    relaxRemainDays: toNumber(row.relaxRemainDays),
    relaxLimitDays: toNumber(row.relaxLimitDays),
    lateLimitCount: toNumber(row.lateLimitCount),
    lateUsedCount: toNumber(row.lateUsedCount),
  };
}

const ABSENCE_MAX_TIMES = 18;
const ABSENCE_MAX_DAYS = 45;

const MONTH_NAMES_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

function formatBudgetDateLong(value: string) {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value || '-';
  const monthName = MONTH_NAMES_TH[parseInt(month, 10) - 1] ?? month;
  const parsedYear = parseInt(year, 10);
  // Backend may already send the Buddhist year — only convert CE (<= 2500).
  const yearBuddhist = parsedYear > 2500 ? parsedYear : parsedYear + 543;
  return `${parseInt(day, 10)} ${monthName} ${yearBuddhist}`;
}

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

function getProgress(used: number, limit: number) {
  if (limit <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
}

function ProgressBar({ value, color }: { value: number; color?: string }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${value}%` as `${number}%`, backgroundColor: color ?? c.primary }]} />
    </View>
  );
}

function InfoCard({ servantAge, budgetStartDate, budgetEndDate }: Pick<StatsData, 'servantAge' | 'budgetStartDate' | 'budgetEndDate'>) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.card}>
      <ThemedText style={styles.sectionTitle}>{TEXT.ABSENCE_STATS_GENERAL_SECTION}</ThemedText>
      <View style={styles.infoRow}>
        <View style={styles.infoIconWrap}>
          <IconSymbol name="person.fill" size={20} color={c.textMuted} />
        </View>
        <View style={styles.infoText}>
          <ThemedText style={styles.infoLabel}>{TEXT.ABSENCE_STATS_WORK_AGE_LABEL}</ThemedText>
          <ThemedText style={styles.infoValue}>{servantAge} {TEXT.ABSENCE_STATS_WORK_AGE_UNIT}</ThemedText>
        </View>
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.infoRow}>
        <View style={styles.infoIconWrap}>
          <IconSymbol name="calendar" size={18} color={c.textMuted} />
        </View>
        <View style={styles.infoText}>
          <ThemedText style={styles.infoLabel}>{TEXT.ABSENCE_STATS_CYCLE_DATE_LABEL}</ThemedText>
          <ThemedText style={styles.infoValue}>
            {formatBudgetDateLong(budgetStartDate)} – {formatBudgetDateLong(budgetEndDate)}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

function SummaryCard({ absenceUsedCount, absenceLimitCount, absenceUsedDays, absenceLimitDays }: Pick<StatsData, 'absenceUsedCount' | 'absenceLimitCount' | 'absenceUsedDays' | 'absenceLimitDays'>) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const pct = getProgress(absenceUsedDays, absenceLimitDays);
  const countProgress = getProgress(absenceUsedCount, absenceLimitCount);
  const daysProgress = getProgress(absenceUsedDays, absenceLimitDays);

  return (
    <View style={styles.card}>
      <View style={styles.summaryHeader}>
        <View style={styles.summaryTitleBlock}>
          <ThemedText style={styles.summaryTitle}>{TEXT.ABSENCE_STATS_ALL_ABSENCES}</ThemedText>
          <ThemedText style={styles.summarySubtitle}>{TEXT.ABSENCE_STATS_USAGE_OVERVIEW}</ThemedText>
        </View>
        <View style={styles.percentCircle}>
          <ThemedText style={styles.percentText}>{pct}%</ThemedText>
        </View>
      </View>
      <View style={styles.summaryTiles}>
        <View style={styles.summaryTile}>
          <ThemedText style={styles.tileLabel}>{TEXT.ABSENCE_STATS_OCCURRENCES}</ThemedText>
          <View style={styles.tileValueRow}>
            <ThemedText style={styles.tileValueBig}>{fmt(absenceUsedCount)}</ThemedText>
            <ThemedText style={styles.tileValueDim}> /{fmt(absenceLimitCount)}</ThemedText>
          </View>
          <ProgressBar value={countProgress} />
        </View>
        <View style={styles.summaryTile}>
          <ThemedText style={styles.tileLabel}>{TEXT.ABSENCE_STATS_TOTAL_DAYS_LABEL}</ThemedText>
          <View style={styles.tileValueRow}>
            <ThemedText style={styles.tileValueBig}>{fmt(absenceUsedDays)}</ThemedText>
            <ThemedText style={styles.tileValueDim}> /{fmt(absenceLimitDays)}</ThemedText>
          </View>
          <ProgressBar value={daysProgress} />
        </View>
      </View>
    </View>
  );
}

function DetailGridCard({ sickUsedCount, sickUsedDays, businessUsedCount, businessUsedDays }: Pick<StatsData, 'sickUsedCount' | 'sickUsedDays' | 'businessUsedCount' | 'businessUsedDays'>) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.gridRow}>
      <View style={[styles.card, styles.gridCard]}>
        <View style={styles.gridCardTop}>
          <View style={styles.vacationIconBg}>
            <IconSymbol name="cross.fill" size={18} color={c.primary} />
          </View>
          <ThemedText style={styles.gridCardTitle}>{TEXT.ABSENCE_SICK_TITLE}</ThemedText>
          <IconSymbol name="chevron.right" size={12} color={c.textMuted} style={{ opacity: 0.4 }} />
        </View>
        <View style={styles.gridStats}>
          <ThemedText style={styles.gridStatValue}>
            <ThemedText style={styles.gridStatBold}>{fmt(sickUsedCount)}</ThemedText>
            <ThemedText style={styles.gridStatUnit}> {TEXT.ABSENCE_STATS_UNIT_TIMES}</ThemedText>
          </ThemedText>
          <ThemedText style={styles.gridStatSeparator}>·</ThemedText>
          <ThemedText style={styles.gridStatValue}>
            <ThemedText style={styles.gridStatBold}>{fmt(sickUsedDays)}</ThemedText>
            <ThemedText style={styles.gridStatUnit}> {TEXT.ABSENCE_STATS_UNIT_DAYS}</ThemedText>
          </ThemedText>
        </View>
      </View>
      <View style={[styles.card, styles.gridCard]}>
        <View style={styles.gridCardTop}>
          <View style={styles.vacationIconBg}>
            <IconSymbol name="briefcase.fill" size={18} color={c.primary} />
          </View>
          <ThemedText style={styles.gridCardTitle}>{TEXT.ABSENCE_BUSINESS_TITLE}</ThemedText>
          <IconSymbol name="chevron.right" size={12} color={c.textMuted} style={{ opacity: 0.4 }} />
        </View>
        <View style={styles.gridStats}>
          <ThemedText style={styles.gridStatValue}>
            <ThemedText style={styles.gridStatBold}>{fmt(businessUsedCount)}</ThemedText>
            <ThemedText style={styles.gridStatUnit}> {TEXT.ABSENCE_STATS_UNIT_TIMES}</ThemedText>
          </ThemedText>
          <ThemedText style={styles.gridStatSeparator}>·</ThemedText>
          <ThemedText style={styles.gridStatValue}>
            <ThemedText style={styles.gridStatBold}>{fmt(businessUsedDays)}</ThemedText>
            <ThemedText style={styles.gridStatUnit}> {TEXT.ABSENCE_STATS_UNIT_DAYS}</ThemedText>
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

function VacationCard({ relaxUsedDays, relaxTotalYearDays, relaxStoreDays, relaxLimitDays }: Pick<StatsData, 'relaxUsedDays' | 'relaxTotalYearDays' | 'relaxStoreDays' | 'relaxLimitDays'>) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const progress = getProgress(relaxUsedDays, relaxTotalYearDays);

  return (
    <View style={styles.card}>
      <View style={styles.vacationHeader}>
        <View style={styles.vacationIconBg}>
          <IconSymbol name="sun.max.fill" size={16} color={c.primary} />
        </View>
        <View style={styles.vacationTitleBlock}>
          <ThemedText style={styles.summaryTitle}>{TEXT.ABSENCE_RELAX_TITLE}</ThemedText>
          <ThemedText style={styles.summarySubtitle}>{TEXT.ABSENCE_STATS_VACATION_ANNUAL}</ThemedText>
        </View>
      </View>
      <View style={styles.vacationUsage}>
        <View style={styles.vacationBigNum}>
          <ThemedText style={styles.vacationNumBig}>{fmt(relaxUsedDays)} </ThemedText>
          <ThemedText style={styles.vacationNumDim}>/ {fmt(relaxTotalYearDays)} {TEXT.ABSENCE_STATS_UNIT_DAYS}</ThemedText>
        </View>
        <View style={styles.usedBadge}>
          <ThemedText style={styles.usedBadgeText}>{TEXT.ABSENCE_STATS_USED_THIS_YEAR}</ThemedText>
        </View>
      </View>
      <ProgressBar value={progress} />
      <View style={styles.vacationDetails}>
        <View style={styles.vacationDetailRow}>
          <ThemedText style={styles.vacationDetailLabel}>{TEXT.ABSENCE_STATS_DAYS_FROM_PREV_YEAR}</ThemedText>
          <ThemedText style={styles.vacationDetailValue}>{fmt(relaxStoreDays)}</ThemedText>
        </View>
        <View style={styles.vacationDetailRow}>
          <ThemedText style={styles.vacationDetailLabel}>{TEXT.ABSENCE_STATS_TOTAL_DAYS_THIS_YEAR}</ThemedText>
          <ThemedText style={styles.vacationDetailValue}>{fmt(relaxTotalYearDays)}</ThemedText>
        </View>
        <View style={styles.vacationDetailRow}>
          <ThemedText style={styles.vacationDetailLabel}>{TEXT.ABSENCE_STATS_MAX_ACCUMULATION}</ThemedText>
          <ThemedText style={styles.vacationDetailValue}>{fmt(relaxLimitDays)}</ThemedText>
        </View>
      </View>
    </View>
  );
}

function LateCard({ lateUsedCount, lateLimitCount }: Pick<StatsData, 'lateUsedCount' | 'lateLimitCount'>) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const lateProgress = getProgress(lateUsedCount, lateLimitCount);

  return (
    <View style={styles.card}>
      <View style={styles.gridCardTop}>
        <View style={styles.vacationIconBg}>
          <IconSymbol name="clock.fill" size={18} color={c.primary} />
        </View>
        <ThemedText style={styles.gridCardTitle}>{TEXT.ABSENCE_STATS_LATE_TITLE}</ThemedText>
        <IconSymbol name="chevron.right" size={12} color={c.textMuted} style={{ opacity: 0.4 }} />
      </View>
      <ThemedText style={styles.gridStatValue}>
        <ThemedText style={styles.gridStatBold}>{fmt(lateUsedCount)}</ThemedText>
        <ThemedText style={styles.gridStatUnit}> / {fmt(lateLimitCount)} {TEXT.ABSENCE_STATS_UNIT_TIMES}</ThemedText>
      </ThemedText>
      <ProgressBar value={lateProgress} />
    </View>
  );
}

export default function StatsScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user: authUser } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const userId = authUser?.staffId || USER_ID;

  const loadStats = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setError('');
      try {
        const result = await statsData(userId);
        setStats(mapStatsData(result));
      } catch (err) {
        setStats(null);
        setError(err instanceof Error ? err.message : TEXT.SHARED_UNABLE_TO_LOAD_HISTORY);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [userId],
  );

  useFocusEffect(useCallback(() => { loadStats(); }, [loadStats]));

  const renderContent = () => {
    if (isLoading) {
      return <LoadingAnimate title={TEXT.ABSENCE_STATS_LOADING_TITLE} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />;
    }
    if (error) {
      return (
        <ErrorState
          title={TEXT.SHARED_SOMETHING_WENT_WRONG}
          message={error}
          onRetry={() => loadStats()}
        />
      );
    }
    if (!stats) {
      return <EmptyState icon={Inbox} message={TEXT.ABSENCE_STATS_NO_DATA} />;
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadStats(true)} />}
      >
        <InfoCard
          servantAge={stats.servantAge}
          budgetStartDate={stats.budgetStartDate}
          budgetEndDate={stats.budgetEndDate}
        />
        <SummaryCard
          absenceUsedCount={stats.sickUsedCount + stats.businessUsedCount}
          absenceLimitCount={ABSENCE_MAX_TIMES}
          absenceUsedDays={stats.sickUsedDays + stats.businessUsedDays}
          absenceLimitDays={ABSENCE_MAX_DAYS}
        />
        <DetailGridCard
          sickUsedCount={stats.sickUsedCount}
          sickUsedDays={stats.sickUsedDays}
          businessUsedCount={stats.businessUsedCount}
          businessUsedDays={stats.businessUsedDays}
        />
        <VacationCard
          relaxUsedDays={stats.relaxUsedDays}
          relaxTotalYearDays={stats.relaxTotalYearDays}
          relaxStoreDays={stats.relaxStoreDays}
          relaxLimitDays={stats.relaxLimitDays}
        />
        <LateCard
          lateUsedCount={stats.lateUsedCount}
          lateLimitCount={stats.lateLimitCount}
        />
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={TEXT.ABSENCE_STATS_TITLE} backHref="/" />
      <View style={styles.content}>{renderContent()}</View>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 24,
    gap: 16,
    paddingBottom: 96,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: c.text,
  },

  // shared card
  card: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(223, 191, 189, 0.3)',
    padding: 16,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    gap: 8,
  },

  // info card
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoIconWrap: {
    width: 32,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: c.textMuted,
  },
  infoValue: {
    fontSize: 16,
    lineHeight: 24,
    color: c.text,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(223, 191, 189, 0.2)',
    marginVertical: 4,
  },

  // summary card
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryTitleBlock: {
    flex: 1,
    gap: 4,
    marginRight: 12,
  },
  summaryTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: c.text,
  },
  summarySubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: c.textMuted,
  },
  percentCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.surface,
    borderWidth: 4,
    borderColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    color: c.primary,
  },
  summaryTiles: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  summaryTile: {
    flex: 1,
    backgroundColor: c.surfaceMuted,
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  tileLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    color: c.textMuted,
  },
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  tileValueBig: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: c.primary,
  },
  tileValueDim: {
    fontSize: 12,
    lineHeight: 18,
    color: c.textMuted,
  },

  // progress bar
  progressTrack: {
    height: 4,
    backgroundColor: c.primarySoft,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },

  // grid row
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    gap: 4,
    padding: 16,
  },
  gridCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  gridCardTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: c.text,
  },
  gridStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  gridStatSeparator: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textFaint,
  },
  gridStatValue: {
    fontSize: 14,
    lineHeight: 20,
    color: c.text,
  },
  gridStatBold: {
    fontWeight: '700',
    color: c.primary,
  },
  gridStatUnit: {
    fontWeight: '400',
    color: c.text,
  },

  // vacation card
  vacationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  vacationIconBg: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(179, 57, 57, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vacationTitleBlock: {
    flex: 1,
    gap: 2,
  },
  vacationUsage: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  vacationBigNum: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  vacationNumBig: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    color: c.primary,
  },
  vacationNumDim: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: c.textMuted,
  },
  usedBadge: {
    backgroundColor: c.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  usedBadgeText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    color: c.textMuted,
  },
  vacationDetails: {
    backgroundColor: c.surfaceMuted,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 4,
  },
  vacationDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(223, 191, 189, 0.3)',
  },
  vacationDetailLabel: {
    fontSize: 14,
    lineHeight: 20,
    color: c.text,
  },
  vacationDetailValue: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: c.text,
  },

  // states
  stateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: c.danger,
    textAlign: 'center',
  },
});
