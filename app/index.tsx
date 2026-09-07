import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppText as Text } from '@/components/app-text';
import { useFontScale } from '@/constants/typography';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TEXT } from '@/constants/text';

import { LoadingAnimate } from '@/components/loading-animate';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PillButton } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import type { AuthUser, ExamTask, News } from '@/models/types';
import { getUnreadNotificationCount } from '@/services/notificationService';
import { staffNewsFeed } from '@/services/newsService';
import { getActiveSummary, type ActiveSummaryData } from '@/services/activeSummaryService';
import { approvingWaitingData } from '@/services/absenceService';
import { getForgetApprovalWaiting } from '@/services/timestampService';
import { listExamTasks } from '@/services/examinarService';
import { formatNewsDateTime } from '@/utils/date-format';
import { navPush } from '@/utils/navigation';
import { ENDPOINTS } from '@/constants/endpoints';
import {
  NAV_LOGO,
  PSU_PASSPORT_BUTTON,
  PSU_PASSPORT_BUTTON_ASPECT,
  USER_PLACEHOLDER,
} from '@/constants/images';
import { boxShadow } from '@/constants/shadows';

// Scroll offsets at which the pinned mini header appears / disappears. The gap
// between them is deliberate — it stops the bar flickering at the boundary.
const COMPACT_HEADER_SHOW_AT = 64;
const COMPACT_HEADER_HIDE_AT = 40;

// ─── Soft warm palette (smart-home reference) ─────────────────────────────────
// A warm cream canvas with pure-white cards floating on soft, warm-tinted
// shadows; thin charcoal icons sit in soft grey circles. One warm-orange accent
// carries counts, the unread dot, and CTAs — everything else stays neutral.
type M = {
  bg: string;
  card: string;
  fill: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  icon: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  notify: string;
  shadow: string;
  // Text that sits directly on the screen canvas (m.bg), not on a card.
  onCanvas: string;
  onCanvasMuted: string;
  onCanvasFaint: string;
};

const LIGHT: M = {
  bg: '#F4F6F8',
  card: '#FFFFFF',
  fill: '#EEF1F4',
  text: '#141414',
  textMuted: '#8D8E92',
  textFaint: '#B4B7BC',
  border: '#E3E6EA',
  icon: '#2E3338',
  accent: '#B33939',
  accentSoft: 'rgba(179, 57, 57, 0.14)',
  accentText: '#FFFFFF',
  notify: '#C0392B',
  shadow: '#9AA3AE',
  onCanvas: '#141414',
  onCanvasMuted: '#8D8E92',
  onCanvasFaint: '#B4B7BC',
};

const DARK: M = {
  bg: '#141311',
  card: '#1E1C19',
  fill: '#282520',
  text: '#F2EFEA',
  textMuted: '#A39C90',
  textFaint: '#6E675B',
  border: '#2C2925',
  icon: '#E6E1D8',
  // Same red as light mode, not a lightened tint of it — the lightened
  // version read as a washed-out salmon/pink against the dark background,
  // and accentText was paired to *that* (dark navy, for a light pink fill) —
  // now that the fill is a proper dark red again, its text goes back to
  // white, same as light mode.
  accent: '#B33939',
  accentSoft: 'rgba(179, 57, 57, 0.30)',
  accentText: '#FFFFFF',
  // Same red as light mode — same reasoning as accent above.
  notify: '#C0392B',
  shadow: '#000000',
  onCanvas: '#F2EFEA',
  onCanvasMuted: '#A39C90',
  onCanvasFaint: '#6E675B',
};

function useMinimal(): M {
  const { isDarkMode } = useTheme();
  return isDarkMode ? DARK : LIGHT;
}

function useMStyles<T extends StyleSheet.NamedStyles<T>>(factory: (m: M) => T): T {
  const m = useMinimal();
  return useMemo(() => StyleSheet.create(factory(m)), [m, factory]);
}

// Sarabun. General text uses Regular; titles/emphasis use SemiBold.
const F = {
  light: 'Sarabun_Lt',
  regular: 'Sarabun_Rg',
  medium: 'Sarabun_Md',
  semibold: 'Sarabun_Sb',
} as const;

const D = {
  pad: 20,
  gap: 12,
} as const;

// The edge under both card kinds the signed-in home is built from — the pending
// tiles and the module tiles. One spec because they sit on the same canvas at
// the same level: a shadow that differed between them would read as one being
// nearer the reader than the other.
//
// Tight rather than diffuse: a short offset and a small blur, so it reads as a
// defined edge under the hairline border these cards already carry, not as a
// glow the card is floating above. Darker than a wide shadow would be, because
// a shadow this small has far less area to be seen in — the blur stays at 3 and
// only the opacity moves, since softening it is what would undo the edge.
const CARD_SHADOW = { y: 1, blur: 3, opacity: 0.26 } as const;

// Published-date accent on the news cards — shared by the icon and the label so
// they always match.
const NEWS_DATE_COLOR = '#F1C40F';

// Line heights for the news card, named because they are needed twice: once in
// the stylesheet and once multiplied by the device font scale at the call site.
// A lineHeight written in a stylesheet is a fixed number of points — the glyphs
// inside it grow with the device text-size setting and it does not, so at large
// sizes the lines collide and the card clips them.
const NEWS_TITLE_LINE_HEIGHT = 21;
const NEWS_DATE_LINE_HEIGHT = 17;

type IconName = Parameters<typeof IconSymbol>[0]['name'];

// The menu tile a module owns. Named once and used by both the grid below and
// every shift item's `module`, so the red dot on a tile and the tiles in the
// pending band are two views of one list and cannot drift apart. A shift item's
// own `onPress` target is deeper than this and sometimes a different path
// entirely (the exam roster's menu entry is /examiner, its screen /examinar),
// which is why the two are separate fields rather than one.
const MODULE_HREF = {
  // The tab group's own index, not a named tab: which tab opens first depends
  // on whether this person is teaching staff, and that branch lives in
  // app/timestamp/(tabs)/index.tsx so a deep link lands where the menu does.
  timestamp: '/timestamp',
  absence: '/absence/pending',
  meeting: '/meeting',
  repair: '/repair-computer',
  noticeRepair: '/notice-repair',
  booking: '/booking-room',
  exam: '/examiner',
  calendar: '/calendar',
  person: '/person-search',
} as const;

