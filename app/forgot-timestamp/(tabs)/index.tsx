import { ChevronRight, Clock, Fingerprint, LogIn, LogOut } from 'lucide-react-native';
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
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
import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import {
  getForgotTimestampData,
  type ForgotTimestamp,
} from "@/services/forgetTimestampService";
import { formatFullDate } from "@/utils/date-format";

const APPEAL_DOCUMENT_MESSAGE = TEXT.FORGOT_TIMESTAMP_APPEAL_DOCUMENT;

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
  if (stampType === "in") return TEXT.FORGOT_TIMESTAMP_STAMP_IN;
  if (stampType === "out") return TEXT.FORGOT_TIMESTAMP_STAMP_OUT;
  const title =
    item.date ??
    item.workDate ??
    item.work_date ??
    item.timestampDate ??
    item.timestamp_date;
  return title ? formatFullDate(String(title)) : TEXT.FORGOT_TIMESTAMP_TITLE;
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
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes"].includes(String(value ?? "").trim().toLowerCase());
}

function ForgotTimestampItem({ item }: { item: ForgotTimestamp }) {
  const canOpenDetail = isStatusTrue(item);
  const showAppealDocumentMessage = isStatusFalse(item);
  const isUnavailable = isStatusFalse(item);
  const dateValue = getItemDateValue(item);
  const dateLabel = dateValue ? formatFullDate(dateValue) : "";
  const stampType = getStampType(item);

  const handlePress = () => {
    if (!canOpenDetail) return;
    router.push({
      pathname: "/forgot-timestamp/detail",
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
                <ThemedText style={styles.actionBadgeText}>{TEXT.FORGOT_TIMESTAMP_ACTION_REQUIRED}</ThemedText>
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
        <ThemedText style={styles.welcomeHeading}>{TEXT.FORGOT_TIMESTAMP_TITLE}</ThemedText>
        <ThemedText style={styles.welcomeSubtitle}>
          คุณมี {pendingCount} คำขอที่รอดำเนินการ
        </ThemedText>
        <ThemedText style={styles.cycleText}>
          {TEXT.FORGOT_TIMESTAMP_COMPANY_CYCLE_LABEL}: {currentYear - 1} – {currentYear}
        </ThemedText>
      </View>

      <View style={styles.noteBox}>
        <Clock size={20} color="#922124" style={styles.noteIcon} />
        <ThemedText style={styles.noteText}>
          {TEXT.FORGOT_TIMESTAMP_NOTE_TEXT}
        </ThemedText>
      </View>
    </View>
  );

  const renderContent = () => {
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
        <View style={styles.stateContainer}>
          <ThemedText type="subtitle">{TEXT.SHARED_ERROR_TITLE_THAI}</ThemedText>
          <ThemedText style={[styles.stateMessage, styles.errorText]}>
            {error}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => loadItems()}
            style={styles.retryButton}
          >
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              {TEXT.SHARED_RETRY_THAI}
            </ThemedText>
          </Pressable>
        </View>
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
        renderItem={({ item }) => <ForgotTimestampItem item={item} />}
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
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar title={TEXT.FORGOT_TIMESTAMP_TITLE} backHref="/" />
      <View style={styles.content}>{renderContent()}</View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FD",
  },
  content: {
    flex: 1,
  },
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
    backgroundColor: "#B33939",
    marginTop: 24,
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
