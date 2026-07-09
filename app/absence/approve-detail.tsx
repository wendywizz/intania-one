import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { TEXT } from "@/constants/text";
import type { absence } from "@/models/types";
import { formatDateRange } from "@/utils/date-format";
import { navPush } from "@/utils/navigation";

function parseItemParam(value?: string | string[]): absence {
  const raw = Array.isArray(value) ? value[0] : value;

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(decodeURIComponent(raw)) as absence;
  } catch {
    return {};
  }
}

function getText(item: absence, fields: string[]) {
  for (const field of fields) {
    const value = item[field];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

type DetailRowProps = { label: string; value: string };

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View style={styles.row}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <ThemedText style={styles.value}>{value}</ThemedText>
    </View>
  );
}

export default function ApproveDetailScreen() {
  const params = useLocalSearchParams<{ item?: string }>();
  const item = useMemo(() => parseItemParam(params.item), [params.item]);

  // The list item id is the encoded "absence_id:approve_id:type:progress" used
  // by the save endpoint as `detail`.
  const detail = getText(item, ["id"]);
  const name = getText(item, ["name", "staffName", "staff_name", "fullname"]);
  const typeLabel =
    getText(item, ["approveName", "absentTypeName", "absenceTypeName"]) ||
    TEXT.ABSENCE_TITLE;
  const startDate = getText(item, ["startDate", "start_date"]);
  const endDate = getText(item, ["endDate", "end_date"]);
  const dateRange = formatDateRange(startDate, endDate);
  const reason = getText(item, ["reason"]);
  const agentList = getText(item, ["agentList", "agent_list"]);

  const goToDecision = (status: "1" | "2") => {
    navPush({
      pathname: "/absence/approve-reason",
      params: { detail, status },
    } as Parameters<typeof navPush>[0]);
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.ABSENCE_TITLE}
        subtitle={TEXT.ABSENCE_APPROVE_DETAIL_SUBTITLE}
        moduleIcon="calendar-clock"
        backHref="/absence/pending"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          {name ? (
            <DetailRow label={TEXT.ABSENCE_APPROVE_REQUESTER_LABEL} value={name} />
          ) : null}
          <DetailRow label={TEXT.ABSENCE_APPROVE_TYPE_LABEL} value={typeLabel} />
          {dateRange ? (
            <DetailRow label={TEXT.ABSENCE_LEAVE_DATE_LABEL} value={dateRange} />
          ) : null}
          {reason ? (
            <DetailRow label={TEXT.ABSENCE_REASON_LABEL} value={reason} />
          ) : null}
          {agentList ? (
            <DetailRow label={TEXT.ABSENCE_DELEGATE_LABEL} value={agentList} />
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => goToDecision("1")}
          style={[styles.actionButton, styles.acceptButton]}
        >
          <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
            {TEXT.ABSENCE_APPROVE_ACCEPT}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => goToDecision("2")}
          style={[styles.actionButton, styles.rejectButton]}
        >
          <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
            {TEXT.ABSENCE_APPROVE_REJECT}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FD",
  },
  scrollContent: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E8ECF0",
    paddingHorizontal: 16,
  },
  row: {
    gap: 4,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8ECF0",
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#687076",
  },
  value: {
    fontSize: 15,
    lineHeight: 22,
    color: "#191C1F",
  },
  bottomBar: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E8ECF0",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  acceptButton: {
    backgroundColor: "#12805C",
  },
  rejectButton: {
    backgroundColor: "#B42318",
  },
});