// The order the grid draws them in, and the only thing that decides it. Daily
// business first, then the things asked for when something is needed, with
// reference lookups last.
const MENU_ITEMS: readonly { title: string; href: string; icon: IconName }[] = [
  { title: TEXT.TIMESTAMP_TITLE, href: MODULE_HREF.timestamp, icon: 'calendar-clock' },
  // Straight to the pending list, not to /absence: the leave-form chooser there
  // is no longer a tab, so landing on it would show a tab bar with nothing
  // selected. Starting a new request is a button on this list.
  // A document, not another calendar: leave is filed as ใบลา, and the grid can
  // only carry so many calendar glyphs before they stop telling each other apart.
  { title: TEXT.ABSENCE_TITLE, href: MODULE_HREF.absence, icon: 'doc.text.fill' },
  { title: TEXT.MEETING_MENU_TITLE, href: MODULE_HREF.meeting, icon: 'person.2.fill' },
  { title: TEXT.REPAIR_COMPUTER_MENU_TITLE, href: MODULE_HREF.repair, icon: 'laptop' },
  { title: TEXT.NOTICE_REPAIR__MENU_TITLE, href: MODULE_HREF.noticeRepair, icon: 'wrench.fill' },
  { title: TEXT.BOOKING_ROOM_MENU_TITLE, href: MODULE_HREF.booking, icon: 'door.open' },
  // A clipboard, not a checkmark: a tick reads as "approved/done", and this is a
  // roster of duty to turn up for.
  { title: TEXT.EXAMINER_MENU_TITLE, href: MODULE_HREF.exam, icon: 'clipboard-list' },
  { title: TEXT.CALENDAR_TITLE, href: MODULE_HREF.calendar, icon: 'calendar-range' },
  { title: TEXT.PERSON_SEARCH_TITLE, href: MODULE_HREF.person, icon: 'user-round-search' },
];

function getDateString() {
  const n = new Date();
  // Buddhist year, as every other date in the app is shown — the greeting was
  // the one place still reading 2026 while the screens below it said 2569.
  const year = n.getFullYear() + 543;
  return `${TEXT.HOME_DAY_NAMES[n.getDay()]} ${n.getDate()} ${TEXT.HOME_MONTH_NAMES[n.getMonth()]} ${year}`;
}

function getFirstName(user: AuthUser | null) {
  const raw = (String(user?.name ?? user?.staffId ?? '')).trim();
  return raw.split(/\s+/)[0] ?? raw;
}

function getNewsKey(item: News, index: number) {
  return `${String(item.guid || item.link || item.title)}-${index}`;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function getCurrentExamParams(): { year: string; term: string; period: string } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = String(now.getFullYear());
  if (month >= 8 && month <= 12) return { year, term: '1', period: month <= 10 ? 'mid' : 'final' };
  if (month >= 1 && month <= 5)  return { year, term: '2', period: month <= 3  ? 'mid' : 'final' };
  return { year, term: '3', period: 'final' };
}

function isExamUpcoming(task: ExamTask): boolean {
  const raw = String(task.date ?? (task as Record<string, unknown>).exam_date ?? '').trim();
  if (!raw) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(raw); d.setHours(0, 0, 0, 0);
  return !isNaN(d.getTime()) && d >= today;
}

// One outstanding thing to do — one tile. Not grouped: every tile is built and
// sized identically, and the module lives in the icon + caption instead of in a
// card header wrapped around it.
type ShiftItem = {
  key: string;
  /** What to do, e.g. 'งานใหม่'. */
  label: string;
  /** Which module it belongs to, e.g. 'แจ้งซ่อมคอม · หัวหน้าช่าง'. */
  caption: string;
  /**
   * The module tile this belongs to — one of `MODULE_HREF`. Not where the tile
   * navigates (that is `onPress`, which goes to the exact queue): this is what
   * puts the red dot on the right square of the menu grid.
   */
  module: string;
  count: number;
  icon: IconName;
  onPress: () => void;
};

// Icon per module, so the tile is identifiable before any of its text is read.
// Same glyph the module carries in MENU_ITEMS — a module that looked like one
// thing in the grid and another in this list would be two modules to the reader.
const SHIFT_ICONS = {
  repair: 'laptop',
  absence: 'doc.text.fill',
  meeting: 'person.2.fill',
  timestamp: 'calendar-clock',
  // The same glyph the lecturer tab carries, so the tile and the tab it opens
  // are recognisably the same thing.
  lectTimestamp: 'log-in',
  exam: 'clipboard-list',
  booking: 'door.open',
} as const satisfies Record<string, IconName>;

type ShiftSources = {
  data: ActiveSummaryData | null;
  upcomingExams: ExamTask[];
  absenceApproval: { show: boolean; count: number };
  timestampApproval: { show: boolean; count: number };
};

/**
 * Everything outstanding, from every module, as one flat list.
 *
 * This lives outside the section that draws it because two things on this
 * screen need the answer: the band of tiles, and the red dot on each module
 * tile in the grid below it. Deriving the dots from this list rather than
 * re-reading the summary is the whole point — a dot can only appear where a
 * tile exists, so the grid can never claim work the band does not show, or
 * stay clean while the band lists five things.
 */
