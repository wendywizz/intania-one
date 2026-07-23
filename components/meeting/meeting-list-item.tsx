import { router } from "expo-router";

import { EventTimelineItem } from "@/components/ui";
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

// Thin adapter over the shared EventTimelineItem: pulls the meeting's title,
// time, place and no. out of the loose API shape and pushes to the detail route.
export function MeetingListItem({ meeting }: { meeting: Meeting }) {
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
    <EventTimelineItem
      time={timeStr}
      title={title}
      location={place}
      onPress={handlePress}
    />
  );
}
