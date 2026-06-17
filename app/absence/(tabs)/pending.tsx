import { useFocusEffect } from "expo-router";
import { navPush } from "@/utils/navigation";
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
    TYPE_absence_BIRTH,
    TYPE_absence_BUSINESS,
    TYPE_absence_HAJJ,
    TYPE_absence_RELAX,
    TYPE_absence_SICK,
} from "@/constants/types";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import type { absence } from "@/models/types";
import { waitingData } from "@/services/absenceService";
import { formatDateRange } from "@/utils/date-format";

const absenceTypeLabels: Record<string, string> = {
  [TYPE_absence_SICK]: TEXT.absence_SICK_TITLE,
  [TYPE_absence_BUSINESS]: TEXT.absence_BUSINESS_TITLE,
  [TYPE_absence_BIRTH]: TEXT.absence_BIRTH_TITLE,
  [TYPE_absence_RELAX]: TEXT.absence_RELAX_TITLE,
  [TYPE_absence_HAJJ]: "Hajj leave",
};

const absenceTypeFields = [
  "absenceType",
  "absence_type",
  "typeabsence",
  "type_absence",
  "leaveType",
  "leave_type",
  "type",
];
const absenceTypeNameFields = [
  "absenceTypeName",
  "absence_type_name",
  "typeName",
  "type_name",
  "leaveTypeName",
  "leave_type_name",
];
const startDateFields = ["startDate", "start_date", "dateStart", "date_start"];
const endDateFields = ["endDate", "end_date", "dateEnd", "date_end"];

function getText(item: absence, fields: string[]) {
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

function getabsenceId(item: absence) {
  return getText(item, [
    "id",
    "absenceId",
    "absence_id",
    "requestId",
    "request_id",
  ]);
}

function getabsenceType(item: absence) {
  return getText(item, absenceTypeFields);
}

function getEditPathname(type: string) {
  switch (type) {
    case TYPE_absence_SICK:
      return "/absence/sick";
    case TYPE_absence_BUSINESS:
      return "/absence/business";
    case TYPE_absence_RELAX:
      return "/absence/relax";
    case TYPE_absence_BIRTH:
      return "/absence/birth";
    default:
      return "/absence/detail";
  }
}

function getabsenceTypeLabel(item: absence) {
  const typeName = getText(item, absenceTypeNameFields);
  const type = getabsenceType(item);

  return (
    typeName ||
    absenceTypeLabels[type] ||
    (type ? `absence type ${type}` : "absence")
  );
}

function getDateRange(item: absence) {
  const startDate = getText(item, startDateFields);
  const endDate = getText(item, endDateFields);
  const formattedDateRange = formatDateRange(startDate, endDate);

  return formattedDateRange ? `absence date: ${formattedDateRange}` : "";
}

type WaitingListItemProps = {
  item: absence;
  label: string;
  onPress: (item: absence) => void;
};

function WaitingListItem({ item, label, onPress }: WaitingListItemProps) {
  const type = getabsenceTypeLabel(item);
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
    remain: absence | null;
    cancel: absence | null;
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

  const openDetail = useCallback((item: absence) => {
    const type = getabsenceType(item);
    const pathname = getEditPathname(type);

    navPush({
      pathname,
      params: {
        id: getabsenceId(item),
        type,
        mode: "edit",
        source: "waiting",
        item: encodeURIComponent(JSON.stringify(item)),
      },
    } as Parameters<typeof navPush>[0]);
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
      <NavTopBar title={TEXT.absence_TITLE} />

      <View style={styles.content}>
        <ThemedView
          style={styles.panel}
          lightColor="#FFFFFF"
          darkColor="#1F2B30"
        >
          <ThemedText type="subtitle">{TEXT.absence_WAITING_TITLE}</ThemedText>
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
