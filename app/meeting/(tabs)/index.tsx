import { CalendarDays, ChevronRight, MapPin } from 'lucide-react-native';
import { TEXT } from "@/constants/text";
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

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { LoadingAnimate } from "@/components/loading-animate";
import { MeetingListItem } from "@/components/meeting/meeting-list-item";
import { ScreenHeader } from "@/components/screen-header";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppFonts } from "@/constants/fonts";
import { TYPE_MEETING_TODAY } from "@/constants/types";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import type { Meeting } from "@/models/types";
import { listMeeting } from "@/services/meetingService";
import { formatDateOnly, formatTimeOnly, parseDateTime } from "@/utils/date-format";
import { boxShadow } from '@/constants/shadows';

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

function getMeetingId(meeting: Meeting, index: number) {
  const key = getText(meeting, ["id", "meetingId", "meeting_id", "code"]);
  return `${key || "meeting"}-${index}`;
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

export default function TodayMeetingScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
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
        const result = await listMeeting(userId, TYPE_MEETING_TODAY);
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

  const rows = groupByDate(meetings, true);

  // Only while there is nothing to show; see components/timestamp/timestamp-forgot-list.
  if (isLoading && meetings.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader title={TEXT.MEETING_HEADER_TITLE} backHref="/" titleInNavBar showHomeButton={false} />
        <LoadingAnimate title={TEXT.MEETING_LOADING_MEETINGS} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader title={TEXT.MEETING_HEADER_TITLE} backHref="/" titleInNavBar showHomeButton={false} />
        <ErrorState
          title={TEXT.SHARED_SOMETHING_WENT_WRONG}
          message={error}
          onRetry={() => loadMeetings()}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={TEXT.MEETING_HEADER_TITLE} backHref="/" titleInNavBar showHomeButton={false} />
      <FlatList<ListRow>
        contentContainerStyle={styles.listContent}
        data={rows}
        keyExtractor={(row) => row.key}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadMeetings(true)}
            tintColor={c.primary}
            colors={[c.primary]}
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
          return <MeetingListItem meeting={row.meeting} />;
        }}
        ItemSeparatorComponent={({ leadingItem }: { leadingItem: ListRow }) =>
          leadingItem.type === "date-header" ? null : <View style={styles.separator} />
        }
        ListEmptyComponent={<EmptyState preset="meeting" message={TEXT.MEETING_NO_MEETINGS_TODAY} />}
      />
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  listContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32 },
  headerCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    marginBottom: 16,
    boxShadow: boxShadow(c.shadow, { y: 2, blur: 8, opacity: 0.05 }),
    gap: 4,
  },
  headerTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontFamily: AppFonts.psuBold,
    color: c.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppFonts.psuRegular,
    color: c.textMuted,
  },
  dateHeader: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  dateHeaderText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppFonts.psuBold,
    color: c.textMuted,
  },
  separator: { height: 0 },
  itemCard: {
    backgroundColor: c.surface,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 16,
    boxShadow: boxShadow(c.shadow, { y: 3, blur: 10, opacity: 0.06 }),
  },
  itemRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  chevron: { flexShrink: 0, marginTop: 2 },
  timeBox: {
    width: 54,
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  timeBoxHasTime: { backgroundColor: c.primarySoft },
  timeBoxNoTime: { backgroundColor: c.surfaceMuted },
  timeText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 15,
    color: c.primary,
    textAlign: "center",
  },
  itemBody: { flex: 1, gap: 6 },
  itemTitle: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: AppFonts.psuBold,
    color: c.text,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppFonts.psuRegular,
    color: c.textMuted,
  },
  detailText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppFonts.psuRegular,
    color: c.textMuted,
    marginTop: 2,
  },
  emptyWrap: { alignItems: "center", paddingTop: 48, gap: 12 },
  emptyTitle: { color: c.textMuted, fontSize: 15, textAlign: "center" },
  errorWrap: { flex: 1, padding: 16, justifyContent: "center" },
  errorCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 20,
    gap: 8,
    boxShadow: boxShadow(c.shadow, { y: 2, blur: 8, opacity: 0.05 }),
  },
  errorTitle: { fontFamily: AppFonts.psuBold, fontSize: 15, color: c.primary },
  errorMessage: { fontFamily: AppFonts.psuRegular, fontSize: 14, lineHeight: 20, color: c.textMuted },
  retryButton: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: c.pomegranate,
  },
  retryText: { color: c.textOnPrimary, fontFamily: AppFonts.psuBold, fontSize: 14 },
});
