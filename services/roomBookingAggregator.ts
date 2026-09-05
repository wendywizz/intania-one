/**
 * One list, however many room-booking systems there are.
 *
 * This is the one place that knows classroom booking (booking-room) and
 * meeting-room requests are two different backends with two different data
 * shapes — the merged current/history tabs at app/booking-room/(tabs)/index.tsx
 * and completed.tsx call only this file, never the two services directly, so
 * a third room kind (studio, already planned) is one more source call added
 * here and nothing else changes.
 *
 * Pagination asymmetry is deliberate, not an oversight: classroom bookings are
 * frequent enough to need real paging (completed.tsx already pages them,
 * PAGE_SIZE 30); meeting-room requests are rare enough per person that the
 * whole set is fetched every time and folded into every page of classroom
 * results, rather than teaching this module to page two independent cursors
 * against one one another.
 */
import type { Href } from 'expo-router';

import type { IconSymbolName } from '@/components/ui/icon-symbol';
import type { ListCardBadge } from '@/components/ui/list-card';
import { getMeetingRoomStatusBadge } from '@/components/meeting-room/status-badge';
import { TEXT } from '@/constants/text';
import { formatDateRange } from '@/utils/date-format';
import { listMyBookings, type MyBooking } from './bookingRoomService';
import { listMyMeetingRoomRequests, type MyMeetingRoomRequest } from './meetingRoomService';

export type UnifiedBookingKind = 'classroom' | 'meeting-room';

export type UnifiedBooking = {
  /** `${kind}:${nativeId}` — stable across both systems, safe as a list key. */
  id: string;
  kind: UnifiedBookingKind;
  kindLabel: string;
  title: string;
  /** ISO-ish, whatever the source gives — used only to sort, never displayed. */
  sortDate: string;
  dateLabel: string;
  badge: ListCardBadge | null;
  icon: IconSymbolName;
  onPressRoute: Href;
};

function classroomIcon(typeId: number): IconSymbolName {
  if (typeId === 2) return 'calendar-range';
  if (typeId === 3) return 'calendar-clock';
  return 'calendar';
}

function toUnifiedClassroom(booking: MyBooking, scope: 'current' | 'history'): UnifiedBooking {
  const from = booking.first_date || booking.start_date;
  const to = booking.last_date || booking.end_date;

  return {
    id: `classroom:${booking.book_id}`,
    kind: 'classroom',
    kindLabel: TEXT.BOOKING_ROOM_KIND_LABEL,
    title: booking.subject_id || booking.objective || TEXT.BOOKING_ROOM_ADD_BOOKING,
    sortDate: from || to || booking.booked_at,
    dateLabel: formatDateRange(from, to),
    badge: null,
    icon: classroomIcon(booking.booktype.id),
    onPressRoute: {
      pathname: '/booking-room/booking-detail',
      params: {
        book_id: String(booking.book_id),
        ...(scope === 'history' ? { from: 'completed' } : {}),
      },
    } as Href,
  };
}

function toUnifiedMeetingRoom(
  request: MyMeetingRoomRequest,
  scope: 'current' | 'history',
): UnifiedBooking {
  return {
    id: `meeting-room:${request.order_id}`,
    kind: 'meeting-room',
    kindLabel: TEXT.MEETING_ROOM_KIND_LABEL,
    title: request.detail || request.room_name || TEXT.MEETING_ROOM_HUB_CARD_TITLE,
    sortDate: request.startdate || request.enddate || request.request_date,
    dateLabel: formatDateRange(
      request.startdate || request.request_date,
      request.enddate || request.startdate || request.request_date,
    ),
    badge: request.status_label ? getMeetingRoomStatusBadge(request.status_label) : null,
    icon: 'presentation',
    // Cast through `unknown` — the meeting-room-detail route is new enough
    // that Expo Router's generated route-type union may not have picked it up
    // yet in every editor/typecheck pass, the same reason navPush's own call
    // sites do this (see utils/navigation.ts's docblock).
    onPressRoute: {
      pathname: '/booking-room/meeting-room-detail',
      params: {
        order_id: String(request.order_id),
        ...(scope === 'history' ? { from: 'completed' } : {}),
      },
    } as unknown as Href,
  };
}

function sortByDateDesc(items: UnifiedBooking[]) {
  return [...items].sort((a, b) => (a.sortDate < b.sortDate ? 1 : a.sortDate > b.sortDate ? -1 : 0));
}

export type ListUnifiedBookingsResult = {
  items: UnifiedBooking[];
  /** Reflects only the classroom side's pagination — meeting-room's full set
   *  is already folded into every page, so it never extends this. */
  hasMore: boolean;
};

/**
 * Both room kinds' requests/bookings, normalized and merged by date.
 *
 * `scope='current'` sorts soonest-last-slot-first the way booking-room's own
 * list already does server-side for classroom items; meeting-room items are
 * folded in and the combined list is re-sorted by date so the two interleave
 * correctly rather than classroom-then-meeting-room in two blocks.
 */
export async function listUnifiedBookings(
  staffId: string,
  scope: 'current' | 'history',
  page?: { limit?: number; offset?: number },
): Promise<ListUnifiedBookingsResult> {
  const [classroomResult, meetingRoomResult] = await Promise.allSettled([
    listMyBookings(staffId, scope, page),
    // Only fetched on the first page — meeting-room's whole set was already
    // folded in then, and refetching it on every subsequent classroom page
    // would just re-merge the same rows.
    !page?.offset ? listMyMeetingRoomRequests(staffId, scope) : Promise.resolve([]),
  ]);

  const classroomBookings = classroomResult.status === 'fulfilled' ? classroomResult.value : [];
  const meetingRoomRequests = meetingRoomResult.status === 'fulfilled' ? meetingRoomResult.value : [];

  // A failed classroom fetch on a later page should not silently look like
  // "no more results" — but Promise.allSettled already isolates one source's
  // failure from the other, so the worst case here is one source coming back
  // empty rather than the whole merged list failing to load.

  const items = sortByDateDesc([
    ...classroomBookings.map((b) => toUnifiedClassroom(b, scope)),
    ...meetingRoomRequests.map((r) => toUnifiedMeetingRoom(r, scope)),
  ]);

  return {
    items,
    hasMore: Boolean(page?.limit) && classroomBookings.length >= (page?.limit ?? 0),
  };
}
