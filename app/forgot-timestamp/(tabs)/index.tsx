import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TEXT } from "@/constants/text";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import {
  getForgotTimestampData,
  type ForgotTimestamp,
} from "@/services/forgotTimestampService";
import { formatFullDate } from "@/utils/date-format";

const APPEAL_DOCUMENT_MESSAGE =
  "Please go to website to appeal with document";
const hiddenFields = new Set([
  "id",
  "isEdit",
  "is_edit",
  "staffId",
  "staff_id",
  "statusDetail",
  "status_detail",
]);
const stampTypeFields = new Set(["stampType", "stamp_type"]);
const statusFields = ["status", "isActive", "is_active"];
const hiddenStatusFields = new Set(statusFields);
const dateFields = new Set([
  "date",
  "workDate",
  "work_date",
  "stampDate",
  "stamp_date",
  "timestampDate",
  "timestamp_date",
]);

function getStampType(item: ForgotTimestamp) {
  for (const field of stampTypeFields) {
    const value = item[field];

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim().toLowerCase();
    }
  }

  return "";
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function getItemId(item: ForgotTimestamp, index: number) {
  const id = item.id ?? item.timestampId ?? item.timestamp_id ?? item.date;

  return `${String(id ?? "timestamp")}-${index}`;
}

function getItemDateValue(item: ForgotTimestamp) {
  for (const field of dateFields) {
    const value = item[field];

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }

  return "";
}

function getItemTimestamp(item: ForgotTimestamp) {
  const timestamp = Date.parse(getItemDateValue(item));

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortItemsByDateDesc(items: ForgotTimestamp[]) {
  return [...items].sort(
    (leftItem, rightItem) =>
      getItemTimestamp(rightItem) - getItemTimestamp(leftItem),
  );
}

function getItemTitle(item: ForgotTimestamp) {
  const stampType = getStampType(item);

  if (stampType === "in") {
    return "Forgot stamp in";
  }

  if (stampType === "out") {
    return "Forgot stamp out";
  }

  const title =
    item.date ??
    item.workDate ??
    item.work_date ??
    item.timestampDate ??
    item.timestamp_date;

  return title ? formatFullDate(String(title)) : TEXT.FORGOT_TIMESTAMP_TITLE;
}

function formatFieldName(field: string) {
  if (dateFields.has(field)) {
    return "Stamp Date";
  }

  return field
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatFieldValue(field: string, value: unknown) {
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

function isHiddenField(field: string) {
  return (
    hiddenFields.has(field) ||
    stampTypeFields.has(field) ||
    hiddenStatusFields.has(field) ||
    field.replace(/_/g, "").toLowerCase() === "statusdetail"
  );
}

function getItemStatus(item: ForgotTimestamp) {
  for (const field of statusFields) {
    const value = item[field];

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim().toLowerCase();
    }
  }

  return "";
}

function isStatusTrue(item: ForgotTimestamp) {
  const status = getItemStatus(item);

  return status === "true" || status === "1" || status === "yes";
}

function isStatusFalse(item: ForgotTimestamp) {
  const status = getItemStatus(item);

  return status === "false" || status === "0" || status === "no";
}

function isEditableItem(item: ForgotTimestamp) {
  const value = item.isEdit ?? item.is_edit;

  if (typeof value === "boolean") {
    return value;
  }

  return ["true", "1", "yes"].includes(String(value ?? "").trim().toLowerCase());
}

function hasRequestId(item: ForgotTimestamp) {
  return Boolean(String(item.id ?? "").trim());
}

function getDisplayEntries(item: ForgotTimestamp) {
  return Object.entries(item)
    .filter(([field, value]) => {
      if (isHiddenField(field)) {
        return false;
      }

      return value !== undefined && value !== null && String(value).trim();
    })
    .slice(0, 6);
}

function ForgotTimestampItem({ item }: { item: ForgotTimestamp }) {
  const entries = getDisplayEntries(item);
  const canOpenDetail = isStatusTrue(item);
  const showAppealDocumentMessage = isStatusFalse(item);
  const isUnavailable = isStatusFalse(item);
  const showPendingApprovalMessage = hasRequestId(item);
  const handlePress = () => {
    if (!canOpenDetail) {
      return;
    }

    router.push({
      pathname: "/forgot-timestamp-detail",
      params: {
        item: JSON.stringify(item),
        isEdit: isEditableItem(item) ? "true" : "false",
      },
    } as Parameters<typeof router.push>[0]);
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!canOpenDetail}
      onPress={handlePress}
      style={({ pressed }) => [pressed ? styles.itemPressed : undefined]}
    >
      <ThemedView
        style={[styles.itemCard, isUnavailable ? styles.unavailableItemCard : undefined]}
        lightColor={isUnavailable ? "#F1F4F6" : "#FFFFFF"}
        darkColor="#151718"
      >
        <View style={styles.itemHeader}>
          <ThemedText type="defaultSemiBold" style={styles.itemTitle}>
            {getItemTitle(item)}
          </ThemedText>
          {canOpenDetail ? (
            <IconSymbol name="chevron.right" size={22} color="#0A6E8A" />
          ) : null}
        </View>

        <View style={styles.itemRows}>
          {entries.map(([field, value]) => (
            <View key={field} style={styles.itemRow}>
              <ThemedText style={styles.itemLabel}>{formatFieldName(field)}</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.itemValue}>
                {formatFieldValue(field, value)}
              </ThemedText>
            </View>
          ))}
        </View>

        {showPendingApprovalMessage ? (
          <ThemedText style={styles.pendingApprovalMessage}>
            Your request is due for approving
          </ThemedText>
        ) : null}

        {showAppealDocumentMessage ? (
          <ThemedText style={styles.appealDocumentMessage}>
            {APPEAL_DOCUMENT_MESSAGE}
          </ThemedText>
        ) : null}
      </ThemedView>
    </Pressable>
  );
}

