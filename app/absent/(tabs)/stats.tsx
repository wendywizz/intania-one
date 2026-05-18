import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { TEXT } from "@/constants/text";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import { statsData } from "@/services/absentService";

interface StatsData {
  staffId: string;
  servantAge: number;
  budgetStartDate: string;
  budgetEndDate: string;
  absentLimitCount: number;
  absentLimitDays: number;
  absentUsedCount: number;
  absentUsedDays: number;
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
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function mapStatsData(data: unknown): StatsData | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const row = data as Record<keyof StatsData, unknown>;

  return {
    staffId: toText(row.staffId),
    servantAge: toNumber(row.servantAge),
    budgetStartDate: toText(row.budgetStartDate),
    budgetEndDate: toText(row.budgetEndDate),
    absentLimitCount: toNumber(row.absentLimitCount),
    absentLimitDays: toNumber(row.absentLimitDays),
    absentUsedCount: toNumber(row.absentUsedCount),
    absentUsedDays: toNumber(row.absentUsedDays),
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

function formatBudgetDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value || "-";
  }

  return `${day}/${month}/${year}`;
}

function formatNumber(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(2)));
}

function formatUnit(value: number, unit: string) {
  return `${formatNumber(value)} ${unit}`;
}

function formatRatio(used: number, limit: number, unit: string) {
  return `${formatNumber(used)} / ${formatNumber(limit)} ${unit}`;
}

function getProgress(used: number, limit: number) {
  if (limit <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (used / limit) * 100));
}

type StatCardProps = {
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
};

function StatCard({ label, value, subtext, color = "#0A6E8A" }: StatCardProps) {
  return (
    <ThemedView
      style={[styles.statCard, { borderLeftColor: color }]}
      lightColor="#FFFFFF"
      darkColor="#151718"
    >
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={[styles.statValue, { color }]}>
        {value}
      </ThemedText>
      {subtext ? (
        <ThemedText style={styles.statSubtext}>{subtext}</ThemedText>
      ) : null}
    </ThemedView>
  );
}

type UsageCardProps = {
  title: string;
  count?: string;
  days?: string;
  remain?: string;
  details?: string[];
  color: string;
  progress?: number;
};

function UsageCard({
  title,
  count,
  days,
  remain,
  details,
  color,
  progress,
}: UsageCardProps) {
  const progressWidth = `${progress ?? 0}%` as `${number}%`;

  return (
    <ThemedView
      style={styles.usageCard}
      lightColor="#FFFFFF"
      darkColor="#151718"
    >
      <View style={styles.usageHeader}>
        <ThemedText type="defaultSemiBold" style={styles.usageTitle}>
          {title}
        </ThemedText>
        {remain ? (
          <ThemedText style={[styles.remainText, { color }]}>
            {remain}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.usageValues}>
        {count ? (
          <View style={styles.usageMetric}>
            <ThemedText style={styles.metricLabel}>Times</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.metricValue}>
              {count}
            </ThemedText>
          </View>
        ) : null}

        {days ? (
          <View style={styles.usageMetric}>
            <ThemedText style={styles.metricLabel}>Days</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.metricValue}>
              {days}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {progress !== undefined ? (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: color, width: progressWidth },
            ]}
          />
        </View>
      ) : null}

      {details?.length ? (
        <View style={styles.detailList}>
          {details.map((detail) => (
            <ThemedText key={detail} style={styles.detailText}>
              {detail}
            </ThemedText>
          ))}
        </View>
      ) : null}
    </ThemedView>
  );
}

