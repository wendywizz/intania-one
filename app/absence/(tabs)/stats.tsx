import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { type AppColors, useColors, useScreenGutter, useThemedStyles } from '@/constants/theme';

import { ErrorState } from '@/components/error-state';
import { Inbox } from 'lucide-react-native';
import { EmptyState } from '@/components/empty-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import { statsData } from '@/services/absenceService';
import { boxShadow } from '@/constants/shadows';

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

function formatBudgetDateShort(value: string) {
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

// Two-row general info card: work age + budget cycle.
function InfoCard({ servantAge, budgetStartDate, budgetEndDate }: Pick<StatsData, 'servantAge' | 'budgetStartDate' | 'budgetEndDate'>) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.infoCard}>
      <ThemedText style={styles.cardHeader}>ข้อมูลทั่วไป</ThemedText>
      <View style={styles.infoDivider} />
      <View style={styles.infoRow}>
        <View style={styles.infoIconCircle}>
          <IconSymbol name="person.fill" size={18} color={c.text} />
        </View>
        <View style={styles.infoCycleText}>
          <ThemedText style={styles.infoLabel}>{TEXT.ABSENCE_STATS_WORK_AGE_LABEL}</ThemedText>
          <ThemedText style={styles.infoValue}>{fmt(servantAge)} {TEXT.ABSENCE_STATS_WORK_AGE_UNIT}</ThemedText>
        </View>
      </View>
      <View style={styles.infoDivider} />
      <View style={styles.infoRow}>
        <View style={styles.infoIconCircle}>
          <IconSymbol name="calendar" size={18} color={c.text} />
        </View>
        <View style={styles.infoCycleText}>
          <ThemedText style={styles.infoLabel}>{TEXT.ABSENCE_STATS_CYCLE_DATE_LABEL}</ThemedText>
          <ThemedText style={styles.infoValue} numberOfLines={1}>
            {formatBudgetDateShort(budgetStartDate)} – {formatBudgetDateShort(budgetEndDate)}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

/**
 * One quota: how much of an allowance has been used, and how much is left.
 *
 * A white card like everything else on the screen, with the colour carried by
 * the icon and the bar rather than by a saturated slab — two full-bleed blocks
 * of blue and green shouted louder than the numbers they contained, and the
 * numbers are the point.
 *
 * The used figure is the headline, the allowance sits beside it in words, and
 * the remainder is stated outright: "ยังลาได้อีกกี่วัน" is the question the
 * screen is opened with, and making someone subtract to get it is work the
 * screen should have done.
 */
