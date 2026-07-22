import { router } from "expo-router";
import { MapPin } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { AppFonts } from "@/constants/fonts";
import { type AppColors, useColors, useThemedStyles } from "@/constants/theme";
import type { Meeting } from "@/models/types";
import { formatTimeOnly } from "@/utils/date-format";

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

// Timeline-style meeting row: the time sits in the left gutter, a dot on a
// continuous vertical rail marks the moment, and the meeting details float in a
// card on the right. Rendered with no separators so the rail reads as one line.
export function MeetingListItem({ meeting }: { meeting: Meeting }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const title = getText(meeting, titleFields) || "Meeting";
  const date = getText(meeting, dateFields);
  const time = getText(meeting, timeFields);
  const place = getText(meeting, placeFields);
  const meetingNo = getText(meeting, meetingNoFields);
  const timeStr = formatTimeOnly(date) || formatTimeOnly(time);

  function handlePress() {
    router.push({
      pathname: "/meeting/detail",
      params: {
        m_id: String(meeting.m_id ?? ""),
        main_id: String(meeting.main_id ?? ""),
        name: title,
        date,
        room: place,
        meeting_no: meetingNo,
      },
    });
  }

  return (
    <Pressable style={styles.row} onPress={handlePress} accessibilityRole="button">
      <View style={styles.timeCol}>
        <ThemedText style={styles.timeText} numberOfLines={1}>{timeStr || "—"}</ThemedText>
      </View>
      <View style={styles.rail}>
        <View style={styles.railLine} />
        <View style={styles.dot} />
      </View>
      <View style={styles.card}>
        <ThemedText style={styles.title} numberOfLines={2}>{title}</ThemedText>
        {place ? (
          <View style={styles.metaRow}>
            <MapPin size={13} color={c.textMuted} />
            <ThemedText style={styles.metaText} numberOfLines={1}>{place}</ThemedText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  timeCol: {
    width: 50,
    alignItems: "flex-end",
    paddingTop: 20,
  },
  timeText: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: AppFonts.psuBold,
    color: c.primary,
  },
  rail: {
    width: 26,
    alignItems: "center",
  },
  railLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 12,
    width: 2,
    backgroundColor: c.border,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: c.primary,
    borderWidth: 3,
    borderColor: c.background,
    marginTop: 18,
  },
  card: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 14,
    marginVertical: 6,
    marginLeft: 2,
    gap: 5,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
  title: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: AppFonts.psuBold,
    color: c.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppFonts.psuRegular,
    color: c.textMuted,
  },
});
