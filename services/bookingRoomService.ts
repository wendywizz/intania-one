import { ENDPOINTS } from '../constants/endpoints';
import { TEXT } from '../constants/text';
import { ensureSuccess, requestJson } from './api';

export type BookingRoom = {
  id: string;
  name: string;
  capacity: number;
  projector: boolean;
  mic: boolean;
  status: string;
  building_id: string;
};

export type RoomBooking = {
  detail_id: number;
  book_id: number;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  start_time: string;
  /** HH:MM */
  end_time: string;
  subject_id: string;
  section: string;
  objective: string;
  teacher: string;
  /** The colour the website gives this booking; reused so the two look alike. */
  bgcolor: string;
  term: string;
  year: string;
};

export type RoomWeekSchedule = {
  room: BookingRoom;
  week: {
    /** Monday */
    start: string;
    /** Sunday */
    end: string;
    /** All seven dates, Monday first. */
    dates: string[];
  };
  /**
   * The timetable geometry the website draws. Sent by the server rather than
   * assumed here so the two cannot drift apart.
   */
  grid: { start_hour: number; end_hour: number; slot_minutes: number };
  bookings: RoomBooking[];
};

function urlWith(base: string, query?: Record<string, string | undefined>) {
  const url = new URL(base);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

/** Every bookable room, in the order the booking website lists them. */
export async function listBookingRooms(): Promise<BookingRoom[]> {
  const json = await requestJson(urlWith(ENDPOINTS.bookingRoomRooms));
  ensureSuccess(json);

  return Array.isArray(json?.data) ? (json.data as BookingRoom[]) : [];
}

/**
 * One room's bookings for the week containing `date`.
 *
 * Both arguments are optional: the server falls back to its first room and to
 * today, which is what the website does when the page is opened cold.
 */
export async function getRoomWeekSchedule(
  roomId?: string,
  date?: string,
): Promise<RoomWeekSchedule> {
  const json = await requestJson(
    urlWith(ENDPOINTS.bookingRoomSchedule, { room_id: roomId, date }),
  );
  ensureSuccess(json);

  return json.data as RoomWeekSchedule;
}

/** DAY / TERM / PERIOD, as tb_booktype names them. */
export type BookingTypeCode = 'DAY' | 'TERM' | 'PERIOD' | '';

/**
 * One booking a person made: a header (what and who) plus a summary of its
 * slots. A จองเทอม booking can hold sixty room-and-time slots, so the list
 * carries how many there are and the span they cover rather than the slots
 * themselves.
 */
export type MyBooking = {
  book_id: number;
  booktype: {
    id: number;
    code: BookingTypeCode;
    /** Thai wording — 'จองทั่วไป' | 'จองเทอม' | 'จองช่วง'. */
    label: string;
  };
  /** The subject or activity. Free text for an ad-hoc booking. */
  subject_id: string;
  subj_key: string;
  section: string;
  term: string;
  year: string;
  objective: string;
  teacher: string;
  bgcolor: string;
  software: string;
  /** 'YYYY-MM-DD HH:MM:SS' — when the booking was made. */
  booked_at: string;
  /** The header's own span, as the booking form recorded it. */
  start_date: string;
  end_date: string;
  /** The real span of the slots. Can differ from the header's. */
  first_date: string;
  last_date: string;
  slot_count: number;
  rooms: string[];
};

/**
 * The signed-in person's own bookings.
 *
 * `current` is everything whose last slot is today or later, soonest first;
 * `history` is the rest, most recent first.
 *
 * Note this is *not* the website's "รายการจองห้อง" page. That page shows a
 * PHP-session basket of lines someone is composing and has not submitted — it
 * has no rows in any table and so cannot be read from a phone. These are the
 * bookings that were actually saved.
 */
export async function listMyBookings(
  staffId: string,
  scope: 'current' | 'history' = 'current',
  page?: { limit?: number; offset?: number },
): Promise<MyBooking[]> {
  const json = await requestJson(
    urlWith(ENDPOINTS.bookingRoomMyBookings, {
      staff_id: staffId,
      scope,
      // Paging applies to history only; the current list is short by
      // definition. The server ignores these for `current` either way.
      limit: page?.limit != null ? String(page.limit) : undefined,
      offset: page?.offset != null ? String(page.offset) : undefined,
    }),
  );
  ensureSuccess(json);

  return Array.isArray(json?.data) ? (json.data as MyBooking[]) : [];
}

/** One room-and-time slot of a booking. */
export type MyBookingSlot = {
  detail_id: number;
  room_id: string;
  room_name: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  start_time: string;
  /** HH:MM */
  end_time: string;
};

/** A booking with every slot — what the list rows summarise. */
export type MyBookingDetail = MyBooking & {
  owner: { id: string; username: string; fullname: string };
  /**
   * Whether the signed-in person may cancel this booking. Decided on the server
   * — owner, the subject's lecturer, or an admin — and sent as a fact, so this
   * only decides whether the button is drawn. The server checks again on the
   * call itself.
   */
  can_delete: boolean;
  slots: MyBookingSlot[];
};

/** What cancelling one booking reports back. */
export type DeletedBooking = { book_id: number; slot_count: number };

/** What cancelling one date reports back. */
export type DeletedBookingSlot = {
  detail_id: number;
  book_id: number;
  /** Dates still standing after this one went. */
  remaining: number;
  /** True when that was the last date and the booking went with it. */
  booking_deleted: boolean;
};

/**
 * One of the signed-in person's own bookings.
 *
 * Owner-scoped on the server: a book_id belonging to someone else answers 404,
 * exactly as one that does not exist would.
 */
export async function getMyBookingDetail(
  staffId: string,
  bookId: number | string,
): Promise<MyBookingDetail> {
  const json = await requestJson(
    urlWith(ENDPOINTS.bookingRoomMyBookingDetail, {
      staff_id: staffId,
      book_id: String(bookId),
    }),
  );
  ensureSuccess(json);

  return json.data as MyBookingDetail;
}

/**
 * Cancel a booking and every slot under it.
 *
 * Goes through `postBooking` for the same reason the create calls do: the 4xx
 * wording is the answer. A 403 here means the server's rule about who may
 * cancel said no, and "server error" would not tell the person that.
 */
export async function deleteMyBooking(
  staffId: string,
  bookId: number | string,
): Promise<DeletedBooking> {
  return postBooking<DeletedBooking>(ENDPOINTS.bookingRoomMyBookingDelete, {
    staff_id: staffId,
    book_id: String(bookId),
  });
}

/**
 * Cancel one date of a booking, leaving the rest of it standing.
 *
 * A date that has already passed is refused by the server with its own message
 * ("ยกเลิกวันที่ผ่านมาแล้วไม่ได้"), which `postBooking` surfaces unchanged.
 */
export async function deleteMyBookingSlot(
  staffId: string,
  detailId: number | string,
): Promise<DeletedBookingSlot> {
  return postBooking<DeletedBookingSlot>(ENDPOINTS.bookingRoomMyBookingSlotDelete, {
    staff_id: staffId,
    detail_id: String(detailId),
  });
}

// --- จองทั่วไป form ---------------------------------------------------------

/** A subject the signed-in person teaches this term. */
export type TeachingSubject = {
  subject_id: string;
  subject_name: string;
  section: string;
  term: string;
  year: string;
  subj_key: string;
};

export type BookFormOptions = {
  term: { term: string; year: string; startdate: string; enddate: string };
  /** Empty when the teaching map has no rows for this person this term — the
   *  website shows "ไม่พบรายวิชาที่สอน" and only allows an ad-hoc booking. */
  subjects: TeachingSubject[];
  /** 'HH:MM' every half hour, 07:00–23:00. */
  times: string[];
  /** The person's name, for the ผู้สอน/ผู้รับผิดชอบ field. */
  teacher: string;
  default_color: string;
};

export type DateVerdict = {
  bookable: boolean;
  /** 'ok' | 'past' | 'weekend_notice' | 'holiday_notice' */
  reason: string;
  /** Thai explanation, '' when bookable. */
  message: string;
  holiday_name: string;
  is_weekend: boolean;
};

export type BookableRoom = {
  id: string;
  name: string;
  capacity: number;
  projector: boolean;
  mic: boolean;
  building_id: string;
  /** False when something already overlaps the chosen window. */
  available: boolean;
};

export type CreateBookingInput = {
  staff_id: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  start_time: string;
  /** HH:MM */
  end_time: string;
  room_id: string;
  subject_id: string;
  teacher: string;
  section?: string;
  objective?: string;
  subj_key?: string;
  term?: string;
  year?: string;
  bgcolor?: string;
  /** True for a booking that is not against a registered subject. */
  extra?: boolean;
};

export type CreatedBooking = {
  book_id: number;
  date: string;
  start_time: string;
  end_time: string;
  room: { id: string; name: string };
};

export async function getBookFormOptions(staffId: string): Promise<BookFormOptions> {
  const json = await requestJson(urlWith(ENDPOINTS.bookingRoomBookOptions, { staff_id: staffId }));
  ensureSuccess(json);

  return json.data as BookFormOptions;
}

export async function checkBookDate(date: string): Promise<DateVerdict> {
  const json = await requestJson(urlWith(ENDPOINTS.bookingRoomBookCheckDate, { date }));
  ensureSuccess(json);

  return json.data as DateVerdict;
}

export async function listBookableRooms(
  date: string,
  startTime: string,
  endTime: string,
): Promise<BookableRoom[]> {
  const json = await requestJson(
    urlWith(ENDPOINTS.bookingRoomBookRooms, {
      date,
      start_time: startTime,
      end_time: endTime,
    }),
  );
  ensureSuccess(json);

  return Array.isArray(json?.data) ? (json.data as BookableRoom[]) : [];
}

/**
 * Submit the booking.
 *
 * This does its own fetch instead of going through `mutationRequest`, which
 * throws a generic "server error" for any non-2xx. The interesting replies here
 * are 4xx and their messages are the whole point — "ห้องนี้ถูกจองในช่วงเวลา
 * ดังกล่าวแล้ว" tells the person to pick another room, and a generic error tells
 * them nothing.
 */
export async function createBooking(input: CreateBookingInput): Promise<CreatedBooking> {
  return postBooking<CreatedBooking>(ENDPOINTS.bookingRoomBookCreate, input);
}

/**
 * POST a booking form and keep the server's wording on failure.
 *
 * `mutationRequest` throws a generic "server error" for any non-2xx. The
 * interesting replies here are 4xx and their messages are the whole point —
 * "ห้อง A202 วันจันทร์ ถูกจองในช่วงเวลาดังกล่าวแล้ว" names the day and the room
 * to change, and a generic error names nothing.
 */
async function postBooking<T>(url: string, input: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const text = await response.text();
  let json: { data?: unknown; error?: { message?: string } } | null = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    throw new Error(json?.error?.message || TEXT.BOOKING_ROOM_SUBMIT_ERROR);
  }

  if (!json?.data) {
    throw new Error(TEXT.BOOKING_ROOM_SUBMIT_ERROR);
  }

  return json.data as T;
}

