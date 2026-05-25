import { useFocusEffect } from "expo-router";
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
import { TEXT } from "@/constants/text";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import {
  getForgotTimestampData,
  type ForgotTimestamp,
} from "@/services/timestampService";

const hiddenFields = new Set(["id"]);

function getCurrentYear() {
  return new Date().getFullYear();
}

function getItemId(item: ForgotTimestamp, index: number) {
  const id = item.id ?? item.timestampId ?? item.timestamp_id ?? item.date;

  return `${String(id ?? "timestamp")}-${index}`;
}

function getItemTitle(item: ForgotTimestamp) {
  const title =
    item.date ??
    item.workDate ??
    item.work_date ??
    item.timestampDate ??
    item.timestamp_date;

  return title ? String(title) : TEXT.FORGOT_TIMESTAMP_TITLE;
}

function formatFieldName(field: string) {
  return field
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getDisplayEntries(item: ForgotTimestamp) {
  return Object.entries(item)
    .filter(([field, value]) => {
      if (hiddenFields.has(field)) {
        return false;
      }

      return value !== undefined && value !== null && String(value).trim();
    })
    .slice(0, 6);
}

function ForgotTimestampItem({ item }: { item: ForgotTimestamp }) {
  const entries = getDisplayEntries(item);

  return (
    <ThemedView
      style={styles.itemCard}
      lightColor="#FFFFFF"
      darkColor="#151718"
    >
      <ThemedText type="defaultSemiBold" style={styles.itemTitle}>
        {getItemTitle(item)}
      </ThemedText>

      <View style={styles.itemRows}>
        {entries.map(([field, value]) => (
          <View key={field} style={styles.itemRow}>
            <ThemedText style={styles.itemLabel}>{formatFieldName(field)}</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.itemValue}>
              {String(value)}
            </ThemedText>
          </View>
        ))}
      </View>
    </ThemedView>
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
        setItems(result.data);
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
      <NavTopBar title={TEXT.FORGOT_TIMESTAMP_TITLE} />
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
  itemTitle: {
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
