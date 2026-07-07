import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
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
  const yearBuddhist = parseInt(year, 10) + 543;
  return `${parseInt(day, 10)} ${monthName} ${yearBuddhist}`;
}

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

function getProgress(used: number, limit: number) {
  if (limit <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
}

function ProgressBar({ value, color = '#922124' }: { value: number; color?: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${value}%` as `${number}%`, backgroundColor: color }]} />
    </View>
  );
}

function InfoCard({ servantAge, budgetStartDate, budgetEndDate }: Pick<StatsData, 'servantAge' | 'budgetStartDate' | 'budgetEndDate'>) {
  return (
    <View style={styles.card}>
      <View style={styles.infoRow}>
        <View style={styles.infoIconWrap}>
          <IconSymbol name="person.fill" size={20} color="#585E6D" />
        </View>
        <View style={styles.infoText}>
          <ThemedText style={styles.infoLabel}>{TEXT.ABSENCE_STATS_WORK_AGE_LABEL}</ThemedText>
          <ThemedText style={styles.infoValue}>{servantAge} {TEXT.ABSENCE_STATS_WORK_AGE_UNIT}</ThemedText>
        </View>
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.infoRow}>
        <View style={styles.infoIconWrap}>
          <IconSymbol name="calendar" size={18} color="#585E6D" />
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
  return (
    <View style={styles.gridRow}>
      <View style={[styles.card, styles.gridCard]}>
        <View style={styles.gridCardTop}>
          <IconSymbol name="cross.fill" size={18} color="#922124" />
          <IconSymbol name="chevron.right" size={12} color="#585E6D" style={{ opacity: 0.4 }} />
        </View>
        <ThemedText style={styles.gridCardTitle}>{TEXT.ABSENCE_SICK_TITLE}</ThemedText>
        <View style={styles.gridStats}>
          <ThemedText style={styles.gridStatValue}>
            <ThemedText style={styles.gridStatBold}>{fmt(sickUsedCount)}</ThemedText>
            <ThemedText style={styles.gridStatUnit}> {TEXT.ABSENCE_STATS_UNIT_TIMES}</ThemedText>
          </ThemedText>
          <ThemedText style={styles.gridStatValue}>
            <ThemedText style={styles.gridStatBold}>{fmt(sickUsedDays)}</ThemedText>
            <ThemedText style={styles.gridStatUnit}> {TEXT.ABSENCE_STATS_UNIT_DAYS}</ThemedText>
          </ThemedText>
        </View>
      </View>
      <View style={[styles.card, styles.gridCard]}>
        <View style={styles.gridCardTop}>
          <IconSymbol name="briefcase.fill" size={18} color="#922124" />
          <IconSymbol name="chevron.right" size={12} color="#585E6D" style={{ opacity: 0.4 }} />
        </View>
        <ThemedText style={styles.gridCardTitle}>{TEXT.ABSENCE_BUSINESS_TITLE}</ThemedText>
        <View style={styles.gridStats}>
          <ThemedText style={styles.gridStatValue}>
            <ThemedText style={styles.gridStatBold}>{fmt(businessUsedCount)}</ThemedText>
            <ThemedText style={styles.gridStatUnit}> {TEXT.ABSENCE_STATS_UNIT_TIMES}</ThemedText>
          </ThemedText>
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
  const progress = getProgress(relaxUsedDays, relaxTotalYearDays);

  return (
    <View style={styles.card}>
      <View style={styles.vacationHeader}>
        <View style={styles.vacationIconBg}>
          <IconSymbol name="sun.max.fill" size={16} color="#922124" />
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

function OthersGridCard({ birthUsedCount, lateUsedCount, lateLimitCount }: Pick<StatsData, 'birthUsedCount' | 'lateUsedCount' | 'lateLimitCount'>) {
  const lateProgress = getProgress(lateUsedCount, lateLimitCount);

  return (
    <View style={styles.gridRow}>
      <View style={[styles.card, styles.gridCard]}>
        <View style={styles.gridCardTop}>
          <IconSymbol name="figure.child" size={18} color="#922124" />
          <IconSymbol name="chevron.right" size={12} color="#585E6D" style={{ opacity: 0.4 }} />
        </View>
        <ThemedText style={styles.gridCardTitle}>{TEXT.ABSENCE_BIRTH_TITLE}</ThemedText>
        <ThemedText style={styles.gridStatValue}>
          <ThemedText style={styles.gridStatBold}>{fmt(birthUsedCount)}</ThemedText>
          <ThemedText style={styles.gridStatUnit}> {TEXT.ABSENCE_STATS_UNIT_TIMES}</ThemedText>
        </ThemedText>
      </View>
      <View style={[styles.card, styles.gridCard]}>
        <View style={styles.gridCardTop}>
          <IconSymbol name="clock.fill" size={18} color="#922124" />
          <IconSymbol name="chevron.right" size={12} color="#585E6D" style={{ opacity: 0.4 }} />
        </View>
        <ThemedText style={styles.gridCardTitle}>{TEXT.ABSENCE_STATS_LATE_TITLE}</ThemedText>
        <ThemedText style={styles.gridStatValue}>
          <ThemedText style={styles.gridStatBold}>{fmt(lateUsedCount)}</ThemedText>
          <ThemedText style={styles.gridStatUnit}> / {fmt(lateLimitCount)} {TEXT.ABSENCE_STATS_UNIT_TIMES}</ThemedText>
        </ThemedText>
        <ProgressBar value={lateProgress} />
      </View>
    </View>
  );
}

export default function StatsScreen() {
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
      return <ErrorState variant="empty" title={TEXT.ABSENCE_STATS_NO_DATA} />;
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadStats(true)} />}
      >
        <View style={styles.pageHeader}>
          <ThemedText style={styles.pageTitle}>{TEXT.ABSENCE_STATS_TITLE}</ThemedText>
          <ThemedText style={styles.pageSubtitle}>{TEXT.ABSENCE_STATS_SUBTITLE}</ThemedText>
        </View>
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
        <OthersGridCard
          birthUsedCount={stats.birthUsedCount}
          lateUsedCount={stats.lateUsedCount}
          lateLimitCount={stats.lateLimitCount}
        />
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.ABSENCE_TITLE}
        subtitle={TEXT.ABSENCE_STATS_TITLE}
        moduleIcon="calendar-clock"
      />
      <View style={styles.content}>{renderContent()}</View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  pageHeader: {
    gap: 4,
  },
  pageTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    color: '#191C1F',
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#584140',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    gap: 16,
    paddingBottom: 96,
  },

  // shared card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(223, 191, 189, 0.3)',
    padding: 16,
    shadowColor: '#000',
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
    color: '#584140',
  },
  infoValue: {
    fontSize: 16,
    lineHeight: 24,
    color: '#191C1F',
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
    color: '#191C1F',
  },
  summarySubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: '#584140',
  },
  percentCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#922124',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    color: '#922124',
  },
  summaryTiles: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  summaryTile: {
    flex: 1,
    backgroundColor: '#F2F3F7',
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  tileLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    color: '#584140',
  },
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  tileValueBig: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: '#922124',
  },
  tileValueDim: {
    fontSize: 12,
    lineHeight: 18,
    color: '#584140',
  },

  // progress bar
  progressTrack: {
    height: 4,
    backgroundColor: '#DFBFBD',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gridCardTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#191C1F',
  },
  gridStats: {
    gap: 2,
    marginTop: 4,
  },
  gridStatValue: {
    fontSize: 14,
    lineHeight: 20,
    color: '#191C1F',
  },
  gridStatBold: {
    fontWeight: '700',
    color: '#922124',
  },
  gridStatUnit: {
    fontWeight: '400',
    color: '#191C1F',
  },

  // vacation card
  vacationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#922124',
  },
  vacationNumDim: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: '#584140',
  },
  usedBadge: {
    backgroundColor: '#DADFF0',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  usedBadgeText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    color: '#585E6D',
  },
  vacationDetails: {
    backgroundColor: '#F2F3F7',
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
    color: '#191C1F',
  },
  vacationDetailValue: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: '#191C1F',
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
    color: '#191C1F',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#B42318',
    textAlign: 'center',
  },
});