export default function ForgotTimestampScreen() {
  const { user: authUser } = useAuth();
  const [items, setItems] = useState<ForgotTimestamp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const staffId = authUser?.staffId || USER_ID;
  const currentYear = getCurrentYear();

  const loadItems = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      try {
        const result = await getForgotTimestampData(staffId, currentYear);
        setItems(sortItemsByDateDesc(result.data));
      } catch (error) {
        setItems([]);
        setError(
          error instanceof Error
            ? error.message
            : TEXT.SHARED_SOMETHING_WENT_WRONG,
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentYear, staffId],
  );

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems]),
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <LoadingAnimate
          title={TEXT.SHARED_LOADING_DATA_TITLE}
          desc={TEXT.SHARED_LOADING_DESCRIPTION}
        />
      );
    }

    if (error) {
      return (
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">{TEXT.SHARED_ERROR_TITLE_THAI}</ThemedText>
          <ThemedText style={[styles.stateMessage, styles.errorText]}>
            {error}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => loadItems()}
            style={styles.retryButton}
          >
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              type="defaultSemiBold"
            >
              {TEXT.SHARED_RETRY_THAI}
            </ThemedText>
          </Pressable>
        </View>
      );
    }

    return (
      <FlatList
        data={items}
        keyExtractor={getItemId}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadItems(true)}
          />
        }
        renderItem={({ item }) => <ForgotTimestampItem item={item} />}
        ListEmptyComponent={
          <ThemedView
            style={styles.emptyCard}
            lightColor="#FFFFFF"
            darkColor="#151718"
          >
            <ThemedText style={styles.emptyMessage}>
              {TEXT.SHARED_EMPTY_DATA}
            </ThemedText>
          </ThemedView>
        }
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.FORGOT_TIMESTAMP_TITLE} backHref="/" />
      <View style={styles.content}>
        <ThemedView
          style={styles.panel}
          lightColor="#FFFFFF"
          darkColor="#1F2B30"
        >
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
  listContent: {
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  itemCard: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D7E6EC",
    padding: 16,
  },
  unavailableItemCard: {
    backgroundColor: "#F1F4F6",
    borderColor: "#CCD6DB",
  },
  itemPressed: {
    opacity: 0.72,
  },
  appealDocumentMessage: {
    color: "#B42318",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  pendingApprovalMessage: {
    color: "#067647",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  itemHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  itemRows: {
    gap: 8,
    marginTop: 12,
  },
  itemRow: {
    flexDirection: "row",
    gap: 12,
  },
  itemLabel: {
    width: 112,
    color: "#687076",
    fontSize: 12,
    lineHeight: 18,
  },
  itemValue: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "right",
  },
  stateContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  stateMessage: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  errorText: {
    color: "#B42318",
  },
  retryButton: {
    minHeight: 48,
    minWidth: 132,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0A6E8A",
    marginTop: 24,
  },
  emptyCard: {
    minHeight: 120,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D7E6EC",
    padding: 16,
  },
  emptyMessage: {
    color: "#687076",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
