import { ChevronRight, History, MapPin } from 'lucide-react-native';
import { TEXT } from "@/constants/text";
import { StatusBar } from "expo-status-bar";
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
import { AppFonts } from "@/constants/fonts";
import { TYPE_MEETING_HISTORY } from "@/constants/types";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import type { Meeting } from "@/models/types";
import { listMeeting } from "@/services/meetingService";
import { formatDateOnly, formatTimeOnly, parseDateTime } from "@/utils/date-format";

const titleFields = ["name", "title", "topic", "subject", "meetingName", "meetingTitle"];
const dateFields = ["m_lastdate", "meetingDate", "date", "startDate", "meeting_date", "start_date"];
const timeFields = ["meetingTime", "time", "startTime", "meeting_time", "start_time"];
const placeFields = ["room", "location", "place", "meetingRoom", "meeting_room"];
const meetingNoFields = ["m_no", "meeting_no", "no", "number", "meeting_number"];

function getText(meeting: Meeting, fields: string[]) {
  for (const field of fields) {
    const value = meeting[field];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function getDateSortKey(meeting: Meeting) {
  const raw = getText(meeting, dateFields);
  if (!raw) return "";
  const m = parseDateTime(raw);
  return m ? m.format('YYYY-MM-DD') : "";
}

type DateHeaderRow = { type: "date-header"; key: string; label: string };
type MeetingRow = { type: "meeting"; key: string; meeting: Meeting };
type ListRow = DateHeaderRow | MeetingRow;

function groupByDate(meetings: Meeting[], ascending: boolean): ListRow[] {
  const order: string[] = [];
  const groups: Record<string, { label: string; items: Meeting[] }> = {};

  for (const meeting of meetings) {
    const date = getText(meeting, dateFields);
    const sortKey = getDateSortKey(meeting) || "9999-12-31";
    const label = date ? formatDateOnly(date) : "ไม่ระบุวันที่";

    if (!groups[sortKey]) {
      order.push(sortKey);
      groups[sortKey] = { label, items: [] };
    }
    groups[sortKey].items.push(meeting);
  }

  order.sort((a, b) => ascending ? a.localeCompare(b) : b.localeCompare(a));

  const rows: ListRow[] = [];
  for (const key of order) {
    const { label, items } = groups[key];
    rows.push({ type: "date-header", key: `header-${key}`, label });
    items.forEach((meeting, i) => {
      rows.push({ type: "meeting", key: `item-${key}-${i}`, meeting });
    });
  }
  return rows;
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const title = getText(meeting, titleFields) || "Meeting";
  const date = getText(meeting, dateFields);
  const time = getText(meeting, timeFields);
  const place = getText(meeting, placeFields);
  const meetingNo = getText(meeting, meetingNoFields);
  const timeStr = formatTimeOnly(date) || formatTimeOnly(time);

  function handlePress() {
    router.push({
      pathname: '/meeting/detail',
      params: {
        m_id: String(meeting.m_id ?? ''),
        main_id: String(meeting.main_id ?? ''),
        name: title,
        date,
        room: place,
        meeting_no: meetingNo,
      },
    });
  }

  return (
    <Pressable style={styles.itemCard} onPress={handlePress} accessibilityRole="button">
      <View style={styles.itemRow}>
        <View style={[styles.timeBox, timeStr ? styles.timeBoxHasTime : styles.timeBoxNoTime]}>
          {timeStr ? (
            <ThemedText style={styles.timeText}>{timeStr}</ThemedText>
          ) : (
            <History size={20} color="#5D6371" />
          )}
        </View>
        <View style={styles.itemBody}>
          <ThemedText style={styles.itemTitle} numberOfLines={2}>{title}</ThemedText>
          {place ? (
            <View style={styles.metaRow}>
              <MapPin size={13} color="#585E6D" />
              <ThemedText style={styles.metaText} numberOfLines={1}>{place}</ThemedText>
            </View>
          ) : null}
        </View>
        <ChevronRight size={20} color="#8B716F" style={styles.chevron} />
      </View>
    </Pressable>
  );
}

export default function MeetingHistoryScreen() {
  const { user: authUser } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const userId = authUser?.staffId || USER_ID;

  const loadMeetings = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setError("");
      try {
        const result = await listMeeting(userId, TYPE_MEETING_HISTORY);
        setMeetings(result);
      } catch (error) {
        setMeetings([]);
        setError(error instanceof Error ? error.message : TEXT.MEETING_UNABLE_TO_LOAD_MEETINGS);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [userId],
  );

  useFocusEffect(useCallback(() => { loadMeetings(); }, [loadMeetings]));

  // descending = most recent first
  const rows = groupByDate(meetings, false);

  const listFooter = rows.length > 0 ? (
    <View style={styles.footerRow}>
      <View style={styles.footerLine} />
      <ThemedText style={styles.footerText}>สิ้นสุดประวัติ</ThemedText>
      <View style={styles.footerLine} />
    </View>
  ) : null;

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style="light" />
        <NavTopBar title={TEXT.MEETING_HEADER_TITLE} backHref="/" />
        <LoadingAnimate title={TEXT.MEETING_LOADING_MEETINGS} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style="light" />
        <NavTopBar title={TEXT.MEETING_HEADER_TITLE} backHref="/" />
        <View style={styles.errorWrap}>
          <View style={styles.errorCard}>
            <ThemedText style={styles.errorTitle}>{TEXT.SHARED_SOMETHING_WENT_WRONG}</ThemedText>
            <ThemedText style={styles.errorMessage}>{error}</ThemedText>
            <Pressable accessibilityRole="button" onPress={() => loadMeetings()} style={styles.retryButton}>
              <ThemedText style={styles.retryText}>{TEXT.SHARED_RETRY}</ThemedText>
            </Pressable>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar title={TEXT.MEETING_HEADER_TITLE} backHref="/" />
      <FlatList<ListRow>
        contentContainerStyle={styles.listContent}
        data={rows}
        keyExtractor={(row) => row.key}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadMeetings(true)}
            tintColor="#922124"
            colors={["#922124"]}
          />
        }
        renderItem={({ item: row }) => {
          if (row.type === "date-header") {
            return (
              <View style={styles.dateHeader}>
                <ThemedText style={styles.dateHeaderText}>{row.label}</ThemedText>
              </View>
            );
          }
          return <MeetingCard meeting={row.meeting} />;
        }}
        ItemSeparatorComponent={({ leadingItem }: { leadingItem: ListRow }) =>
          leadingItem.type === "date-header" ? null : <View style={styles.separator} />
        }
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <History size={40} color="#DADFF0" />
            <ThemedText style={styles.emptyTitle} type="defaultSemiBold">
              {TEXT.MEETING_NO_HISTORY}
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FD" },
  listContent: { padding: 16, paddingBottom: 32 },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E1E2E6",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontFamily: AppFonts.psuBold,
    color: "#922124",
  },
  headerDivider: { height: 1, backgroundColor: "#E1E2E6" },
  statRow: { flexDirection: "row", gap: 16 },
  statItem: { alignItems: "center", gap: 2 },
  statValue: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: AppFonts.psuBold,
    color: "#191C1F",
  },
  statLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: AppFonts.psuRegular,
    color: "#585E6D",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateHeader: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  dateHeaderText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: AppFonts.psuBold,
    color: "#191C1F",
  },
  separator: { height: 10 },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E1E2E6",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  chevron: { flexShrink: 0 },
  timeBox: {
    width: 54,
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  timeBoxHasTime: { backgroundColor: "#F5E8E8" },
  timeBoxNoTime: { backgroundColor: "#DADFF0" },
  timeText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 15,
    color: "#922124",
    textAlign: "center",
  },
  itemBody: { flex: 1, gap: 6 },
  itemTitle: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: AppFonts.psuBold,
    color: "#191C1F",
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppFonts.psuRegular,
    color: "#585E6D",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 20,
    paddingHorizontal: 8,
  },
  footerLine: { flex: 1, height: 1, backgroundColor: "#E1E2E6" },
  footerText: {
    fontSize: 12,
    fontFamily: AppFonts.psuRegular,
    color: "#8B716F",
  },
  emptyWrap: { alignItems: "center", paddingTop: 48, gap: 12 },
  emptyTitle: { color: "#585E6D", fontSize: 15, textAlign: "center" },
  errorWrap: { flex: 1, padding: 16, justifyContent: "center" },
  errorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E1E2E6",
    padding: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  errorTitle: { fontFamily: AppFonts.psuBold, fontSize: 15, color: "#B33939" },
  errorMessage: { fontFamily: AppFonts.psuRegular, fontSize: 14, lineHeight: 20, color: "#584140" },
  retryButton: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#B33939",
  },
  retryText: { color: "#FFFFFF", fontFamily: AppFonts.psuBold, fontSize: 14 },
});