// --- จองรายเทอม form --------------------------------------------------------

/**
 * One weekday of the term.
 *
 * `date_count` is the number of times this weekday falls between the term's
 * start and end — the number of bookings ticking it will make. A term already
 * under way still counts the weeks that have gone; `past_count` is how many of
 * them, because the website books those too and the form should say so.
 */
export type TermDayInfo = {
  /** 'Monday' … 'Sunday' — what the create call expects back. */
  day: string;
  /** Thai, as the web form spells it: 'จันทร์' … 'อาทิตย์'. */
  label: string;
  date_count: number;
  past_count: number;
  first_date: string;
  last_date: string;
};

export type TermFormOptions = {
  term: { term: string; year: string; startdate: string; enddate: string };
  days: TermDayInfo[];
  subjects: TeachingSubject[];
  times: string[];
  teacher: string;
  default_color: string;
};

/** A booking already holding a room on that weekday. */
export type TermRoomConflict = {
  book_id: number;
  subject_id: string;
  section: string;
  start_time: string;
  end_time: string;
  /** The signed-in person's own booking. */
  mine: boolean;
  shareable: boolean;
};

export type TermRoom = {
  id: string;
  name: string;
  capacity: number;
  projector: boolean;
  mic: boolean;
  building_id: string;
  /** Free on every occurrence of that weekday in the term. */
  available: boolean;
  /**
   * Taken, but only by bookings this person may sit alongside — their own, or
   * another section of a subject they teach. The website offers these too;
   * co-teachers share a room rather than compete for it.
   */
  shareable: boolean;
  conflicts: TermRoomConflict[];
};

