import { ChevronRight, Clock, Inbox, Info, LogIn, LogOut } from 'lucide-react-native';
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
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
import { formatDateRange, formatFullDate } from "@/utils/date-format";

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

// A forgot-timestamp day that already carries a forget-request id has been
// submitted and is awaiting approval (this is the same id the detail screen
// keys its edit mode on).
const requestIdFields = ["forgetId", "forget_id", "timestampId", "timestamp_id", "id"];

function hasSubmittedRequest(item: Timestamp) {
  for (const field of requestIdFields) {
    const value = item[field];
    if (value !== undefined && value !== null && String(value).trim()) {
      return true;
    }
  }
  return false;
}

// Icon + colour that convey the miss-timestamp type — kept in sync with the
// approve screens: forgot check-in (green), check-out (amber), both (red).
function getTypeIcon(stampType: string) {
  if (stampType === "in") return { Icon: LogIn, color: "#12805C", bg: "#E7F5EF" };
  if (stampType === "out") return { Icon: LogOut, color: "#B54708", bg: "#FDF3E7" };
  return { Icon: Clock, color: "#B33939", bg: "#FBEAEA" };
}

function TimestampItem({ item }: { item: Timestamp }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const alreadyRequested = hasSubmittedRequest(item);
  const canOpenDetail = isStatusTrue(item) || alreadyRequested;
  const showAppealDocumentMessage = isStatusFalse(item) && !alreadyRequested;
  const isUnavailable = isStatusFalse(item) && !alreadyRequested;
  const dateValue = getItemDateValue(item);
  const dateLabel = dateValue ? formatFullDate(dateValue) : "";
  const stampType = getStampType(item);
  const { Icon: TypeIcon, color: typeColor, bg: typeBg } = getTypeIcon(stampType);

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


  return (
    <Pressable
      accessibilityRole="button"
      disabled={!canOpenDetail}
      onPress={handlePress}
      style={({ pressed }) => (pressed && canOpenDetail ? styles.itemPressed : undefined)}
    >
      <View style={[styles.itemCard, isUnavailable && styles.itemCardUnavailable]}>
        <View style={styles.itemRow}>
          <View style={[styles.iconCircle, { backgroundColor: typeBg }]}>
            <TypeIcon size={18} color={typeColor} />
          </View>
          <View style={styles.itemInfo}>
            <ThemedText style={styles.itemTitle}>{getItemTitle(item)}</ThemedText>
            {dateLabel ? (
              <ThemedText style={styles.itemDate}>{dateLabel}</ThemedText>
            ) : null}
          </View>
          {alreadyRequested ? (
            <View style={styles.itemRight}>
              <View style={styles.pendingBadge}>
                <ThemedText style={styles.pendingBadgeText}>{TEXT.TIMESTAMP_PENDING_BADGE}</ThemedText>
              </View>
              <ChevronRight size={16} color="#8B716F" />
            </View>
          ) : canOpenDetail ? (
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
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
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
        <ThemedText style={styles.welcomeSubtitle}>
          คุณมี {pendingCount} คำขอที่รอดำเนินการ
        </ThemedText>
        <ThemedText style={styles.cycleText}>
          {TEXT.TIMESTAMP_COMPANY_CYCLE_LABEL}: {formatDateRange(`${currentYear - 1}-10-01`, `${currentYear}-09-30`)}
        </ThemedText>
      </View>

      <View style={styles.noteBox}>
        <View style={styles.noteIconWrap}>
          <Info size={20} color={c.info} />
        </View>
        <View style={styles.noteBody}>
          <ThemedText style={styles.noteTitle}>
            {TEXT.TIMESTAMP_NOTE_LABEL}
          </ThemedText>
          <ThemedText style={styles.noteText}>
            {TEXT.TIMESTAMP_NOTE_TEXT}
          </ThemedText>
        </View>
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
      ListEmptyComponent={<EmptyState icon={Inbox} message={TEXT.SHARED_EMPTY_DATA} />}
    />
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  flatList: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
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
  welcomeSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  cycleText: {
    fontSize: 12,
    lineHeight: 16,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  noteBox: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: c.infoSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    borderRadius: 12,
    padding: 16,
  },
  noteIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.infoSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  noteBody: {
    flex: 1,
    gap: 4,
  },
  noteTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: c.info,
    fontFamily: AppFonts.psuBold,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  itemCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(223,191,189,0.3)",
    padding: 16,
    gap: 10,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  itemCardUnavailable: {
    backgroundColor: c.background,
    borderColor: "rgba(223,191,189,0.2)",
  },
  itemPressed: {
    opacity: 0.72,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.primarySoft,
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
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  itemDate: {
    fontSize: 12,
    lineHeight: 16,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  actionBadge: {
    backgroundColor: c.primary,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  actionBadgeText: {
    color: c.textOnPrimary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontFamily: AppFonts.psuBold,
  },
  pendingBadge: {
    backgroundColor: c.warningSoft,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pendingBadgeText: {
    color: "#92400E",
    fontSize: 10,
    fontWeight: "700",
    fontFamily: AppFonts.psuBold,
  },
  appealMessage: {
    fontSize: 12,
    lineHeight: 18,
    color: c.primary,
    fontFamily: AppFonts.psuRegular,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    borderWidth: 1,
    borderColor: "rgba(223,191,189,0.2)",
  },
  emptyMessage: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
