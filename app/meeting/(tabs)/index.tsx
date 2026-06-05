import { TEXT } from "@/constants/text";
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
import { TYPE_MEETING_TODAY } from "@/constants/types";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import type { Meeting } from "@/models/types";
import { listMeeting } from "@/services/meetingService";
import { formatDateAndTime } from "@/utils/date-format";

const titleFields = [
  "title",
  "topic",
  "subject",
  "meetingName",
  "meetingTitle",
  "name",
];
const dateFields = [
  "meetingDate",
  "date",
  "startDate",
  "meeting_date",
  "start_date",
];
const timeFields = [
  "meetingTime",
  "time",
  "startTime",
  "meeting_time",
  "start_time",
];
const placeFields = [
  "location",
  "place",
  "room",
  "meetingRoom",
  "meeting_room",
];

function getText(meeting: Meeting, fields: string[]) {
  for (const field of fields) {
    const value = meeting[field];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function getMeetingKey(meeting: Meeting, index: number) {
  const key = getText(meeting, ["id", "meetingId", "meeting_id", "code"]);
  return `${key || "meeting"}-${index}`;
}

function getMeetingTimestamp(meeting: Meeting) {
  const date = getText(meeting, dateFields);
  const time = getText(meeting, timeFields);
  const timestamp = Date.parse([date, time].filter(Boolean).join(" "));

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortMeetingsByDateDesc(meetings: Meeting[]) {
  return [...meetings].sort((leftMeeting, rightMeeting) => {
    return getMeetingTimestamp(rightMeeting) - getMeetingTimestamp(leftMeeting);
  });
}

type MeetingListItemProps = {
  meeting: Meeting;
};

function MeetingListItem({ meeting }: MeetingListItemProps) {
  const title = getText(meeting, titleFields) || "Meeting";
  const date = getText(meeting, dateFields);
  const time = getText(meeting, timeFields);
  const place = getText(meeting, placeFields);
  const detail = getText(meeting, [
    "detail",
    "description",
    "agenda",
    "remark",
  ]);
  const schedule = formatDateAndTime(date, time);

  return (
    <ThemedView
      style={styles.itemCard}
      lightColor="#FFFFFF"
      darkColor="#151718"
    >
      <ThemedText type="defaultSemiBold" style={styles.itemTitle}>
        {title}
      </ThemedText>

      {schedule ? (
        <ThemedText style={styles.itemMeta}>{schedule}</ThemedText>
      ) : null}
      {place ? <ThemedText style={styles.itemMeta}>{place}</ThemedText> : null}
      {detail ? (
        <ThemedText style={styles.itemDetail}>{detail}</ThemedText>
      ) : null}
    </ThemedView>
  );
}

export default function TodayMeetingScreen() {
  const { user: authUser } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const userId = authUser?.staffId || USER_ID;

  const loadMeetings = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      try {
        const result = await listMeeting(userId, TYPE_MEETING_TODAY);
        setMeetings(sortMeetingsByDateDesc(result));
      } catch (error) {
        setMeetings([]);
        setError(
          error instanceof Error
            ? error.message
            : TEXT.MEETING_UNABLE_TO_LOAD_MEETINGS,
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
      loadMeetings();
    }, [loadMeetings]),
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <LoadingAnimate
          title={TEXT.MEETING_LOADING_MEETINGS}
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
            onPress={() => loadMeetings()}
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
        contentContainerStyle={styles.listContent}
        data={meetings}
        keyExtractor={getMeetingKey}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadMeetings(true)}
          />
        }
        renderItem={({ item }) => <MeetingListItem meeting={item} />}
        ListEmptyComponent={
          <ThemedView
            style={styles.emptyCard}
            lightColor="#FFFFFF"
            darkColor="#151718"
          >
            <ThemedText style={styles.emptyMessage}>
              {TEXT.MEETING_NO_MEETINGS_TODAY}
            </ThemedText>
          </ThemedView>
        }
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.MEETING_HEADER_TITLE} backHref="/" />

      <View style={styles.content}>
        <ThemedView
          style={styles.panel}
          lightColor="#FFFFFF"
          darkColor="#1F2B30"
        >
          <ThemedText type="subtitle">{TEXT.MEETING_TODAY}</ThemedText>
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
    paddingTop: 16,
    paddingBottom: 8,
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
  itemMeta: {
    color: "#687076",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  itemDetail: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
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