function StatTile({
  label,
  icon,
  used,
  total,
  unit,
  tint,
}: {
  label: string;
  icon: 'arrow.triangle.2.circlepath' | 'calendar';
  used: number;
  total: number;
  unit: string;
  tint: string;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const pct = getProgress(used, total);
  const remain = total - used;
  const over = remain < 0;

  return (
    <View style={styles.tile}>
      <View style={styles.tileHeader}>
        <View style={[styles.tileIcon, { backgroundColor: withAlpha(tint, 0.14) }]}>
          <IconSymbol name={icon} size={16} color={tint} />
        </View>
        <ThemedText style={styles.tileLabel} numberOfLines={2}>
          {label}
        </ThemedText>
      </View>

      <View style={styles.tileValueRow}>
        <ThemedText style={[styles.tileValueBig, { color: tint }]}>{fmt(used)}</ThemedText>
        <ThemedText style={styles.tileValueUnit}>{unit}</ThemedText>
      </View>

      <ThemedText style={styles.tileLimit}>
        {fill(TEXT.ABSENCE_STATS_OF_LIMIT, { total: fmt(total), unit })}
      </ThemedText>

      {/* The bar is the only place the percentage appears — as a length rather
          than a number, since "62%" of a leave quota is not a figure anyone
          quotes, but "most of it is gone" is worth seeing at a glance. */}
      <View style={styles.tileTrack}>
        <View
          style={[
            styles.tileFill,
            { width: `${pct}%`, backgroundColor: over ? c.danger : tint },
          ]}
        />
      </View>

      <ThemedText style={[styles.tileRemain, over && { color: c.danger }]}>
        {over
          ? fill(TEXT.ABSENCE_STATS_OVER_LIMIT, { over: fmt(Math.abs(remain)), unit })
          : fill(TEXT.ABSENCE_STATS_REMAINING, { remain: fmt(remain), unit })}
      </ThemedText>
    </View>
  );
}

/** The same colour at a fraction of its strength, as #RRGGBBAA. */
function withAlpha(hex: string, alpha: number) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const aa = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${aa}`;
}

function fill(template: string, values: Record<string, string | number>) {
  return Object.keys(values).reduce(
    (text, key) => text.replace(`{${key}}`, String(values[key])),
    template,
  );
}

type TypeRowIcon = 'cross.fill' | 'briefcase.fill' | 'sun.max.fill' | 'clock.fill';

// File-upload style card row: neutral icon circle, title, and two colour-coded
// metric chips on the trailing edge — how many times the user has been absent
// (blue, matching the "count" tile) and for how many days (green, matching the
// "days" tile). A chip is only shown when that metric applies to the type.
function TypeRow({ icon, title, times, timesMax, days, daysMax }: { icon: TypeRowIcon; title: string; times?: number; timesMax?: number; days?: number; daysMax?: number }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.typeRow}>
      <View style={styles.typeIconCircle}>
        <IconSymbol name={icon} size={22} color={c.text} />
      </View>
      <ThemedText style={styles.typeTitle}>{title}</ThemedText>
      <View style={styles.metrics}>
        {times !== undefined ? (
          <View style={[styles.metricChip, { backgroundColor: c.info }]}>
            <ThemedText style={[styles.metricValue, { color: c.textOnPrimary }]}>
              {timesMax !== undefined ? `${fmt(times)}/${fmt(timesMax)}` : fmt(times)}
            </ThemedText>
            <ThemedText style={[styles.metricUnit, { color: c.textOnPrimary }]}>{TEXT.ABSENCE_STATS_UNIT_TIMES}</ThemedText>
          </View>
        ) : null}
        {days !== undefined ? (
          <View style={[styles.metricChip, { backgroundColor: c.success }]}>
            <ThemedText style={[styles.metricValue, { color: c.textOnPrimary }]}>
              {daysMax !== undefined ? `${fmt(days)}/${fmt(daysMax)}` : fmt(days)}
            </ThemedText>
            <ThemedText style={[styles.metricUnit, { color: c.textOnPrimary }]}>{TEXT.ABSENCE_STATS_UNIT_DAYS}</ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function StatsScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const gutter = useScreenGutter();
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
    // Only while there is nothing to show; see components/timestamp/timestamp-forgot-list.
    if (isLoading && !stats) {
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

    const usedCount = stats.sickUsedCount + stats.businessUsedCount;
    const usedDays = stats.sickUsedDays + stats.businessUsedDays;

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: gutter }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadStats(true)} />}
      >
        <InfoCard
          servantAge={stats.servantAge}
          budgetStartDate={stats.budgetStartDate}
          budgetEndDate={stats.budgetEndDate}
        />

        <View style={styles.tileRow}>
          <StatTile
            label={TEXT.ABSENCE_STATS_OCCURRENCES}
            icon="arrow.triangle.2.circlepath"
            used={usedCount}
            total={ABSENCE_MAX_TIMES}
            unit={TEXT.ABSENCE_STATS_UNIT_TIMES}
            tint={c.info}
          />
          <StatTile
            label={TEXT.ABSENCE_STATS_TOTAL_DAYS_LABEL}
            icon="calendar"
            used={usedDays}
            total={ABSENCE_MAX_DAYS}
            unit={TEXT.ABSENCE_STATS_UNIT_DAYS}
            tint={c.success}
          />
        </View>

        <View style={styles.typeListCard}>
          <ThemedText style={styles.cardHeader}>ข้อมูลการลา</ThemedText>
          <View style={styles.rowDivider} />
          <TypeRow
            icon="cross.fill"
            title={TEXT.ABSENCE_SICK_TITLE}
            times={stats.sickUsedCount}
            days={stats.sickUsedDays}
          />
          <View style={styles.rowDivider} />
          <TypeRow
            icon="briefcase.fill"
            title={TEXT.ABSENCE_BUSINESS_TITLE}
            times={stats.businessUsedCount}
            days={stats.businessUsedDays}
          />
          <View style={styles.rowDivider} />
          <TypeRow
            icon="sun.max.fill"
            title={TEXT.ABSENCE_RELAX_TITLE}
            days={stats.relaxUsedDays}
            daysMax={stats.relaxTotalYearDays}
          />
          <View style={styles.rowDivider} />
          <TypeRow
            icon="clock.fill"
            title={TEXT.ABSENCE_STATS_LATE_TITLE}
            times={stats.lateUsedCount}
            timesMax={stats.lateLimitCount}
          />
        </View>
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={TEXT.ABSENCE_STATS_TITLE} backHref="/" titleInNavBar showHomeButton={false} />
      <View style={styles.content}>{renderContent()}</View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 28,
    paddingBottom: 96,
    gap: 12,
  },

  // shared soft card look
  infoCard: {
    backgroundColor: c.surface,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingVertical: 6,
    paddingHorizontal: 16,
    boxShadow: boxShadow(c.shadow, { y: 3, blur: 10, opacity: 0.06 }),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  infoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoCycleText: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 14,
    lineHeight: 19,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  infoValue: {
    fontSize: 15,
    lineHeight: 20,
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },

  // gauge tiles
  tileRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tile: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 16,
    gap: 8,
    boxShadow: boxShadow(c.shadow, { y: 3, blur: 10, opacity: 0.06 }),
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tileIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tileLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  // Baseline-aligned so the unit sits on the same line as the number rather
  // than floating beside its cap height.
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginTop: 2,
  },
  tileValueBig: {
    fontSize: 32,
    lineHeight: 38,
    fontFamily: AppFonts.psuBold,
  },
  tileValueUnit: {
    fontSize: 14,
    lineHeight: 19,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  tileLimit: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textFaint,
    fontFamily: AppFonts.psuRegular,
  },
  tileTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: c.surfaceMuted,
    overflow: 'hidden',
    marginTop: 4,
  },
  tileFill: {
    height: '100%',
    borderRadius: 3,
  },
  tileRemain: {
    fontSize: 13,
    lineHeight: 18,
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },

  // leave-type list
  cardHeader: {
    fontSize: 15,
    lineHeight: 21,
    color: c.text,
    fontFamily: AppFonts.psuBold,
    paddingTop: 16,
    paddingBottom: 14,
  },
  typeListCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingHorizontal: 16,
    boxShadow: boxShadow(c.shadow, { y: 3, blur: 10, opacity: 0.06 }),
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 26,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },
  typeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  typeTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  metricValue: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: AppFonts.psuBold,
  },
  metricUnit: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: AppFonts.psuRegular,
  },
});