function buildShiftItems({ data, upcomingExams, absenceApproval, timestampApproval }: ShiftSources): ShiftItem[] {
  // A tile with nothing outstanding is not worth showing, so the count check
  // lives here rather than at each of the eleven call sites.
  const tiles: ShiftItem[] = [];
  const add = (item: ShiftItem) => {
    if (item.count > 0) tiles.push(item);
  };
  const to = (path: string) => () => navPush(path as Parameters<typeof navPush>[0]);

  // ── Repair computer: one tile per role-specific queue ──────────────────────
  if (data?.repairComputer.success) {
    const repairTasks = data.repairComputer.tasks ?? [];
    const countOf = (key: string) =>
      repairTasks.find((task) => task.key === key)?.count ?? 0;
    // No role in the caption. The summary reports one `role` per account, so
    // only that role's keys come back with a count — the tiles below are already
    // mutually exclusive in practice and naming the role would add nothing.
    const repair = (key: string, label: string, count: number, path: string) =>
      add({
        key,
        label,
        caption: TEXT.REPAIR_COMPUTER_MENU_TITLE,
        module: MODULE_HREF.repair,
        count,
        icon: SHIFT_ICONS.repair,
        onPress: to(path),
      });

    // Informer: only the current job.
    repair('repair-informer', TEXT.HOME_SHIFT_CURRENT_JOB,
      countOf('user-current-job'), '/repair-computer/current-job');
    // Foreman: new job + current jobs (running / supply approvals).
    repair('repair-foreman-new', TEXT.HOME_SHIFT_NEW_JOB,
      countOf('foreman-new-job'), '/repair-computer/foreman-new-job');
    repair('repair-foreman-current', TEXT.HOME_SHIFT_CURRENT_JOB,
      countOf('foreman-running') + countOf('foreman-supply-approve'),
      '/repair-computer/manage-job');
    // Worker: new job + current jobs (in progress / awaiting supply).
    repair('repair-worker-new', TEXT.HOME_SHIFT_NEW_JOB,
      countOf('worker-new-job'), '/repair-computer/worker-new-job');
    repair('repair-worker-current', TEXT.HOME_SHIFT_CURRENT_JOB,
      countOf('worker-current-job') + countOf('worker-supply-wait'),
      '/repair-computer/worker-current-job');
  }

  // ── Absence: own requests (all roles) + approvals (boss only) ───────────────
  if (data?.absence.success) {
    add({
      key: 'absence-mine',
      label: TEXT.HOME_SHIFT_MY_LEAVE,
      caption: TEXT.ABSENCE_TITLE,
      module: MODULE_HREF.absence,
      count: (data.absence.pending?.length ?? 0) + (data.absence.cancelled?.length ?? 0),
      icon: SHIFT_ICONS.absence,
      onPress: to('/absence/my-leave'),
    });
  }
  if (absenceApproval.show) {
    add({
      key: 'absence-approve',
      label: TEXT.HOME_SHIFT_APPROVE_LEAVE,
      caption: TEXT.ABSENCE_TITLE,
      module: MODULE_HREF.absence,
      count: absenceApproval.count,
      icon: SHIFT_ICONS.absence,
      onPress: to('/absence/approve-leave'),
    });
  }

  // ── Meeting ────────────────────────────────────────────────────────────────
  if (data?.meeting.success) {
    add({
      key: 'meeting-today',
      label: TEXT.HOME_SHIFT_MEETINGS_TODAY,
      caption: TEXT.MEETING_MENU_TITLE,
      module: MODULE_HREF.meeting,
      count: data.meeting.items.length,
      icon: SHIFT_ICONS.meeting,
      onPress: to('/meeting'),
    });
  }

  // ── Booking room: rooms this person is due in today ────────────────────────
  //
  // Optional-chained on the field itself, unlike the sections above: this one
  // was added after the app shipped, so a build talking to a gateway that has
  // not been updated gets `undefined` here rather than a section, and reading
  // `.success` off it would take the whole home screen down.
  if (data?.bookingRoom?.success) {
    add({
      key: 'booking-today',
      label: TEXT.HOME_SHIFT_BOOKING_TODAY,
      caption: TEXT.BOOKING_ROOM_MENU_TITLE,
      module: MODULE_HREF.booking,
      count: data.bookingRoom.items.length,
      icon: SHIFT_ICONS.booking,
      onPress: to('/booking-room'),
    });
  }

  // ── Lecturer stamping: today, and only while it is still outstanding ───────
  // Counted 1/0 rather than by a list: there is one stamp a day, so `add()`
  // dropping a zero-count tile is exactly the behaviour wanted — the card is
  // there until they stamp and then it is gone.
  if (data?.lectTimestamp.success && data.lectTimestamp.isLecturer) {
    add({
      key: 'lect-timestamp',
      label: TEXT.HOME_SHIFT_LECT_TIMESTAMP,
      caption: TEXT.TIMESTAMP_TITLE,
      module: MODULE_HREF.timestamp,
      count: data.lectTimestamp.stamped ? 0 : 1,
      icon: SHIFT_ICONS.lectTimestamp,
      onPress: to('/timestamp/stamp'),
    });
  }

  // ── Timestamp: own forgot-timestamp requests + approvals (boss only) ────────
  if (data?.timestamp.success) {
    add({
      key: 'timestamp-mine',
      label: TEXT.HOME_SHIFT_TIMESTAMP,
      caption: TEXT.TIMESTAMP_TITLE,
      module: MODULE_HREF.timestamp,
      count: data.timestamp.items.length,
      icon: SHIFT_ICONS.timestamp,
      onPress: to('/timestamp/forgot-timestamp'),
    });
  }
  if (timestampApproval.show) {
    add({
      key: 'timestamp-approve',
      label: TEXT.HOME_SHIFT_APPROVE_TIMESTAMP,
      caption: TEXT.TIMESTAMP_TITLE,
      module: MODULE_HREF.timestamp,
      count: timestampApproval.count,
      icon: SHIFT_ICONS.timestamp,
      onPress: to('/timestamp/approve'),
    });
  }

  // ── Examinar: upcoming exams ───────────────────────────────────────────────
  add({
    key: 'exam-upcoming',
    label: TEXT.HOME_SHIFT_UPCOMING_EXAM,
    caption: TEXT.EXAMINAR_HEADER_TITLE,
    module: MODULE_HREF.exam,
    count: upcomingExams.length,
    icon: SHIFT_ICONS.exam,
    onPress: to('/examinar'),
  });

  return tiles;
}

type UpcomingShiftSectionProps = {
  tiles: ShiftItem[];
  loading: boolean;
  error: boolean;
  onReload: () => void;
};

// Module mark and count on top, what-to-do underneath. Every tile uses this one
// layout at one size — the previous tile design special-cased the odd last tile
// into a wide row with its own type scale, so the same item looked different
// depending on where it landed in the grid.
function ShiftTile({ item, width }: { item: ShiftItem; width: number }) {
  const m = useMinimal();
  const s = useMStyles(makeShiftStyles);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={item.onPress}
      style={({ pressed }) => [
        s.tile,
        { width },
        Platform.OS === 'web' ? ({ scrollSnapAlign: 'start' } as any) : null,
        pressed && s.tilePressed,
      ]}>
      <View style={s.tileTop}>
        <View style={s.tileIcon}>
          <IconSymbol name={item.icon} size={18} color={m.accent} />
        </View>
        <Text style={s.tileCount}>{item.count}</Text>
      </View>
      <View style={s.tileText}>
        <Text numberOfLines={1} style={s.tileLabel}>{item.label}</Text>
        <Text numberOfLines={2} style={s.tileCaption}>{item.caption}</Text>
      </View>
    </Pressable>
  );
}

