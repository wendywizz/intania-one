import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { type AppColors, useThemedStyles } from '@/constants/theme';

import { ScreenHeader } from "@/components/screen-header";
import { ThemedView } from "@/components/themed-view";
import { TopTabs } from "@/components/ui";
import { TimestampForgotList } from "@/components/timestamp/timestamp-forgot-list";
import { TimestampHistoryList } from "@/components/timestamp/timestamp-history-list";
import { TEXT } from "@/constants/text";

type TimestampTab = "forgot" | "history";

const TABS: { key: TimestampTab; label: string }[] = [
  { key: "forgot", label: TEXT.TIMESTAMP_FORGOT_TAB },
  { key: "history", label: TEXT.SHARED_HISTORY },
];

export default function ForgotTimestampScreen() {
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
      <ScreenHeader title={TEXT.TIMESTAMP_FORGOT_TAB} backHref="/" titleInNavBar showHomeButton={false} />

      <TopTabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />

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
});
