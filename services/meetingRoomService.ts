/**
 * The requester side of the meeting-room booking system — submit, list,
 * inspect and cancel a request to use one of the faculty's meeting rooms.
 * Talks to Z:\link_www\room\api through scooba-service's src/api/meeting-room
 * gateway module.
 *
 * Follows bookingRoomService.ts's own conventions exactly: reads go through
 * requestJson+ensureSuccess and return json.data as-is; writes go through a
 * private postX<T>() that does its own fetch (via withApiToken) specifically
 * to preserve the server's real 4xx message text — "leader_id is not an
 * eligible approver for this department" or a room/date conflict tells the
 * person what to do next, and a generic "server error" would not.
 */
import { ENDPOINTS } from '../constants/endpoints';
import { TEXT } from '../constants/text';
import { ensureSuccess, requestJson, withApiToken } from './api';

export type MeetingRoomRequestType = { id: number; name: string };

export type MeetingRoomArrangement = {
  room_id: string;
  type: number;
  capacity: number;
  detail: string;
};

export type MeetingRoomOption = {
  id: number;
  name: string;
  sname: string;
  arrangements: MeetingRoomArrangement[];
};

export type MeetingRoomThing = { id: number; detail: string };

export type MeetingRoomLeader = {
  staff_id: number;
  /** OpenID identifier — what the avatar photo lookup actually keys on
   *  (UserAvatar/personnel photo API), unlike the rest of this module which
   *  keys on the internal staff_id. Null when the leader has no active
   *  CENTRAL record; the client falls back to staff_id itself then. */
  uni_staff_id: string | null;
  name: string;
};

export type MeetingRoomOptions = {
  requester: { staff_id: number; name: string; dept_id: string };
  request_types: MeetingRoomRequestType[];
  rooms: MeetingRoomOption[];
  things_audio: MeetingRoomThing[];
  things_food: MeetingRoomThing[];
  leaders: MeetingRoomLeader[];
};

export type MeetingRoomSlot = {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  start_time: string;
  /** HH:MM */
  end_time: string;
};

export type MeetingRoomAvailability = { available: boolean };

export type MeetingRoomThingInput = { thing_id: number; thing_type: 1 | 2; total: number };

export type CreateMeetingRoomInput = {
  uni_staff_id: string;
  detail: string;
  type_id: number;
  total_man: number;
  room_id: number;
  arrangement_type: number;
  leader_id: number;
  comment?: string;
  dates: MeetingRoomSlot[];
  things?: MeetingRoomThingInput[];
};

export type CreatedMeetingRoomRequest = { order_id: number };

/**
 * One of the requester's own meeting-room requests, as it appears in the
 * merged current/history list. `status_label` is always the STATUS_DETAIL
 * text already resolved server-side — never a number this client has to
 * translate itself (see components/meeting-room/status-badge.ts).
 */
export type MyMeetingRoomRequest = {
  order_id: number;
  detail: string;
  type_id: number;
  type_name: string | null;
  total_man: number;
  total_day: number;
  room_id: number;
  room_name: string | null;
  status: number;
  status_label: string | null;
  /** 'YYYY-MM-DD HH:MM:SS' — when the room will actually be used (the
   *  earliest requested slot), not to be confused with request_date below. */
  startdate: string | null;
  /** The latest requested slot. */
  enddate: string | null;
  /** 'YYYY-MM-DD HH:MM:SS' — when the request was filed. */
  request_date: string;
  comment: string;
};

export type MeetingRoomRequestDateRow = {
  count: number;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  start_time: string;
  /** HH:MM */
  end_time: string;
  status: number;
};

export type MeetingRoomRequestThingRow = {
  thing_id: number;
  thing_type: number;
  total: number;
  name: string | null;
};

export type MeetingRoomRequestDetail = MyMeetingRoomRequest & {
  dates: MeetingRoomRequestDateRow[];
  things: MeetingRoomRequestThingRow[];
  leader_name: string | null;
};

export type MeetingRoomWeekBooking = {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  start_time: string;
  /** HH:MM */
  end_time: string;
  title: string;
  requester: string | null;
};

export type MeetingRoomWeekSchedule = {
  room: { id: number; name: string };
  week: { start: string; end: string; dates: string[] };
  bookings: MeetingRoomWeekBooking[];
};

export type CancelledMeetingRoomRequest = { result: 'deleted' | 'cancelled' };

