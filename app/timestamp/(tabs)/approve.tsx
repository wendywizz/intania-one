import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { type AppColors, useThemedStyles } from '@/constants/theme';

import { ScreenHeader } from "@/components/screen-header";
import { ThemedView } from "@/components/themed-view";
import { TopTabs } from "@/components/ui";
import { TimestampApprovalList } from "@/components/timestamp/timestamp-approval-list";
import { TimestampApprovedList } from "@/components/timestamp/timestamp-approved-list";
import { TEXT } from "@/constants/text";

type ApproveTab = "pending" | "history";

const TABS: { key: ApproveTab; label: string }[] = [
  { key: "pending", label: TEXT.TIMESTAMP_APPROVE_PENDING_TAB },
  { key: "history", label: TEXT.TIMESTAMP_APPROVE_HISTORY_TAB },
];

export default function TimestampApproveScreen() {
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

      <TopTabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />

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
});
