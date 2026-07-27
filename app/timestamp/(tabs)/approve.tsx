import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { ScreenHeader } from "@/components/screen-header";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { TimestampApprovalList } from "@/components/timestamp/timestamp-approval-list";
import { TimestampApprovedList } from "@/components/timestamp/timestamp-approved-list";
import { TEXT } from "@/constants/text";

type ApproveTab = "pending" | "history";

const TABS: { key: ApproveTab; label: string }[] = [
  { key: "pending", label: TEXT.TIMESTAMP_APPROVE_PENDING_TAB },
  { key: "history", label: TEXT.TIMESTAMP_APPROVE_HISTORY_TAB },
];

export default function TimestampApproveScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<ApproveTab>(
    params.tab === "history" ? "history" : "pending",
  );

  useEffect(() => {
    if (params.tab === "history") setActiveTab("history");
    else if (params.tab === "pending") setActiveTab("pending");
  }, [params.tab]);

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={TEXT.TIMESTAMP_APPROVE_TAB} backHref="/" titleInNavBar showHomeButton={false} />

      <View style={styles.topTabBar}>
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={styles.topTab}
              onPress={() => setActiveTab(tab.key)}
            >
              <ThemedText style={[styles.topTabText, active && styles.topTabTextActive]}>
                {tab.label}
              </ThemedText>
              <View style={[styles.topTabIndicator, active && styles.topTabIndicatorActive]} />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.content}>
        {activeTab === "pending" ? (
          <TimestampApprovalList />
        ) : (
          <TimestampApprovedList />
        )}
      </View>
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
  topTabBar: {
    flexDirection: "row",
    backgroundColor: c.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  topTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 12,
    gap: 8,
  },
  topTabText: { fontSize: 14, fontWeight: "600", color: c.textFaint },
  topTabTextActive: { color: c.primary },
  topTabIndicator: { height: 3, width: 28, borderRadius: 2, backgroundColor: "transparent" },
  topTabIndicatorActive: { backgroundColor: c.primary },
});
