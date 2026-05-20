import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";

import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { TEXT } from "@/constants/text";
import {
    TYPE_ABSENT_BIRTH,
    TYPE_ABSENT_BUSINESS,
    TYPE_ABSENT_HAJJ,
    TYPE_ABSENT_RELAX,
    TYPE_ABSENT_SICK,
} from "@/constants/type-absent";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import type { Absent } from "@/models/types";
import { waitingData } from "@/services/absentService";
import { formatDateRange } from "@/utils/date-format";

const absentTypeLabels: Record<string, string> = {
  [TYPE_ABSENT_SICK]: TEXT.ABSENT_SICK_TITLE,
  [TYPE_ABSENT_BUSINESS]: TEXT.ABSENT_BUSINESS_TITLE,
  [TYPE_ABSENT_BIRTH]: TEXT.ABSENT_BIRTH_TITLE,
  [TYPE_ABSENT_RELAX]: TEXT.ABSENT_RELAX_TITLE,
  [TYPE_ABSENT_HAJJ]: "Hajj leave",
};

const absentTypeFields = [
  "absentType",
  "absent_type",
  "typeAbsent",
  "type_absent",
  "leaveType",
  "leave_type",
  "type",
];
const absentTypeNameFields = [
  "absentTypeName",
  "absent_type_name",
  "typeName",
  "type_name",
  "leaveTypeName",
  "leave_type_name",
];
const startDateFields = ["startDate", "start_date", "dateStart", "date_start"];
const endDateFields = ["endDate", "end_date", "dateEnd", "date_end"];

function getText(item: Absent, fields: string[]) {
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

function getAbsentId(item: Absent) {
  return getText(item, [
    "id",
    "absentId",
    "absent_id",
    "requestId",
    "request_id",
  ]);
}

function getAbsentType(item: Absent) {
  return getText(item, absentTypeFields);
}

function getEditPathname(type: string) {
  switch (type) {
    case TYPE_ABSENT_SICK:
      return "/absent/sick";
    case TYPE_ABSENT_BUSINESS:
      return "/absent/business";
    case TYPE_ABSENT_RELAX:
      return "/absent/relax";
    case TYPE_ABSENT_BIRTH:
      return "/absent/birth";
    default:
      return "/absent/detail";
  }
}

function getAbsentTypeLabel(item: Absent) {
  const typeName = getText(item, absentTypeNameFields);
  const type = getAbsentType(item);

  return (
    typeName ||
    absentTypeLabels[type] ||
    (type ? `Absent type ${type}` : "Absent")
  );
}

function getDateRange(item: Absent) {
  const startDate = getText(item, startDateFields);
  const endDate = getText(item, endDateFields);
  const formattedDateRange = formatDateRange(startDate, endDate);

  return formattedDateRange ? `Absent date: ${formattedDateRange}` : "";
}

type WaitingListItemProps = {
  item: Absent;
  label: string;
  onPress: (item: Absent) => void;
};

function WaitingListItem({ item, label, onPress }: WaitingListItemProps) {
  const type = getAbsentTypeLabel(item);
  const dateRange = getDateRange(item);

  return (
    <Pressable accessibilityRole="button" onPress={() => onPress(item)}>
      <ThemedView
        style={styles.itemCard}
        lightColor="#FFFFFF"
        darkColor="#151718"
      >
        <View style={styles.itemHeader}>
          <ThemedText type="defaultSemiBold" style={styles.itemLabel}>
            {label}
          </ThemedText>
        </View>

        <ThemedText type="defaultSemiBold" style={styles.itemTitle}>
          {type}
        </ThemedText>

        {dateRange ? (
          <ThemedText style={styles.itemMeta}>{dateRange}</ThemedText>
        ) : null}
      </ThemedView>
    </Pressable>
  );
}

export default function WaitingScreen() {
  const { user: authUser } = useAuth();
  const [items, setItems] = useState<{
    remain: Absent | null;
    cancel: Absent | null;
  }>({
    remain: null,
    cancel: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const userId = authUser?.staffId || USER_ID;

  const loadWaitingData = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      try {
        const result = await waitingData(userId);
        setItems({
          remain: result.remainResult,
          cancel: result.cancelResult,
        });
      } catch (error) {
        setItems({ remain: null, cancel: null });
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
    [userId],
  );

  useFocusEffect(
    useCallback(() => {
      loadWaitingData();
    }, [loadWaitingData]),
  );

  const openDetail = useCallback((item: Absent) => {
    const type = getAbsentType(item);
    const pathname = getEditPathname(type);

    router.push({
      pathname,
      params: {
        id: getAbsentId(item),
        type,
        mode: "edit",
        source: "waiting",
        item: encodeURIComponent(JSON.stringify(item)),
      },
    } as Parameters<typeof router.push>[0]);
  }, []);

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
          <ThemedText type="subtitle">
            {TEXT.SHARED_SOMETHING_WENT_WRONG}
          </ThemedText>
          <ThemedText style={[styles.stateMessage, styles.errorText]}>
            {error}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => loadWaitingData()}
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

    const hasItems = items.remain || items.cancel;

    if (!hasItems) {
      return (
        <View style={styles.stateContent}>
          <ThemedView
            style={styles.emptyCard}
            lightColor="#FFFFFF"
            darkColor="#151718"
          >
            <ThemedText style={styles.emptyMessage}>
              {TEXT.SHARED_NO_HISTORY}
            </ThemedText>
          </ThemedView>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadWaitingData(true)}
          />
        }
      >
        {items.remain ? (
          <WaitingListItem
            item={items.remain}
            label="Waiting for Department Head Approval"
            onPress={openDetail}
          />
        ) : null}

        {items.cancel ? (
          <WaitingListItem
            item={items.cancel}
            label="Waiting for HR Approval"
            onPress={openDetail}
          />
        ) : null}
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.ABSENT_TITLE} />

      <View style={styles.content}>
        <ThemedView
          style={styles.panel}
          lightColor="#FFFFFF"
          darkColor="#1F2B30"
        >
          <ThemedText type="subtitle">{TEXT.ABSENT_WAITING_TITLE}</ThemedText>
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
  scrollView: {
    flex: 1,
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
  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  itemLabel: {
    fontSize: 12,
    lineHeight: 18,
    color: "#0A6E8A",
  },
  itemTitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 6,
  },
  itemMeta: {
    color: "#687076",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  stateContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  stateMessage: {
    color: "#687076",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
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