function UpcomingShiftSection({ tiles, loading, error, onReload }: UpcomingShiftSectionProps) {
  const m = useMinimal();
  const s = useMStyles(makeShiftStyles);
  const { width: screenWidth } = useWindowDimensions();
  // Two tiles plus a sliver of the third, so the row visibly continues past the
  // edge. Capped so tiles don't balloon on a tablet.
  const tileWidth = Math.min(190, Math.floor(screenWidth * 0.4));

  // Loaded, and nothing outstanding — the whole band is omitted below, title
  // included: nothing pending means nothing to head either.
  const isEmpty = !loading && !error && tiles.length === 0;
  if (isEmpty) return null;

  return (
    <View style={s.coverCard}>
      {/* The title is part of the content, not the frame: it heads a list of
          pending work, so it only appears when there is some. While loading we
          don't yet know. The error state keeps it, because there the work is
          unknown, not absent. */}
      {!loading && <Text style={s.coverTitle}>{TEXT.HOME_UPCOMING_SHIFT_TITLE}</Text>}

      {loading ? (
        <View style={s.stateWrap}>
          <ActivityIndicator color={m.textMuted} />
        </View>
      ) : error ? (
        <View style={s.errorWrap}>
          <View style={s.stateWrap}>
            <IconSymbol name="exclamationmark.triangle.fill" size={22} color={m.textFaint} />
            <Text style={s.emptyText}>{TEXT.HOME_SHIFT_LOAD_ERROR}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onReload}
            style={({ pressed }) => [s.reloadBtn, pressed && s.reloadBtnPressed]}>
            <IconSymbol name="arrow.triangle.2.circlepath" size={16} color={m.accent} />
            <Text style={s.reloadBtnText}>{TEXT.SHARED_RETRY}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={tileWidth + D.gap}
          snapToAlignment="start"
          disableIntervalMomentum
          style={Platform.OS === 'web' ? ({ scrollSnapType: 'x mandatory' } as any) : undefined}
          contentContainerStyle={s.tileRow}>
          {tiles.map((tile) => (
            <ShiftTile key={tile.key} item={tile} width={tileWidth} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const makeShiftStyles = (m: M) => StyleSheet.create({
  // Full-width band behind the whole section (like the news band): breaks out of
  // the page padding and fills a shade darker than the canvas, so the title +
  // cards sit on one grouped zone rather than floating on the background.
  // A negative top margin fully cancels the inter-section gap so this band's top
  // edge butts directly against the news band; its own vertical padding gives it
  // internal breathing room instead. Bottom stays a little deeper than top — the
  // band above supplies part of the top edge, nothing supplies the bottom one.
  coverCard: {
    gap: 14,
    marginHorizontal: -D.pad,
    marginTop: -40,
    backgroundColor: m.fill,
    paddingHorizontal: D.pad,
    paddingTop: 22,
    paddingBottom: 26,
  },
  coverTitle: {
    fontFamily: F.semibold,
    fontSize: 16,
    lineHeight: 21,
    color: m.onCanvas,
  },
  // One row that scrolls sideways. Tiles are equal height because the content
  // container stretches them, so a two-line caption lifts the whole row rather
  // than making one tile taller than its neighbours.
  tileRow: {
    gap: D.gap,
    paddingRight: 4,
  },
  // Height budget, because four values decide it together and changing one alone
  // just moves the slack somewhere else: 13+13 padding, a 30pt icon row, a 10pt
  // gap, then label 20 + 2 + caption 17 — about 105 for the usual one-line
  // caption. minHeight is only a floor; the row's content container stretches
  // every tile to match the tallest, so a caption that wraps lifts them all.
  tile: {
    minHeight: 104,
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: m.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: m.border,
    boxShadow: boxShadow(m.shadow, CARD_SHADOW),
  },
  tilePressed: {
    opacity: 0.7,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  tileIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: m.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // Big enough to be the tile's anchor, small enough that a 2-digit count still
  // fits beside the icon on a narrow phone. Kept under the icon's 30pt so the
  // count is never what sets the top row's height.
  tileCount: {
    fontFamily: F.semibold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: m.accent,
  },
  tileText: {
    gap: 2,
  },
  tileLabel: {
    fontFamily: F.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: m.text,
  },
  tileCaption: {
    fontFamily: F.regular,
    fontSize: 12,
    lineHeight: 17,
    color: m.textMuted,
  },
  stateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  emptyText: {
    fontFamily: F.regular,
    fontSize: 14,
    lineHeight: 20,
    color: m.textMuted,
  },
  errorWrap: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  reloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: m.accentSoft,
  },
  reloadBtnPressed: {
    opacity: 0.7,
  },
  reloadBtnText: {
    fontFamily: F.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: m.accent,
  },
});

export default function HomeScreen() {
  const m = useMinimal();
  const { isDarkMode } = useTheme();
  const styles = useMStyles(makeStyles);
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
    state?: string;
  }>();
  const { width: screenWidth } = useWindowDimensions();
  const fontScale = useFontScale();
  const insets = useSafeAreaInsets();

  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [authCallbackErrorMessage, setAuthCallbackErrorMessage] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newsItems, setNewsItems] = useState<News[]>([]);
  const [isNewsReady, setIsNewsReady] = useState(false);
  const [isNewsError, setIsNewsError] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isCompactHeader, setIsCompactHeader] = useState(false);
  const [activeSummary, setActiveSummary] = useState<ActiveSummaryData | null>(null);
  const [isActiveSummaryLoading, setIsActiveSummaryLoading] = useState(false);
  const [isActiveSummaryError, setIsActiveSummaryError] = useState(false);
  // Whether the shift-tile group (summary + exams + absence/timestamp
  // approvals) has settled at least once. Distinct from isActiveSummaryLoading,
  // which also flips true/false around a later manual retry — that retry must
  // not re-trigger the whole-page gate below.
  const [isSummaryReady, setIsSummaryReady] = useState(false);
  const [upcomingExams, setUpcomingExams] = useState<ExamTask[]>([]);
  const [absenceApproval, setAbsenceApproval] = useState<{ show: boolean; count: number }>({
    show: false,
    count: 0,
  });
  const [timestampApproval, setTimestampApproval] = useState<{ show: boolean; count: number }>({
    show: false,
    count: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const processedCallbackRef = useRef('');
  const { completeWebSignIn, eligibility, loading: isAuthLoading, signIn, signOut, user: authUser } = useAuth();
  const completeWebSignInRef = useRef(completeWebSignIn);

  useEffect(() => {
    completeWebSignInRef.current = completeWebSignIn;
  }, [completeWebSignIn]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [authUser?.staffId]);

  useEffect(() => {
    let isMounted = true;
    const callbackKey = [params.code, params.error, params.state].filter(Boolean).join(':');

    async function completeLogin() {
      if (callbackKey && processedCallbackRef.current === callbackKey) return;
      processedCallbackRef.current = callbackKey;
      try {
        await completeWebSignInRef.current({
          code: params.code,
          error: params.error,
          errorDescription: params.error_description,
          state: params.state,
        });
        if (isMounted) router.replace('/');
      } catch (error) {
        if (isMounted) setAuthCallbackErrorMessage(error instanceof Error ? error.message : String(error));
      }
    }

    if (callbackKey) completeLogin();
    return () => { isMounted = false; };
  }, [params.code, params.error, params.error_description, params.state]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      // Signed out there is no bell to badge, and the count is per-user anyway.
      if (authUser) {
        void getUnreadNotificationCount().then((count) => {
          if (isActive) setUnreadCount(count);
        });
      } else {
        setUnreadCount(0);
      }

      // No per-section spinner here — the whole page gates behind the single
      // full-screen loader below until this settles. Reset on every focus
      // (not just first mount) so coming back from another screen shows that
      // loader again rather than leaving the last visit's cards up while this
      // refetches quietly underneath.
      setIsNewsReady(false);
      void staffNewsFeed().then((items) => {
        if (!isActive) return;
        setNewsItems(items);
        setIsNewsError(false);
      }).catch(() => {
        if (!isActive) return;
        setNewsItems([]);
        setIsNewsError(true);
      }).finally(() => {
        if (isActive) setIsNewsReady(true);
      });

      return () => { isActive = false; };
    }, [authUser]),
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      // Auth is still resolving — its own gate already blocks the page, and
      // authUser/eligibility aren't trustworthy yet. Deciding "nothing to
      // fetch" from an authUser that just hasn't loaded YET would mark this
      // group ready before the real fetch below even starts. Wait it out;
      // this effect re-fires once isAuthLoading flips (it's a dep).
      if (isAuthLoading) return;

      // Reset on every focus, not just first mount — matches isNewsReady
      // above, so a revisit gates the whole page behind the full-screen
      // loader again instead of only the upcoming-shift band's own spinner.
      setIsSummaryReady(false);

      const staffId = String(authUser?.staffId ?? '').trim();
      const userId = String(authUser?.userId ?? authUser?.staffId ?? '').trim();
      // Someone outside the faculty sees none of this, so there is nothing to
      // fetch — skip the round trip to every module's summary API. Nothing to
      // wait for either, so the tile group counts as settled straight away.
      if (!staffId || eligibility === 'denied') {
        setIsSummaryReady(true);
        return;
      }

      setIsActiveSummaryLoading(true);
      setIsActiveSummaryError(false);

      const examParams = getCurrentExamParams();
      // All four settle together — the page-level gate waits for this whole
      // group, so it must not lift on whichever call happens to answer first.
      void Promise.allSettled([
        getActiveSummary(staffId, userId),
        listExamTasks({ staff_id: staffId, ...examParams }),
        approvingWaitingData(staffId),
        getForgetApprovalWaiting(staffId),
      ]).then(([summaryResult, examResult, absenceResult, timestampResult]) => {
        if (!isActive) return;

        if (summaryResult.status === 'fulfilled') {
          setActiveSummary(summaryResult.value);
          setIsActiveSummaryError(false);
        } else {
          setActiveSummary(null);
          setIsActiveSummaryError(true);
        }

        setUpcomingExams(
          examResult.status === 'fulfilled' ? examResult.value.filter(isExamUpcoming) : [],
        );
        setAbsenceApproval(
          absenceResult.status === 'fulfilled'
            ? { show: absenceResult.value.show, count: absenceResult.value.data.length }
            : { show: false, count: 0 },
        );
        setTimestampApproval(
          timestampResult.status === 'fulfilled'
            ? { show: timestampResult.value.show, count: timestampResult.value.data.length }
            : { show: false, count: 0 },
        );

        setIsActiveSummaryLoading(false);
        setIsSummaryReady(true);
      });

      return () => { isActive = false; };
    }, [authUser, eligibility, isAuthLoading]),
  );

  // Built here, not inside the band, because the module grid needs the same
  // answer: a red dot goes on exactly those module tiles that have a tile in
  // the band. One list, two renderings — see buildShiftItems.
  const shiftTiles = useMemo(
    () => buildShiftItems({ data: activeSummary, upcomingExams, absenceApproval, timestampApproval }),
    [activeSummary, upcomingExams, absenceApproval, timestampApproval],
  );

  // Which module hrefs carry a dot. A set, not a count: the dot says only that
  // there is something waiting, and the number is on the tile in the band.
  const pendingModules = useMemo(
    () => new Set(shiftTiles.map((tile) => tile.module)),
    [shiftTiles],
  );

  const reloadActiveSummary = useCallback(() => {
    const staffId = String(authUser?.staffId ?? '').trim();
    const userId = String(authUser?.userId ?? authUser?.staffId ?? '').trim();
    if (!staffId) return;

    setIsActiveSummaryLoading(true);
    setIsActiveSummaryError(false);
    getActiveSummary(staffId, userId)
      .then((data) => {
        setActiveSummary(data);
        setIsActiveSummaryError(false);
        setIsActiveSummaryLoading(false);
      })
      .catch(() => {
        setActiveSummary(null);
        setIsActiveSummaryError(true);
        setIsActiveSummaryLoading(false);
      });
  }, [authUser]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const staffId = String(authUser?.staffId ?? '').trim();
    const userId = String(authUser?.userId ?? authUser?.staffId ?? '').trim();

    await Promise.allSettled([
      staffNewsFeed()
        .then((items) => { setNewsItems(items); setIsNewsError(false); })
        .catch(() => { setNewsItems([]); setIsNewsError(true); }),
      staffId
        ? getUnreadNotificationCount().then(setUnreadCount).catch(() => {})
        : Promise.resolve(),
      staffId
        ? getActiveSummary(staffId, userId)
            .then((data) => { setActiveSummary(data); setIsActiveSummaryError(false); })
            .catch(() => { setActiveSummary(null); setIsActiveSummaryError(true); })
        : Promise.resolve(),
      staffId
        ? listExamTasks({ staff_id: staffId, ...getCurrentExamParams() })
            .then((tasks) => setUpcomingExams(tasks.filter(isExamUpcoming)))
            .catch(() => setUpcomingExams([]))
        : Promise.resolve(),
      staffId
        ? approvingWaitingData(staffId)
            .then((result) => setAbsenceApproval({ show: result.show, count: result.data.length }))
            .catch(() => setAbsenceApproval({ show: false, count: 0 }))
        : Promise.resolve(),
      staffId
        ? getForgetApprovalWaiting(staffId)
            .then((result) => setTimestampApproval({ show: result.show, count: result.data.length }))
            .catch(() => setTimestampApproval({ show: false, count: 0 }))
        : Promise.resolve(),
    ]);

    setIsRefreshing(false);
  }, [authUser]);

  const handleLogin = async () => {
    try { await signIn(); }
    catch (error) { setAuthCallbackErrorMessage(error instanceof Error ? error.message : String(error)); }
  };

  const handleConfirmLogout = async () => {
    setIsLogoutConfirmOpen(false);
    setIsSigningOut(true);
    try { await wait(900); await signOut(); }
    finally { setIsSigningOut(false); }
  };

  const openNews = useCallback((item: News) => {
    navPush({
      pathname: '/news-detail',
      params: {
        title: item.title, link: item.link, guid: item.guid,
        description: item.description, category: item.category, pubDate: item.pubDate,
      },
    } as Parameters<typeof navPush>[0]);
  }, []);

  // Once the big greeting header scrolls away, a compact pinned version of it
  // takes over. Two thresholds give it hysteresis so it can't flicker when the
  // scroll rests right on the boundary. Declared above the auth early-returns —
  // every hook must run on every render.
  const compactAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(compactAnim, {
      toValue: isCompactHeader ? 1 : 0,
      duration: 180,
      // react-native-web has no native animated module; asking for one there
      // only produces a console warning.
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [compactAnim, isCompactHeader]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setIsCompactHeader((wasCompact) =>
      wasCompact ? offsetY > COMPACT_HEADER_HIDE_AT : offsetY > COMPACT_HEADER_SHOW_AT,
    );
  }, []);

  // ─── Whole-page loading gate ────────────────────────────────────────────────
  // Nothing on this screen renders piecemeal: auth, the news feed and the
  // shift-tile group (summary + exams + absence/timestamp approvals) all have
  // to have settled before anything shows. Until then the page is blank but
  // for the loader — no header, no partially-loaded sections popping in one
  // at a time. isNewsReady/isSummaryReady are reset to false at the top of
  // their own useFocusEffect (see above), so returning to this screen from
  // anywhere re-gates the whole page behind the loader, the same as a first
  // load — not just the upcoming-shift band's own spinner.
  if (isAuthLoading || !isNewsReady || !isSummaryReady) {
    return (
      <View style={[styles.container, styles.center]}>
        <LoadingAnimate />
      </View>
    );
  }

  // ─── Home ───────────────────────────────────────────────────────────────────
  // Signed out, the same screen is shown with everything personal taken out of
  // it: no greeting, no settings or notifications, no pending work and no module
  // menu. What is left — the news feed — is public anyway, and a login button
  // takes the place of the header actions.

  // Signed in but not Faculty of Engineering staff: the account is real, so there
  // is nothing to log in to and no login button to offer — but none of the
  // modules apply to them either. They get the stripped-down screen with an
  // explanation in place of the sign-in call to action.
  const isDenied = Boolean(authUser) && eligibility === 'denied';
  const isGuest = !authUser || isDenied;
  const displayedNews = newsItems.slice(0, 3);
  const menuCardWidth = Math.floor((screenWidth - D.pad * 2 - D.gap * 2) / 3);
  const newsCardWidth = Math.floor(screenWidth * 0.72);
  const avatarSource = authUser?.staffId
    ? `${ENDPOINTS.photoBase}${String(authUser.staffId)}.jpg`
    : null;

  return (
    <View style={styles.container}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={m.onCanvasMuted} />}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerRow}>
            {isGuest ? (
              <Image
                source={NAV_LOGO}
                style={styles.navLogo}
                contentFit="contain"
                contentPosition="left"
              />
            ) : (
              // The whole greeting cluster opens the profile, not just the
              // avatar: the name and the date sit inside the same object and
              // are the larger half of it, so a tap that lands on them has to
              // go where a tap on the face goes.
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={TEXT.HOME_VIEW_PROFILE_A11Y}
                onPress={() => navPush('/my-profile' as Parameters<typeof navPush>[0])}
                style={({ pressed }) => [styles.greetRow, pressed && styles.pressed]}>
                <View style={styles.avatarFrame}>
                  <Image
                    source={avatarSource && !avatarFailed ? { uri: avatarSource } : USER_PLACEHOLDER}
                    style={styles.avatar}
                    contentFit="cover"
                    onError={() => setAvatarFailed(true)}
                  />
                </View>
                <View style={styles.greetingWrap}>
                  <Text numberOfLines={1} style={styles.greeting}>{getFirstName(authUser)}</Text>
                  <Text numberOfLines={1} style={styles.date}>{getDateString()}</Text>
                </View>
              </Pressable>
            )}

            {/* Settings and notifications are both personal — signed out the
                header carries no actions at all, and signing in is offered
                below the news band instead. */}
            {isGuest ? null : (
              <View style={styles.headerRight}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={TEXT.SETTINGS_TITLE}
                  onPress={() => navPush('/settings')}
                  style={({ pressed }) => [styles.iconBtn, styles.iconBtnLight, pressed && styles.pressed]}>
                  <IconSymbol name="gearshape.fill" size={20} color={m.icon} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={TEXT.NOTIFICATION_TITLE}
                  onPress={() => navPush('/notification')}
                  style={({ pressed }) => [styles.iconBtn, styles.iconBtnLight, pressed && styles.pressed]}>
                  <IconSymbol name="bell.fill" size={20} color={m.icon} />
                  {unreadCount > 0 ? <View style={styles.bellBadge} /> : null}
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* ── Padded content ──────────────────────────────────────────────── */}
        {/* Signed out there is only the news band above the sign-in call to
            action, so the block is allowed to grow and centre it in whatever
            height is left rather than leaving it stranded under the news. */}
        <View style={[styles.innerContent, isGuest && styles.innerContentGuest]}>

          {/* News section — sits on a full-width primary band */}
          <View style={styles.newsSection}>
            <View style={styles.newsHead}>
              <View style={styles.sectionRow}>
                <Text style={styles.newsSectionTitle}>{TEXT.HOME_NEWS_SECTION_TITLE}</Text>
                {isNewsError ? null : (
                  <PillButton
                    label={TEXT.HOME_SEE_ALL_THAI}
                    variant="onAccent"
                    onPress={() => navPush('/news')}
                  />
                )}
              </View>
            </View>

            {/* News cards — horizontal scroll, break out to the band edges */}
            <View style={styles.newsScrollOuter}>
            {displayedNews.length === 0 ? (
              <View style={[styles.newsEmptyCard, { width: screenWidth - D.pad * 2 }]}>
                <View style={styles.newsEmptyIcon}>
                  <IconSymbol name="doc.text.fill" size={20} color={m.textFaint} />
                </View>
                <Text style={styles.newsEmpty}>{TEXT.HOME_NO_NEWS_MESSAGE}</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={newsCardWidth + 12}
                snapToAlignment="start"
                disableIntervalMomentum
                style={Platform.OS === 'web' ? ({ scrollSnapType: 'x mandatory' } as any) : undefined}
                contentContainerStyle={styles.newsScrollContent}>
                {displayedNews.map((item, i) => (
                  <Pressable
                    key={getNewsKey(item, i)}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.newsCard,
                      { width: newsCardWidth },
                      Platform.OS === 'web' ? ({ scrollSnapAlign: 'start' } as any) : null,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => openNews(item)}>
                    <Text
                      numberOfLines={2}
                      style={[styles.newsTitle, { lineHeight: NEWS_TITLE_LINE_HEIGHT * fontScale }]}>
                      {item.title}
                    </Text>
                    {item.pubDate ? (
                      <View style={styles.newsDateRow}>
                        <IconSymbol name="calendar" size={13} color={NEWS_DATE_COLOR} />
                        <Text
                          numberOfLines={1}
                          style={[styles.newsDate, { lineHeight: NEWS_DATE_LINE_HEIGHT * fontScale }]}>
                          {formatNewsDateTime(item.pubDate)}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            )}
            </View>
          </View>

          {/* Signed out, the sign-in call to action takes the place the pending
              work and the module menu would occupy. Signed in from another
              faculty, the same space explains why the rest of the screen is
              empty — offering a login button there would be nonsense, they are
              already logged in. */}
          {isDenied ? (
            <View style={styles.loginSection}>
              <View style={styles.deniedIcon}>
                <IconSymbol name="exclamationmark.triangle.fill" size={26} color={m.textMuted} />
              </View>
              <Text style={styles.deniedText}>{TEXT.HOME_NOT_ELIGIBLE}</Text>
              {/* The one control this screen keeps. Without it the session has no
                  exit: settings is hidden, and a signed-in user gets no login
                  button — they could never sign out or try another account. */}
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsLogoutConfirmOpen(true)}
                style={({ pressed }) => [styles.deniedLogoutBtn, pressed && styles.pressed]}>
                <Text style={styles.deniedLogoutText}>{TEXT.HOME_LOGOUT}</Text>
              </Pressable>
            </View>
          ) : isGuest ? (
            <View style={styles.loginSection}>
              {/* The artwork carries the wording, so the button has no label of
                  its own — hence the explicit accessibility label. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={TEXT.AUTH_LOGIN}
                onPress={handleLogin}
                style={({ pressed }) => [styles.loginBtn, pressed && styles.pressed]}>
                <Image
                  source={PSU_PASSPORT_BUTTON}
                  style={styles.loginBtnImage}
                  contentFit="contain"
                />
              </Pressable>
              <Text style={styles.loginNote}>{TEXT.HOME_LOGIN_NOTE}</Text>
            </View>
          ) : null}

          {/* Upcoming Shift + module menu: both are per-user. */}
          {isGuest ? null : (
            <>
              <UpcomingShiftSection
                tiles={shiftTiles}
                loading={isActiveSummaryLoading}
                error={isActiveSummaryError}
                onReload={reloadActiveSummary}
              />

              {/* Menu section — matches the upcoming band's vertical padding and
                  sits flush beneath it. */}
              <View style={styles.menuSection}>
                <View style={styles.menuGrid}>
                  {MENU_ITEMS.map((item) => {
                    // Same dot the bell wears, in the same place, for the same
                    // reason — so it reads as "unattended" on sight rather than
                    // as a decoration this grid invented. Keyed on MODULE_HREF.absence
                    // regardless of role — see the boss branch below — so this still
                    // matches shiftTiles' own `module` field for both leave tiles.
                    const hasPending = pendingModules.has(item.href);
                    // MODULE_HREF.absence points at the pending list, which is a
                    // general-user tab (see _layout.tsx) — a boss/approver has no
                    // such tab and would land on a screen the tab bar doesn't
                    // show as selected. Unlike the timestamp module, /absence
                    // itself isn't free to be a role-aware redirect: it's the
                    // leave-type picker, and other screens already push to it
                    // expecting that. So the branch lives here instead.
                    // approve-leave is now the boss's first tab (see _layout.tsx) —
                    // land there, not on my-leave, so the tab that opens is the
                    // one already showing active in the bar.
                    const target = item.href === MODULE_HREF.absence && absenceApproval.show
                      ? '/absence/approve-leave'
                      : item.href;
                    return (
                      <Pressable
                        key={item.href}
                        accessibilityRole="button"
                        accessibilityLabel={hasPending ? `${item.title}, ${TEXT.HOME_MENU_PENDING_A11Y}` : item.title}
                        style={({ pressed }) => [styles.menuCard, { width: menuCardWidth }, pressed && styles.pressed]}
                        onPress={() => navPush(target as Parameters<typeof navPush>[0])}>
                        <IconSymbol name={item.icon} size={30} color={m.icon} />
                        <Text numberOfLines={2} style={styles.menuLabel}>{item.title}</Text>
                        {hasPending ? <View style={styles.menuBadge} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </>
          )}

        </View>
      </ScrollView>

      {/* ── Pinned mini header ────────────────────────────────────────────── */}
      {/* Signed out it would carry the same avatar, name and personal actions the
          main header just dropped, so it is not rendered at all. */}
      {isGuest ? null : (
      <Animated.View
        pointerEvents={isCompactHeader ? 'auto' : 'none'}
        style={[
          styles.miniHeader,
          {
            paddingTop: insets.top + 8,
            opacity: compactAnim,
            transform: [
              {
                translateY: compactAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-16, 0],
                }),
              },
            ],
          },
        ]}>
        <View style={styles.miniHeaderRow}>
          {/* Avatar and name together, same as the big header — this is the
              same control in its pinned form, so it takes the same tap. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={TEXT.HOME_VIEW_PROFILE_A11Y}
            onPress={() => navPush('/my-profile' as Parameters<typeof navPush>[0])}
            style={({ pressed }) => [styles.miniGreetRow, pressed && styles.pressed]}>
            <View style={styles.miniAvatarFrame}>
              <Image
                source={avatarSource && !avatarFailed ? { uri: avatarSource } : USER_PLACEHOLDER}
                style={styles.avatar}
                contentFit="cover"
                onError={() => setAvatarFailed(true)}
              />
            </View>
            <Text numberOfLines={1} style={styles.miniGreeting}>{getFirstName(authUser)}</Text>
          </Pressable>

          <View style={styles.headerRight}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={TEXT.SETTINGS_TITLE}
              onPress={() => navPush('/settings')}
              style={({ pressed }) => [styles.miniIconBtn, pressed && styles.pressed]}>
              <IconSymbol name="gearshape.fill" size={19} color={m.icon} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={TEXT.NOTIFICATION_TITLE}
              onPress={() => navPush('/notification')}
              style={({ pressed }) => [styles.miniIconBtn, pressed && styles.pressed]}>
              <IconSymbol name="bell.fill" size={19} color={m.icon} />
              {unreadCount > 0 ? <View style={styles.miniBellBadge} /> : null}
            </Pressable>
          </View>
        </View>
      </Animated.View>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <Modal
        transparent
        visible={isLogoutConfirmOpen}
        animationType="fade"
        onRequestClose={() => setIsLogoutConfirmOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsLogoutConfirmOpen(false)}>
          <Pressable accessibilityRole="none" onPress={(e) => e.stopPropagation()}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>{TEXT.HOME_CONFIRM_LOGOUT_TITLE}</Text>
              <Text style={styles.modalMessage}>{TEXT.HOME_CONFIRM_LOGOUT_MESSAGE}</Text>
              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsLogoutConfirmOpen(false)}
                  style={styles.btnSecondary}>
                  <Text style={styles.btnSecondaryText}>{TEXT.CANCEL}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={handleConfirmLogout} style={styles.btnDanger}>
                  <Text style={styles.btnDangerText}>{TEXT.HOME_LOGOUT}</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={isSigningOut} animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.signingOutModal}>
            <LoadingAnimate fill={false} title={TEXT.HOME_SIGNING_OUT_TITLE} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
          </View>
        </View>
      </Modal>

      {/* Sign-in failure. It used to live on the welcome screen, which no longer
          exists — without it here a failed callback would report nothing. */}
      <Modal
        transparent
        visible={Boolean(authCallbackErrorMessage)}
        animationType="fade"
        onRequestClose={() => setAuthCallbackErrorMessage('')}>
        <Pressable style={styles.backdrop} onPress={() => setAuthCallbackErrorMessage('')}>
          <Pressable accessibilityRole="none" onPress={(e) => e.stopPropagation()}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>{TEXT.AUTH_LOGIN_FAILED}</Text>
              <Text style={styles.modalMessage}>{authCallbackErrorMessage}</Text>
              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setAuthCallbackErrorMessage('')}
                  style={styles.btnPrimary}>
                  <Text style={styles.btnPrimaryText}>{TEXT.SHARED_OK}</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const makeStyles = (m: M) => StyleSheet.create({
  container: { flex: 1, backgroundColor: m.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },

  scrollContent: { flexGrow: 1 },

  // Header — clean, on the page canvas (no colored bar). Kept tight top and
  // bottom: the 42px action buttons already give the row its breathing space,
  // so the padding only has to clear the status bar.
  header: {
    paddingHorizontal: D.pad,
    paddingBottom: 4,
    backgroundColor: m.bg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 52,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  iconBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    position: 'relative',
  },
  iconBtnLight: {
    backgroundColor: m.card,
    boxShadow: boxShadow(m.shadow, { y: 4, blur: 8, opacity: 0.12 }),
  },
  bellBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: m.notify,
    borderWidth: 1.5,
    borderColor: m.card,
  },
  greetRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Stands in for the whole greeting cluster when signed out. Height matches the
  // avatar so the header keeps the same bar height either way; `contentFit
  // contain` lets the width follow the artwork's own aspect ratio.
  navLogo: {
    flex: 1,
    height: 44,
    alignSelf: 'center',
  },
  // Centred in the space a signed-in user's pending work and module menu would
  // fill — the one thing a visitor can act on, so it sits in the middle of the
  // page rather than tucked under the news band or into a header corner.
  loginSection: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  // Lets `loginSection` claim the leftover height. Only applied signed out —
  // signed in the block is already taller than the screen.
  innerContentGuest: {
    flexGrow: 1,
  },
  // Width-driven: the height follows the artwork's own ratio, so the button can
  // never end up stretched. `maxWidth` caps it on a tablet while `width: 100%`
  // lets it shrink inside the page gutter on a narrow phone.
  loginBtn: {
    width: '100%',
    maxWidth: 280,
    aspectRatio: PSU_PASSPORT_BUTTON_ASPECT,
  },
  loginBtnImage: {
    width: '100%',
    height: '100%',
  },
  // Sits where the login button would be, in the same centred block.
  deniedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: m.fill,
  },
  deniedText: {
    fontFamily: F.medium,
    fontSize: 16,
    lineHeight: 24,
    color: m.onCanvas,
    textAlign: 'center',
  },
  deniedLogoutBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  deniedLogoutText: {
    fontFamily: F.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: m.onCanvasMuted,
    textDecorationLine: 'underline',
  },
  // Who the app is for — quiet enough not to compete with the button above it.
  loginNote: {
    fontFamily: F.regular,
    fontSize: 13,
    lineHeight: 20,
    color: m.onCanvasMuted,
    textAlign: 'center',
  },
  greetingWrap: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    fontFamily: F.semibold,
    fontSize: 20,
    lineHeight: 26,
    color: m.onCanvas,
  },
  date: {
    fontFamily: F.regular,
    fontSize: 13,
    lineHeight: 18,
    color: m.onCanvasMuted,
  },
  // The avatar's ring. Not a button any more — the whole greeting row is the
  // target — so it only draws the circle.
  avatarFrame: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: m.card,
    boxShadow: boxShadow(m.shadow, { y: 4, blur: 10, opacity: 0.14 }),
  },
  avatar: {
    width: '100%',
    height: '100%',
  },

  // Pinned compact header — fades in over the canvas once the big one scrolls
  // past, so the greeting and the two actions stay reachable.
  miniHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: D.pad,
    paddingBottom: 10,
    backgroundColor: m.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: m.border,
    boxShadow: boxShadow(m.shadow, { y: 2, blur: 10, opacity: 0.1 }),
    // Replaces the `elevation` this had before boxShadow: on Android elevation
    // was doing double duty as the stacking order that keeps this above the
    // scrolling canvas.
    zIndex: 4,
  },
  miniHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 40,
  },
  // Avatar + name, the pinned header's half of the row; the actions keep the
  // other half, so this grows into whatever is left rather than the whole row.
  miniGreetRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniAvatarFrame: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    flexShrink: 0,
  },
  miniGreeting: {
    flex: 1,
    fontFamily: F.semibold,
    fontSize: 17,
    lineHeight: 23,
    color: m.text,
  },
  miniIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: m.fill,
    position: 'relative',
  },
  miniBellBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: m.notify,
    borderWidth: 1.5,
    borderColor: m.fill,
  },

  // Padded content below header
  innerContent: {
    paddingHorizontal: D.pad,
    paddingTop: 24,
    gap: 40,
  },

  // Menu section wrapper — mirrors the upcoming band's vertical padding and sits
  // flush beneath it (marginTop cancels the inter-section gap). The inner gap:40
  // keeps the original title↔grid spacing intact alongside sectionHead's -26.
  // No heading of its own — the grid's icons already say what each tile is, so
  // the top padding is what separates it from the band above.
  menuSection: {
    // The negative margin cancels the gap the section stack leaves, so the
    // padding below is the whole distance to the band above — the two have to
    // move together or the section detaches from it.
    marginTop: -40,
    paddingTop: 24,
    paddingBottom: 22,
  },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAll: {
    fontFamily: F.medium,
    fontSize: 14,
    lineHeight: 19,
    color: m.accent,
  },

  // News — full-width primary band behind the section title + cards
  newsSection: {
    marginHorizontal: -D.pad,
    backgroundColor: m.accent,
    paddingHorizontal: D.pad,
    paddingTop: 20,
    paddingBottom: 22,
  },
  newsHead: {
    marginBottom: 14,
  },
  newsSectionTitle: {
    fontFamily: F.semibold,
    fontSize: 16,
    lineHeight: 21,
    color: m.accentText,
  },
  newsSeeAllBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  newsSeeAll: {
    fontFamily: F.medium,
    fontSize: 13,
    lineHeight: 18,
    color: m.accentText,
  },
  // News cards break out to the band edges
  // Keep the horizontal scroll inside the section's normal gutter so the first
  // card lines up with the section title (was full-bleed, which pushed the first
  // card hard against the screen edge on web).
  newsScrollOuter: {
    minHeight: 112,
  },
  newsScrollContent: {
    paddingRight: 4,
    gap: 12,
  },
  newsCard: {
    backgroundColor: '#8A2626',
    borderRadius: 22,
    padding: 18,
    // minHeight, not height: the title is allowed two lines and both of them
    // grow with the device text-size setting, so a fixed 112 is a box the text
    // spills out of. The cards are in a horizontal row and stretch to the
    // tallest one, so they still line up.
    minHeight: 112,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'flex-start',
    boxShadow: boxShadow('#4A0F11', { y: 4, blur: 18, opacity: 0.18 }),
  },
  newsTitle: {
    fontFamily: F.medium,
    fontSize: 15,
    lineHeight: NEWS_TITLE_LINE_HEIGHT,
    color: m.accentText,
  },
  newsDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  newsDate: {
    fontFamily: F.regular,
    fontSize: 13,
    lineHeight: NEWS_DATE_LINE_HEIGHT,
    color: NEWS_DATE_COLOR,
  },
  newsEmptyCard: {
    backgroundColor: m.card,
    borderRadius: 22,
    alignSelf: 'center',
    minHeight: 112,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: m.border,
    boxShadow: boxShadow(m.shadow, { y: 3, blur: 10, opacity: 0.06 }),
  },
  newsEmptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: m.fill,
  },
  newsEmpty: {
    fontFamily: F.regular,
    fontSize: 14,
    lineHeight: 20,
    color: m.textMuted,
    textAlign: 'center',
  },

  // Menu grid — airy, hairline-bordered tiles, monochrome glyphs
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: D.gap,
  },
  menuCard: {
    backgroundColor: m.card,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 12,
    minHeight: 112,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: m.border,
    boxShadow: boxShadow(m.shadow, CARD_SHADOW),
  },
  menuLabel: {
    fontFamily: F.regular,
    fontSize: 13,
    lineHeight: 17,
    color: m.text,
    textAlign: 'center',
  },
  // Deliberately the bellBadge geometry, one point larger: the tile is a bigger
  // target than the icon button, and the ring in the card colour is what keeps
  // the dot legible where it overlaps the tile's own border.
  menuBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: m.notify,
    borderWidth: 1.5,
    borderColor: m.card,
  },

  // Modals
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    padding: 22,
    backgroundColor: m.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: m.border,
  },
  modalTitle: {
    fontFamily: F.semibold,
    fontSize: 17,
    lineHeight: 24,
    color: m.text,
  },
  modalMessage: {
    fontFamily: F.regular,
    fontSize: 14,
    lineHeight: 20,
    color: m.textMuted,
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 22,
  },
  btnPrimary: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: m.accent,
    paddingHorizontal: 18,
  },
  btnPrimaryText: {
    fontFamily: F.semibold,
    fontSize: 15,
    color: m.accentText,
  },
  btnSecondary: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: m.border,
    paddingHorizontal: 16,
  },
  btnSecondaryText: {
    fontFamily: F.semibold,
    fontSize: 15,
    color: m.text,
  },
  btnDanger: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: m.accent,
    paddingHorizontal: 18,
  },
  btnDangerText: {
    fontFamily: F.semibold,
    fontSize: 15,
    color: m.accentText,
  },
  signingOutModal: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 18,
    paddingHorizontal: 20,
    backgroundColor: m.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: m.border,
  },

  // Welcome (unauthenticated)
});
