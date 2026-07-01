import { ChevronRight, Clock, Fingerprint, LogIn, LogOut } from 'lucide-react-native';
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

import { ErrorState } from "@/components/error-state";
import { LoadingAnimate } from "@/components/loading-animate";
import { ThemedText } from "@/components/themed-text";
import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import {
  getTimestampData,
  type Timestamp,
} from "@/services/timestampService";
import { formatFullDate } from "@/utils/date-format";

const APPEAL_DOCUMENT_MESSAGE = TEXT.TIMESTAMP_APPEAL_DOCUMENT;

const stampTypeFields = new Set(["stampType", "stamp_type"]);
const statusFields = ["status", "isActive", "is_active"];
const dateFields = new Set([
  "date",
  "workDate",
  "work_date",
  "stampDate",
  "stamp_date",
  "timestampDate",
  "timestamp_date",
]);

function getStampType(item: Timestamp) {
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

function getItemId(item: Timestamp, index: number) {
  const id = item.id ?? item.timestampId ?? item.timestamp_id ?? item.date;
  return `${String(id ?? "timestamp")}-${index}`;
}

function getItemDateValue(item: Timestamp) {
  for (const field of dateFields) {
    const value = item[field];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }
  return "";
}

function getItemTimestamp(item: Timestamp) {
  const timestamp = Date.parse(getItemDateValue(item));
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortItemsByDateDesc(items: Timestamp[]) {
  return [...items].sort(
    (leftItem, rightItem) =>
      getItemTimestamp(rightItem) - getItemTimestamp(leftItem),
  );
}

function getItemTitle(item: Timestamp) {
  const stampType = getStampType(item);
  if (stampType === "in") return TEXT.TIMESTAMP_STAMP_IN;
  if (stampType === "out") return TEXT.TIMESTAMP_STAMP_OUT;
  // "all" = missing both in and out → absent from work.
  if (stampType === "all") return TEXT.TIMESTAMP_STAMP_ALL;
  const title =
    item.date ??
    item.workDate ??
    item.work_date ??
    item.timestampDate ??
    item.timestamp_date;
  return title ? formatFullDate(String(title)) : TEXT.TIMESTAMP_TITLE;
}

function getItemStatus(item: Timestamp) {
  for (const field of statusFields) {
    const value = item[field];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim().toLowerCase();
    }
  }
  return "";
}

function isStatusTrue(item: Timestamp) {
  const status = getItemStatus(item);
  return status === "true" || status === "1" || status === "yes";
}

function isStatusFalse(item: Timestamp) {
  const status = getItemStatus(item);
  return status === "false" || status === "0" || status === "no";
}

function isEditableItem(item: Timestamp) {
  const value = item.isEdit ?? item.is_edit;
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes"].includes(String(value ?? "").trim().toLowerCase());
}

function TimestampItem({ item }: { item: Timestamp }) {
  const canOpenDetail = isStatusTrue(item);
  const showAppealDocumentMessage = isStatusFalse(item);
  const isUnavailable = isStatusFalse(item);
  const dateValue = getItemDateValue(item);
  const dateLabel = dateValue ? formatFullDate(dateValue) : "";
  const stampType = getStampType(item);

  const handlePress = () => {
    if (!canOpenDetail) return;
    router.push({
      pathname: "/timestamp/detail",
      params: {
        item: JSON.stringify(item),
        isEdit: isEditableItem(item) ? "true" : "false",
      },
    } as Parameters<typeof router.push>[0]);
  };

  const StampIcon = stampType === "in" ? LogIn : stampType === "out" ? LogOut : Fingerprint;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!canOpenDetail}
      onPress={handlePress}
      style={({ pressed }) => (pressed && canOpenDetail ? styles.itemPressed : undefined)}
    >
      <View style={[styles.itemCard, isUnavailable && styles.itemCardUnavailable]}>
        <View style={styles.itemRow}>
          <View style={styles.iconCircle}>
            <StampIcon size={18} color="#5D6371" />
          </View>
          <View style={styles.itemInfo}>
            <ThemedText style={styles.itemTitle}>{getItemTitle(item)}</ThemedText>
            {dateLabel ? (
              <ThemedText style={styles.itemDate}>{dateLabel}</ThemedText>
            ) : null}
          </View>
          {canOpenDetail ? (
            <View style={styles.itemRight}>
              <View style={styles.actionBadge}>
                <ThemedText style={styles.actionBadgeText}>{TEXT.TIMESTAMP_ACTION_REQUIRED}</ThemedText>
              </View>
              <ChevronRight size={16} color="#8B716F" />
            </View>
          ) : null}
        </View>
        {showAppealDocumentMessage ? (
          <ThemedText style={styles.appealMessage}>{APPEAL_DOCUMENT_MESSAGE}</ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

export function TimestampForgotList() {
  const { user: authUser } = useAuth();
  const [items, setItems] = useState<Timestamp[]>([]);
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
        const result = await getTimestampData(staffId, currentYear);
        setItems(sortItemsByDateDesc(result.data));
      } catch (loadError) {
        setItems([]);
        setError(
          loadError instanceof Error
            ? loadError.message
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

  const pendingCount = items.filter(isStatusTrue).length;

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.welcomeSection}>
        <ThemedText style={styles.welcomeHeading}>{TEXT.TIMESTAMP_TITLE}</ThemedText>
        <ThemedText style={styles.welcomeSubtitle}>
          คุณมี {pendingCount} คำขอที่รอดำเนินการ
        </ThemedText>
        <ThemedText style={styles.cycleText}>
          {TEXT.TIMESTAMP_COMPANY_CYCLE_LABEL}: {currentYear - 1} – {currentYear}
        </ThemedText>
      </View>

      <View style={styles.noteBox}>
        <Clock size={20} color="#922124" style={styles.noteIcon} />
        <ThemedText style={styles.noteText}>
          {TEXT.TIMESTAMP_NOTE_TEXT}
        </ThemedText>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <LoadingAnimate
          title={TEXT.SHARED_LOADING_DATA_TITLE}
          desc={TEXT.SHARED_LOADING_DESCRIPTION}
        />
      </View>
    );
  }

  if (error) {
    return (
      <ErrorState
        title={TEXT.SHARED_ERROR_TITLE_THAI}
        message={error}
        onRetry={() => loadItems()}
      />
    );
  }

  return (
    <FlatList
      style={styles.flatList}
      contentContainerStyle={styles.listContent}
      data={items}
      keyExtractor={getItemId}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => loadItems(true)}
        />
      }
      renderItem={({ item }) => <TimestampItem item={item} />}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <ThemedText style={styles.emptyMessage}>
            {TEXT.SHARED_EMPTY_DATA}
          </ThemedText>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  flatList: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  listHeader: {
    gap: 12,
    paddingBottom: 4,
  },
  welcomeSection: {
    gap: 4,
  },
  welcomeHeading: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700",
    color: "#922124",
    fontFamily: AppFonts.psuBold,
  },
  welcomeSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#584140",
    fontFamily: AppFonts.psuRegular,
  },
  cycleText: {
    fontSize: 12,
    lineHeight: 16,
    color: "#585E6D",
    fontFamily: AppFonts.psuRegular,
  },
  noteBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#F2F3F7",
    borderLeftWidth: 4,
    borderLeftColor: "#922124",
    borderRadius: 12,
    padding: 14,
  },
  noteIcon: {
    marginTop: 1,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: "#584140",
    fontFamily: AppFonts.psuRegular,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(223,191,189,0.3)",
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  itemCardUnavailable: {
    backgroundColor: "#F8F9FD",
    borderColor: "rgba(223,191,189,0.2)",
  },
  itemPressed: {
    opacity: 0.72,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#DADFF0",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
    color: "#191C1F",
    fontFamily: AppFonts.psuBold,
  },
  itemDate: {
    fontSize: 12,
    lineHeight: 16,
    color: "#585E6D",
    fontFamily: AppFonts.psuRegular,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  actionBadge: {
    backgroundColor: "#B33939",
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  actionBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontFamily: AppFonts.psuBold,
  },
  appealMessage: {
    fontSize: 12,
    lineHeight: 18,
    color: "#B33939",
    fontFamily: AppFonts.psuRegular,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    borderWidth: 1,
    borderColor: "rgba(223,191,189,0.2)",
  },
  emptyMessage: {
    color: "#687076",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