export type CreateTermDay = {
  day: string;
  /** HH:MM */
  start_time: string;
  /** HH:MM */
  end_time: string;
  room_id: string;
};

export type CreateTermInput = {
  staff_id: string;
  subject_id: string;
  teacher: string;
  days: CreateTermDay[];
  section?: string;
  objective?: string;
  subj_key?: string;
  term?: string;
  year?: string;
  bgcolor?: string;
  extra?: boolean;
};

export type CreatedTermBooking = {
  book_id: number;
  term: { term: string; year: string; startdate: string; enddate: string };
  /** Total tb_bookdetail rows written — the sum of every day's date_count. */
  slot_count: number;
  days: {
    day: string;
    label: string;
    start_time: string;
    end_time: string;
    room: { id: string; name: string };
    date_count: number;
  }[];
};

export async function getTermFormOptions(staffId: string): Promise<TermFormOptions> {
  const json = await requestJson(urlWith(ENDPOINTS.bookingRoomTermOptions, { staff_id: staffId }));
  ensureSuccess(json);

  return json.data as TermFormOptions;
}

/**
 * Rooms for one weekday across the whole term.
 *
 * Note this asks a harder question than the จองทั่วไป room list: not "is this
 * room free on this date" but "is it free on every Monday of the term". One
 * clash in week nine rules a room out for all fifteen weeks.
 */