export default function StatsScreen() {
  const { user: authUser } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const userId = authUser?.staffId || USER_ID;

  const loadStats = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      try {
        const result = await statsData(userId);
        setStats(mapStatsData(result));
      } catch (error) {
        setStats(null);
        setError(
          error instanceof Error
            ? error.message
            : TEXT.SHARED_UNABLE_TO_LOAD_HISTORY,
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [userId],
  );

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <LoadingAnimate
          title="Loading Statistics"
          desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT}
        />
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <ThemedText type="subtitle">
            {TEXT.SHARED_SOMETHING_WENT_WRONG}
          </ThemedText>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      );
    }

    if (!stats) {
      return (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>No data available</ThemedText>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadStats(true)}
          />
        }
      >
        <View style={styles.heroSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Budget cycle
          </ThemedText>
          <View style={styles.statCardsRow}>
            <View style={styles.statCardFlex}>
              <StatCard
                label="Worked at company"
                value={`${stats.servantAge} years`}
                subtext="Service age"
                color="#0A6E8A"
              />
            </View>
            <View style={styles.statCardFlex}>
              <StatCard
                label="Company year cycle"
                value={formatBudgetDate(stats.budgetStartDate)}
                subtext={`to ${formatBudgetDate(stats.budgetEndDate)}`}
                color="#00796B"
              />
            </View>
          </View>
        </View>

        <View style={styles.detailSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Absence balance
          </ThemedText>
          <View style={styles.usageGrid}>
            <UsageCard
              title="All absences"
              count={formatRatio(
                stats.absentUsedCount,
                stats.absentLimitCount,
                "times",
              )}
              days={formatRatio(
                stats.absentUsedDays,
                stats.absentLimitDays,
                "days",
              )}
              color="#0A6E8A"
              progress={getProgress(
                stats.absentUsedDays,
                stats.absentLimitDays,
              )}
            />
            <UsageCard
              title={TEXT.ABSENT_SICK_TITLE}
              count={formatUnit(stats.sickUsedCount, "times")}
              days={formatUnit(stats.sickUsedDays, "days")}
              color="#D92D20"
            />
            <UsageCard
              title={TEXT.ABSENT_BUSINESS_TITLE}
              count={formatUnit(stats.businessUsedCount, "times")}
              days={formatUnit(stats.businessUsedDays, "days")}
              color="#7A5AF8"
            />
            <UsageCard
              title={TEXT.ABSENT_BIRTH_TITLE}
              count={formatUnit(stats.birthUsedCount, "times")}
              color="#C11574"
            />
            <UsageCard
              title={TEXT.ABSENT_RELAX_TITLE}
              days={formatRatio(
                stats.relaxUsedDays,
                stats.relaxTotalYearDays,
                "days",
              )}
              remain={`${formatNumber(stats.relaxRemainDays)} days left`}
              details={[
                `Stored from previous year: ${formatUnit(stats.relaxStoreDays, "days")}`,
                `Total this year: ${formatUnit(stats.relaxTotalYearDays, "days")}`,
                `Maximum accumulation: ${formatUnit(stats.relaxLimitDays, "days")}`,
              ]}
              color="#008A5D"
              progress={getProgress(
                stats.relaxUsedDays,
                stats.relaxTotalYearDays,
              )}
            />
            <UsageCard
              title="Late"
              count={formatRatio(
                stats.lateUsedCount,
                stats.lateLimitCount,
                "times",
              )}
              color="#B54708"
              progress={getProgress(stats.lateUsedCount, stats.lateLimitCount)}
            />
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.ABSENT_TITLE} />

      <View style={styles.content}>
        <ThemedView
          style={styles.panel}
          lightColor="#FFFFFF"
          darkColor="#1F2B30"
        >
          <ThemedText type="subtitle">Statistics</ThemedText>
          {renderContent()}
        </ThemedView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  panel: {
    flex: 1,
    borderRadius: 8,
    padding: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
  },
  heroSection: {
    marginBottom: 24,
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  statCardsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCardFlex: {
    flex: 1,
    minWidth: 150,
  },
  statCard: {
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D7E6EC",
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 18,
    color: "#687076",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 12,
    lineHeight: 18,
    color: "#687076",
  },
  usageGrid: {
    gap: 12,
  },
  usageCard: {
    borderRadius: 8,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D7E6EC",
  },
  usageHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    marginBottom: 14,
  },
  usageTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  remainText: {
    fontSize: 12,
    lineHeight: 18,
  },
  usageValues: {
    flexDirection: "row",
    gap: 12,
  },
  usageMetric: {
    flex: 1,
  },
  metricLabel: {
    color: "#687076",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 18,
    lineHeight: 24,
  },
  progressTrack: {
    backgroundColor: "#E8F0F3",
    borderRadius: 999,
    height: 8,
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: {
    borderRadius: 999,
    height: "100%",
  },
  detailList: {
    gap: 4,
    marginTop: 12,
  },
  detailText: {
    color: "#687076",
    fontSize: 12,
    lineHeight: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  },
  errorText: {
    color: "#B42318",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: "center",
  },
  spacer: {
    height: 20,
  },
});
