import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { TEXT } from "@/constants/text";
import type { ForgotTimestampHistory } from "@/services/timestampService";
import { formatDateAndTime, formatFullDate } from "@/utils/date-format";

const dateFields = new Set([
  "date",
  "workDate",
  "work_date",
  "stampDate",
  "stamp_date",
  "timestampDate",
  "timestamp_date",
  "requestDate",
  "request_date",
  "createdAt",
  "created_at",
  "writeDate",
  "write_date",
  "dateAdd",
  "date_add",
]);
const writeDateFields = new Set([
  "date",
  "writeDate",
  "write_date",
  "requestDate",
  "request_date",
  "createdAt",
  "created_at",
  "dateAdd",
  "date_add",
]);
const stampDateFields = new Set([
  "workDate",
  "work_date",
  "stampDate",
  "stamp_date",
  "timestampDate",
  "timestamp_date",
]);
const stampTypeFields = new Set(["stampType", "stamp_type", "type"]);
const timeFields = new Set(["inTime", "in_time", "outTime", "out_time"]);
const statusFields = new Set(["status"]);
const approverNameFields = new Set([
  "approverName",
  "approver_name",
  "approverFullName",
  "approver_full_name",
]);
const approverPositionNameFields = new Set([
  "approverPositionName",
  "approver_position_name",
  "approverPositionTitle",
  "approver_position_title",
]);
const LOADING_DELAY_MS = 500;
const hiddenFields = new Set([
  "id",
  "staffId",
  "staff_id",
  "deptId",
  "dept_id",
  "departmentId",
  "department_id",
  "approverPosition",
  "approver_position",
  "datetime",
  "dateTime",
  "date_time",
]);

function getText(item: ForgotTimestampHistory, fields: Set<string>) {
  for (const field of fields) {
    const value = item[field];

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
}

function parseItem(value: string | string[] | undefined): ForgotTimestampHistory {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    return parsedValue && typeof parsedValue === "object"
      ? (parsedValue as ForgotTimestampHistory)
      : {};
  } catch {
    return {};
  }
}

type DetailRow = {
  field: string;
  label: string;
  displayValue: string;
  value: unknown;
};

function getFieldRank(field: string) {
  if (writeDateFields.has(field)) {
    return 0;
  }

  if (stampDateFields.has(field)) {
    return 1;
  }

  if (timeFields.has(field)) {
    return 2;
  }

  return 3;
}

function buildDetailRows(item: ForgotTimestampHistory): DetailRow[] {
  const approverName = getText(item, approverNameFields);
  const stampTime = getStampTime(item);

  return Object.entries(item)
    .filter(([field, value]) => shouldShowField(field, value))
    .map(([field, value], index) => {
      const nextValue =
        approverPositionNameFields.has(field) && approverName
          ? `${String(value).trim()} (${approverName})`
          : value;
      const displayValue =
        stampDateFields.has(field) && stampTime
          ? formatDateAndTime(String(value), stampTime)
          : formatFieldValue(field, nextValue);

      return {
        field,
        label: formatFieldName(field),
        displayValue,
        value: nextValue,
        index,
      };
    })
    .sort(
      (leftRow, rightRow) =>
        getFieldRank(leftRow.field) - getFieldRank(rightRow.field) ||
        leftRow.index - rightRow.index,
    );
}

function formatFieldName(field: string) {
  if (timeFields.has(field)) {
    return "Time";
  }

  if (writeDateFields.has(field)) {
    return "Write date";
  }

  if (stampDateFields.has(field)) {
    return "Stamp Datetime";
  }

  if (stampTypeFields.has(field)) {
    return "Timestamp Type";
  }

  return field
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatFieldValue(field: string, value: unknown) {
  if (statusFields.has(field)) {
    const status = String(value).trim();

    if (status === "1") {
      return "Approved";
    }

    if (status === "0") {
      return "Waiting for approve";
    }
  }

  if (stampTypeFields.has(field)) {
    const stampType = String(value).trim().toLowerCase();

    if (stampType === "in") {
      return "Stamp In";
    }

    if (stampType === "out") {
      return "Stamp Out";
    }
  }

  if (dateFields.has(field)) {
    return formatFullDate(String(value));
  }

  return String(value);
}

function shouldShowField(field: string, value: unknown) {
  if (
    hiddenFields.has(field) ||
    approverNameFields.has(field) ||
    timeFields.has(field)
  ) {
    return false;
  }

  if (value === undefined || value === null || !String(value).trim()) {
    return false;
  }
  return true;
}

function getStampTime(item: ForgotTimestampHistory) {
  for (const field of timeFields) {
    const value = item[field];
    const time = String(value ?? "").trim();

    if (time && time !== "00:00:00") {
      return time;
    }
  }

  return "";
}

export default function ForgotTimestampHistoryDetailScreen() {
  const params = useLocalSearchParams<{ item?: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const item = useMemo(() => parseItem(params.item), [params.item]);
  const rows = buildDetailRows(item);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, LOADING_DELAY_MS);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.SHARED_HISTORY}
        backHref="/forgot-timestamp/history"
      />

      {isLoading ? (
        <View style={styles.loadingContent}>
          <LoadingAnimate
            title={TEXT.SHARED_LOADING_DATA_TITLE}
            desc={TEXT.SHARED_LOADING_DESCRIPTION}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={styles.panel} lightColor="#FFFFFF" darkColor="#1F2B30">
            {rows.length ? (
              <View style={styles.rows}>
                {rows.map(({ field, label, displayValue }) => (
                  <View key={field} style={styles.row}>
                    <ThemedText style={styles.label}>{label}</ThemedText>
                    <ThemedText type="defaultSemiBold" style={styles.value}>
                      {displayValue}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ) : (
              <ThemedText style={styles.emptyMessage}>
                {TEXT.SHARED_EMPTY_DATA}
              </ThemedText>
            )}
          </ThemedView>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContent: {
    flex: 1,
  },
  panel: {
    borderRadius: 8,
    padding: 16,
  },
  rows: {
    gap: 12,
  },
  row: {
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D7E6EC",
    paddingBottom: 12,
  },
  label: {
    color: "#687076",
    fontSize: 12,
    lineHeight: 18,
  },
  value: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyMessage: {
    color: "#687076",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
