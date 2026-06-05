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
  getForgotTimestampHistoryData,
  type ForgotTimestampHistory,
} from "@/services/forgetTimestampService";
import { formatFullDate } from "@/utils/date-format";

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
]);
const writeDateFields = [
  "writeDate",
  "write_date",
  "createdAt",
  "created_at",
  "requestDate",
  "request_date",
  "dateAdd",
  "date_add",
];
const stampTypeFields = new Set(["stampType", "stamp_type", "type"]);

function getCurrentYear() {
  return new Date().getFullYear();
}

function getText(item: ForgotTimestampHistory, fields: string[]) {
  for (const field of fields) {
    const value = item[field];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function getHistoryKey(item: ForgotTimestampHistory, index: number) {
  const id = getText(item, ["id", "forgetId", "forget_id", "timestampId", "timestamp_id"]);
  const date = getText(item, Array.from(dateFields));

  return `${id || date || "forgot-timestamp-history"}-${index}`;
}

function getHistoryDate(item: ForgotTimestampHistory) {
  return getText(item, Array.from(dateFields));
}

function getWriteDate(item: ForgotTimestampHistory) {
  return getText(item, writeDateFields) || getHistoryDate(item);
}

function getHistoryTimestamp(item: ForgotTimestampHistory) {
  const timestamp = Date.parse(getHistoryDate(item));

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortHistoryItems(items: ForgotTimestampHistory[]) {
  return [...items].sort(
    (leftItem, rightItem) =>
      getHistoryTimestamp(rightItem) - getHistoryTimestamp(leftItem),
  );
}

function getHistoryTitle(item: ForgotTimestampHistory) {
  const stampType = getText(item, Array.from(stampTypeFields)).toLowerCase();

  if (stampType === "in") {
    return "Forgot stamp in";
  }

  if (stampType === "out") {
    return "Forgot stamp out";
  }

  const date = getHistoryDate(item);
  return date ? formatFullDate(date) : TEXT.SHARED_HISTORY;
}

function getWriteDateLabel(item: ForgotTimestampHistory) {
  const writeDate = getWriteDate(item);

  return writeDate ? formatFullDate(writeDate) : "-";
}

function ForgotTimestampHistoryItem({
  item,
}: {
  item: ForgotTimestampHistory;
}) {
  const openDetail = () => {
    router.push({
      pathname: "/forgot-timestamp/history-detail",
      params: {
        item: JSON.stringify(item),
      },
    } as Parameters<typeof router.push>[0]);
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={openDetail}
      style={({ pressed }) => [pressed ? styles.itemPressed : undefined]}
    >
      <ThemedView style={styles.itemCard} lightColor="#FFFFFF" darkColor="#151718">
        <View style={styles.itemHeader}>
          <View style={styles.itemText}>
            <ThemedText type="defaultSemiBold" style={styles.itemTitle}>
              {getHistoryTitle(item)}
            </ThemedText>
            <ThemedText style={styles.itemMeta}>
              Write date: {getWriteDateLabel(item)}
            </ThemedText>
          </View>
          <IconSymbol name="chevron.right" size={22} color="#0A6E8A" />
        </View>
      </ThemedView>
    </Pressable>
  );
}

export default function ForgotTimestampHistoryScreen() {
  const { user: authUser } = useAuth();
  const [items, setItems] = useState<ForgotTimestampHistory[]>([]);
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
        const result = await getForgotTimestampHistoryData(staffId, currentYear);
        setItems(sortHistoryItems(result.data));
      } catch (error) {
        setItems([]);
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
          title={TEXT.SHARED_LOADING_HISTORY}
          desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT}
        />
      );
    }

    if (error) {
      return (
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">{TEXT.SHARED_SOMETHING_WENT_WRONG}</ThemedText>
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
              {TEXT.SHARED_RETRY}
            </ThemedText>
          </Pressable>
        </View>
      );
    }

    return (
      <FlatList
        data={items}
        keyExtractor={getHistoryKey}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadItems(true)}
          />
        }
        renderItem={({ item }) => <ForgotTimestampHistoryItem item={item} />}
        ListEmptyComponent={
          <ThemedView
            style={styles.emptyCard}
            lightColor="#FFFFFF"
            darkColor="#151718"
          >
            <ThemedText style={styles.emptyMessage}>
              {TEXT.SHARED_NO_HISTORY}
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
  itemPressed: {
    opacity: 0.72,
  },
  itemHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  itemText: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  itemMeta: {
    color: "#687076",
    fontSize: 13,
    lineHeight: 19,
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