function urlWith(base: string, query?: Record<string, string | undefined>) {
  const url = new URL(base);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

/** Everything the create-request form needs, in one call. */
export async function getMeetingRoomOptions(uniStaffId: string): Promise<MeetingRoomOptions> {
  const json = await requestJson(urlWith(ENDPOINTS.meetingRoomOptions, { uni_staff_id: uniStaffId }));
  ensureSuccess(json);

  return json.data as MeetingRoomOptions;
}

/**
 * Client-side pre-check only — the same room/date/time-window overlap check
 * create_action() re-runs (and actually enforces) on submit.
 */
export async function checkMeetingRoomAvailability(params: {
  roomId: number | string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<MeetingRoomAvailability> {
  const json = await requestJson(
    urlWith(ENDPOINTS.meetingRoomAvailability, {
      room_id: String(params.roomId),
      date: params.date,
      start_time: params.startTime,
      end_time: params.endTime,
    }),
  );
  ensureSuccess(json);

  return json.data as MeetingRoomAvailability;
}

/** One room's booked slots for the week containing `date` (defaults to today). */
export async function getMeetingRoomWeek(
  roomId: number | string,
  date?: string,
): Promise<MeetingRoomWeekSchedule> {
  const json = await requestJson(
    urlWith(ENDPOINTS.meetingRoomWeek, { room_id: String(roomId), date }),
  );
  ensureSuccess(json);

  return json.data as MeetingRoomWeekSchedule;
}

/**
 * The signed-in person's own requests.
 *
 * `current` = status < 90 (awaiting/approved/rejected, still live in the
 * site's own vocabulary); `history` = status >= 90 (cancelled/closed).
 * Fetched whole, not paged — request volume per person is low, unlike
 * classroom bookings (see services/roomBookingAggregator.ts for why the two
 * are combined the way they are).
 */
export async function listMyMeetingRoomRequests(
  uniStaffId: string,
  scope: 'current' | 'history' = 'current',
): Promise<MyMeetingRoomRequest[]> {
  const json = await requestJson(
    urlWith(ENDPOINTS.meetingRoomList, { uni_staff_id: uniStaffId, scope }),
  );
  ensureSuccess(json);

  return Array.isArray(json?.data) ? (json.data as MyMeetingRoomRequest[]) : [];
}

/** Owner-scoped on the server: a request belonging to someone else answers
 *  404, the same as one that does not exist. */
export async function getMeetingRoomRequestDetail(
  uniStaffId: string,
  orderId: number | string,
): Promise<MeetingRoomRequestDetail> {
  const json = await requestJson(
    urlWith(ENDPOINTS.meetingRoomDetail, { uni_staff_id: uniStaffId, order_id: String(orderId) }),
  );
  ensureSuccess(json);

  return json.data as MeetingRoomRequestDetail;
}

/**
 * Submit the request.
 *
 * Goes through `postMeetingRoom`, not `requestJson`, for the same reason
 * bookingRoomService.ts's `createBooking` does: a 409 room conflict or a 422
 * "leader_id is not eligible" carries the server's own specific wording, and
 * that is the whole point of the answer.
 */
export async function createMeetingRoomRequest(
  input: CreateMeetingRoomInput,
): Promise<CreatedMeetingRoomRequest> {
  return postMeetingRoom<CreatedMeetingRoomRequest>(ENDPOINTS.meetingRoomCreate, input);
}

/** Mirrors the server's own tiered rule — see the plan this module was built
 *  from. The result tells the caller which of the two actually happened, so
 *  the UI can say so rather than a generic "cancelled". */
export async function cancelMeetingRoomRequest(
  uniStaffId: string,
  orderId: number | string,
): Promise<CancelledMeetingRoomRequest> {
  return postMeetingRoom<CancelledMeetingRoomRequest>(ENDPOINTS.meetingRoomCancel, {
    uni_staff_id: uniStaffId,
    order_id: String(orderId),
  });
}

/** POST + keep the server's own 4xx wording — see bookingRoomService.ts's
 *  `postBooking` for the identical pattern this copies. */
async function postMeetingRoom<T>(url: string, input: unknown): Promise<T> {
  const response = await fetch(
    url,
    withApiToken(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  );

  const text = await response.text();
  let json: { data?: unknown; error?: { message?: string } } | null = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    throw new Error(json?.error?.message || TEXT.MEETING_ROOM_SUBMIT_ERROR);
  }

  if (!json?.data) {
    throw new Error(TEXT.MEETING_ROOM_SUBMIT_ERROR);
  }

  return json.data as T;
}
