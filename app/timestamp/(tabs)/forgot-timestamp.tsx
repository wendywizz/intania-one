import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { TimestampForgotList } from "@/components/timestamp/timestamp-forgot-list";
import { TimestampHistoryList } from "@/components/timestamp/timestamp-history-list";
import { TEXT } from "@/constants/text";

type TimestampTab = "forgot" | "history";

const TABS: { key: TimestampTab; label: string }[] = [
  { key: "forgot", label: TEXT.TIMESTAMP_FORGOT_TAB },
  { key: "history", label: TEXT.SHARED_HISTORY },
];

export default function ForgotTimestampScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<TimestampTab>(
    params.tab === "history" ? "history" : "forgot",
  );

  // Keep the active tab in sync when navigated to with an explicit ?tab= value
  // (e.g. the back button from the history detail screen).
  useEffect(() => {
    if (params.tab === "history") setActiveTab("history");
    else if (params.tab === "forgot") setActiveTab("forgot");
  }, [params.tab]);

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar
        title={TEXT.TIMESTAMP_TITLE}
        subtitle={activeTab === "history" ? TEXT.TIMESTAMP_FORGOT_HISTORY_SUBTITLE : TEXT.TIMESTAMP_LIST_SUBTITLE}
        moduleIcon="clock.fill"
        backHref="/"
      />

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
        {activeTab === "forgot" ? <TimestampForgotList /> : <TimestampHistoryList />}
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