export async function listTermRooms(
  staffId: string,
  day: string,
  startTime: string,
  endTime: string,
): Promise<TermRoom[]> {
  const json = await requestJson(
    urlWith(ENDPOINTS.bookingRoomTermRooms, {
      staff_id: staffId,
      day,
      start_time: startTime,
      end_time: endTime,
    }),
  );
  ensureSuccess(json);

  return Array.isArray(json?.data) ? (json.data as TermRoom[]) : [];
}

export async function createTermBooking(
  input: CreateTermInput,
): Promise<CreatedTermBooking> {
  return postBooking<CreatedTermBooking>(ENDPOINTS.bookingRoomTermCreate, input);
}

// --- จองเป็นช่วง ------------------------------------------------------------

export type PeriodFormOptions = {
  /** Still sent: an ad-hoc booking's header is stamped with the current term
   *  even though the range has nothing to do with it. */
  term: { term: string; year: string; startdate: string; enddate: string } | null;
  subjects: TeachingSubject[];
  times: string[];
  teacher: string;
  default_color: string;
  /** How long a range may be, so the form can say so before the server does. */
  max_days: number;
};

/**
 * What a chosen date range works out to.
 *
 * `ok: false` is an answer, not a failure — a backwards or past range is a
 * thing the person can see and fix, so it comes back with a reason rather than
 * as an error.
 */
export type PeriodDays = {
  ok: boolean;
  /** 'ok' | 'past' | 'order' | 'too_long' */
  reason: string;
  message: string;
  /** Calendar days the range covers, inclusive. */
  day_span: number;
  days: TermDayInfo[];
  /** Every weekday's count added up — what ticking all seven would book. */
  total: number;
};

export type CreatePeriodInput = CreateTermInput & {
  /** YYYY-MM-DD */
  start_date: string;
  /** YYYY-MM-DD */
  end_date: string;
};

export type CreatedPeriodBooking = {
  book_id: number;
  start_date: string;
  end_date: string;
  slot_count: number;
  days: CreatedTermBooking['days'];
};

export async function getPeriodFormOptions(staffId: string): Promise<PeriodFormOptions> {
  const json = await requestJson(
    urlWith(ENDPOINTS.bookingRoomPeriodOptions, { staff_id: staffId }),
  );
  ensureSuccess(json);

  return json.data as PeriodFormOptions;
}

export async function getPeriodDays(
  startDate: string,
  endDate: string,
): Promise<PeriodDays> {
  const json = await requestJson(
    urlWith(ENDPOINTS.bookingRoomPeriodDays, {
      start_date: startDate,
      end_date: endDate,
    }),
  );
  ensureSuccess(json);

  return json.data as PeriodDays;
}

export async function listPeriodRooms(
  staffId: string,
  day: string,
  startTime: string,
  endTime: string,
  startDate: string,
  endDate: string,
): Promise<TermRoom[]> {
  const json = await requestJson(
    urlWith(ENDPOINTS.bookingRoomPeriodRooms, {
      staff_id: staffId,
      day,
      start_time: startTime,
      end_time: endTime,
      start_date: startDate,
      end_date: endDate,
    }),
  );
  ensureSuccess(json);

  return Array.isArray(json?.data) ? (json.data as TermRoom[]) : [];
}

export async function createPeriodBooking(
  input: CreatePeriodInput,
): Promise<CreatedPeriodBooking> {
  return postBooking<CreatedPeriodBooking>(ENDPOINTS.bookingRoomPeriodCreate, input);
}
