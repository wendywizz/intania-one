import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
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
import { formatNewsDate } from '@/utils/date-format';
import { navPush } from '@/utils/navigation';
import { ENDPOINTS } from '@/constants/endpoints';

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
  accent: '#E07A7A',
  accentSoft: 'rgba(224, 122, 122, 0.30)',
  accentText: '#0B1220',
  notify: '#E4726D',
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
  medium: 'Sarabun_Rg',
  semibold: 'Sarabun_Sb',
} as const;

const D = {
  pad: 20,
  gap: 12,
} as const;

type IconName = Parameters<typeof IconSymbol>[0]['name'];

const MENU_ITEMS: readonly { title: string; href: string; icon: IconName }[] = [
  { title: TEXT.ABSENCE_TITLE, href: '/absence', icon: 'calendar-clock' },
  { title: TEXT.TIMESTAMP_TITLE, href: '/timestamp/calendar', icon: 'clock.fill' },
  { title: TEXT.MEETING_MENU_TITLE, href: '/meeting', icon: 'person.2.fill' },
  { title: TEXT.REPAIR_COMPUTER_MENU_TITLE, href: '/repair-computer', icon: 'laptop' },
  { title: TEXT.NOTICE_REPAIR__MENU_TITLE, href: '/notice-repair', icon: 'wrench.fill' },
  { title: TEXT.CALENDAR_TITLE, href: '/calendar', icon: 'calendar-range' },
  { title: TEXT.PERSON_SEARCH_TITLE, href: '/person-search', icon: 'user-round-search' },
  { title: TEXT.EXAMINER_MENU_TITLE, href: '/examiner', icon: 'checkmark.circle.fill' },
];

function getDateString() {
  const n = new Date();
  return `${TEXT.HOME_DAY_NAMES[n.getDay()]} ${n.getDate()} ${TEXT.HOME_MONTH_NAMES[n.getMonth()]} ${n.getFullYear()}`;
}

function getFirstName(user: AuthUser | null) {
  const raw = (String(user?.name ?? user?.staffId ?? '')).trim();
  return raw.split(/\s+/)[0] ?? raw;
}

function getInitials(user: AuthUser | null) {
  const raw = (String(user?.name ?? user?.staffId ?? '')).trim();
  const parts = raw.split(/\s+/);
  if (parts.length >= 2) return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  return (raw.slice(0, 2) || '?').toUpperCase();
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

// A single upcoming-shift stat tile: label + count, presented like the
// reference's featured "stat" tiles inside a white cover card.
type ShiftTile = {
  key: string;
  label: string;
  count: number;
  icon: IconName;
  onPress: () => void;
};

// A grouped sub-item row (repair roles, or absence own/approve). When a module
// has more than one, its rows collapse into a single grouped card.
type ShiftSub = {
  key: string;
  label: string;
  count: number;
  onPress: () => void;
};

type UpcomingShiftSectionProps = {
  data: ActiveSummaryData | null;
  loading: boolean;
  error: boolean;
  onReload: () => void;
  upcomingExams: ExamTask[];
  absenceApproval: { show: boolean; count: number };
  timestampApproval: { show: boolean; count: number };
};

// A grouped module card: a header (title + icon) over tappable sub-rows. Used by
// any module with more than one sub-item (repair roles, absence own/approve).
function ShiftGroupCard({ title, icon, subs }: { title: string; icon: IconName; subs: ShiftSub[] }) {
  const m = useMinimal();
  const s = useMStyles(makeShiftStyles);
  return (
    <View style={s.repairCard}>
      <View style={s.repairHeader}>
        <Text style={s.repairTitle}>{title}</Text>
        <IconSymbol name={icon} size={20} color={m.accent} />
      </View>
      {subs.map((sub) => (
        <Pressable
          key={sub.key}
          accessibilityRole="button"
          onPress={sub.onPress}
          style={({ pressed }) => [s.repairSub, pressed && s.tilePressed]}>
          <Text numberOfLines={1} style={s.repairSubLabel}>{sub.label}</Text>
          <View style={s.repairSubRight}>
            <Text style={s.repairSubCount}>{sub.count}</Text>
            <IconSymbol name="chevron.right" size={16} color={m.textFaint} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function UpcomingShiftSection({ data, loading, error, onReload, upcomingExams, absenceApproval, timestampApproval }: UpcomingShiftSectionProps) {
  const m = useMinimal();
  const s = useMStyles(makeShiftStyles);
  const tiles: ShiftTile[] = [];
  const repairSubs: ShiftSub[] = [];
  const absenceSubs: ShiftSub[] = [];

  if (data) {
    // ── Repair computer: grouped card with role-specific sub-items ──────────
    if (data.repairComputer.success) {
      const repairTasks = data.repairComputer.tasks ?? [];
      const countOf = (key: string) =>
        repairTasks.find((task) => task.key === key)?.count ?? 0;
      const addSub = (key: string, label: string, count: number, path: string) => {
        if (count > 0) {
          repairSubs.push({
            key,
            label,
            count,
            onPress: () => navPush(path as Parameters<typeof navPush>[0]),
          });
        }
      };

      // Informer: only the current job.
      addSub('repair-informer', TEXT.HOME_SHIFT_CURRENT_JOB, countOf('user-current-job'),
        '/repair-computer/current-job');
      // Foreman: new job + current jobs (running / supply approvals).
      addSub('repair-foreman-new', TEXT.HOME_SHIFT_NEW_JOB, countOf('foreman-new-job'),
        '/repair-computer/foreman-new-job');
      addSub('repair-foreman-current', TEXT.HOME_SHIFT_CURRENT_JOB,
        countOf('foreman-running') + countOf('foreman-supply-approve'),
        '/repair-computer/manage-job');
      // Worker: new job + current jobs (in progress / awaiting supply).
      addSub('repair-worker-new', TEXT.HOME_SHIFT_NEW_JOB, countOf('worker-new-job'),
        '/repair-computer/worker-new-job');
      addSub('repair-worker-current', TEXT.HOME_SHIFT_CURRENT_JOB,
        countOf('worker-current-job') + countOf('worker-supply-wait'),
        '/repair-computer/worker-current-job');
    }

    // ── Absence: own requests (all roles) + approvals (boss only). Multiple
    //    entries collapse into one grouped card (like repair computer). ────────
    if (data.absence.success) {
      const ownCount =
        (data.absence.pending?.length ?? 0) + (data.absence.cancelled?.length ?? 0);
      if (ownCount > 0) {
        absenceSubs.push({
          key: 'absence-mine',
          label: TEXT.HOME_SHIFT_MY_LEAVE,
          count: ownCount,
          onPress: () => navPush('/absence/my-leave' as Parameters<typeof navPush>[0]),
        });
      }
    }
    if (absenceApproval.show && absenceApproval.count > 0) {
      absenceSubs.push({
        key: 'absence-approve',
        label: TEXT.HOME_SHIFT_APPROVE_LEAVE,
        count: absenceApproval.count,
        onPress: () => navPush('/absence/approve-leave' as Parameters<typeof navPush>[0]),
      });
    }
    // A single absence entry stays a tile; multiple collapse into a card below.
    if (absenceSubs.length === 1) {
      const only = absenceSubs[0];
      tiles.push({
        key: only.key,
        label: only.label,
        count: only.count,
        icon: 'calendar-clock',
        onPress: only.onPress,
      });
    }

    // ── Meeting ─────────────────────────────────────────────────────────────
    if (data.meeting.success && data.meeting.items.length > 0) {
      tiles.push({
        key: 'meeting',
        label: TEXT.HOME_SHIFT_MEETINGS_TODAY,
        count: data.meeting.items.length,
        icon: 'person.2.fill',
        onPress: () => navPush('/meeting' as Parameters<typeof navPush>[0]),
      });
    }

    // ── Timestamp: own forgot-timestamp requests (all roles) ────────────────
    if (data.timestamp.success && data.timestamp.items.length > 0) {
      tiles.push({
        key: 'timestamp-mine',
        label: TEXT.HOME_SHIFT_TIMESTAMP,
        count: data.timestamp.items.length,
        icon: 'clock.fill',
        onPress: () => navPush('/timestamp/forgot-timestamp' as Parameters<typeof navPush>[0]),
      });
    }
  }

  // ── Timestamp approvals: boss/approver only ───────────────────────────────
  if (timestampApproval.show && timestampApproval.count > 0) {
    tiles.push({
      key: 'timestamp-approve',
      label: TEXT.HOME_SHIFT_APPROVE_TIMESTAMP,
      count: timestampApproval.count,
      icon: 'checkmark.circle.fill',
      onPress: () => navPush('/timestamp/approve' as Parameters<typeof navPush>[0]),
    });
  }

  // ── Examinar: upcoming exams ───────────────────────────────────────────────
  if (upcomingExams.length > 0) {
    tiles.push({
      key: 'exam',
      label: TEXT.EXAMINAR_HEADER_TITLE,
      count: upcomingExams.length,
      icon: 'checkmark.circle.fill',
      onPress: () => navPush('/examinar' as Parameters<typeof navPush>[0]),
    });
  }

  return (
    <View style={s.coverCard}>
      <Text style={s.coverTitle}>{TEXT.HOME_UPCOMING_SHIFT_TITLE}</Text>

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
      ) : repairSubs.length === 0 && absenceSubs.length <= 1 && tiles.length === 0 ? (
        <View style={s.stateWrap}>
          <IconSymbol name="checkmark.circle.fill" size={22} color={m.textFaint} />
          <Text style={s.emptyText}>{TEXT.HOME_ALL_CAUGHT_UP}</Text>
        </View>
      ) : (
        <>
          {repairSubs.length > 0 && (
            <ShiftGroupCard title={TEXT.REPAIR_COMPUTER_MENU_TITLE} icon="laptop" subs={repairSubs} />
          )}

          {absenceSubs.length > 1 && (
            <ShiftGroupCard title={TEXT.ABSENCE_TITLE} icon="calendar-clock" subs={absenceSubs} />
          )}

          {tiles.length > 0 && (
            <View style={s.tileGrid}>
              {tiles.map((tile, index) => {
                const isFullRow =
                  index === tiles.length - 1 && tiles.length % 2 === 1;
                return (
              <Pressable
                key={tile.key}
                accessibilityRole="button"
                onPress={tile.onPress}
                style={({ pressed }) => [
                  s.tile,
                  isFullRow && s.tileFull,
                  pressed && s.tilePressed,
                ]}>
                {isFullRow ? (
                  <>
                    <Text numberOfLines={1} style={s.tileFullTitle}>{tile.label}</Text>
                    <View style={s.tileFullRight}>
                      <Text style={s.tileCountSm}>{tile.count}</Text>
                      <IconSymbol name={tile.icon} size={40} color={m.textFaint} />
                    </View>
                  </>
                ) : (
                  <>
                    <View style={s.tileHead}>
                      <Text numberOfLines={2} style={s.tileLabel}>{tile.label}</Text>
                      <IconSymbol name={tile.icon} size={18} color={m.textFaint} />
                    </View>
                    <Text style={s.tileCount}>{tile.count}</Text>
                  </>
                )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const makeShiftStyles = (m: M) => StyleSheet.create({
  // Full-width band behind the whole section (like the news band): breaks out of
  // the page padding and fills a shade darker than the canvas, so the title +
  // cards sit on one grouped zone rather than floating on the background.
  // A negative top margin fully cancels the inter-section gap so this band's top
  // edge butts directly against the news band; the larger vertical padding gives
  // it its own internal breathing room instead.
  coverCard: {
    gap: 14,
    marginHorizontal: -D.pad,
    marginTop: -40,
    backgroundColor: m.fill,
    paddingHorizontal: D.pad,
    paddingTop: 32,
    paddingBottom: 38,
  },
  coverTitle: {
    fontFamily: F.semibold,
    fontSize: 16,
    lineHeight: 21,
    color: m.onCanvas,
  },
  // Repair-computer grouped card: a module header over role-specific sub-rows.
  repairCard: {
    backgroundColor: m.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: m.border,
    shadowColor: m.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
  repairHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 14,
    paddingBottom: 12,
  },
  repairTitle: {
    flex: 1,
    fontFamily: F.medium,
    fontSize: 15,
    lineHeight: 20,
    color: m.text,
  },
  repairSub: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: m.border,
  },
  repairSubLabel: {
    flex: 1,
    fontFamily: F.regular,
    fontSize: 14,
    lineHeight: 19,
    color: m.text,
  },
  repairSubRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  repairSubCount: {
    fontFamily: F.medium,
    fontSize: 16,
    lineHeight: 20,
    color: m.accent,
  },
  // Two-up grid of stat tiles inside the cover card.
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '46%',
    minHeight: 116,
    justifyContent: 'space-between',
    backgroundColor: m.card,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: m.border,
    shadowColor: m.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
  tilePressed: {
    opacity: 0.7,
  },
  // Full-width row (the lone last tile of an odd grid): detail on the left,
  // a larger icon anchoring the right, with a smaller count.
  tileFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 88,
    paddingTop: 22,
    paddingBottom: 22,
    gap: 16,
  },
  tileFullTitle: {
    flex: 1,
    fontFamily: F.medium,
    fontSize: 16,
    lineHeight: 21,
    color: m.text,
  },
  tileFullRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tileCountSm: {
    fontFamily: F.semibold,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: m.accent,
  },
  tileHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  tileLabel: {
    flex: 1,
    fontFamily: F.regular,
    fontSize: 13,
    lineHeight: 18,
    color: m.textMuted,
  },
  // KPI-style metric: a solid, bold count in corporate navy — the number reads
  // like a dashboard figure, with the module as its muted caption above.
  tileCount: {
    fontFamily: F.semibold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.4,
    color: m.accent,
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
  const insets = useSafeAreaInsets();

  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [authCallbackErrorMessage, setAuthCallbackErrorMessage] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newsItems, setNewsItems] = useState<News[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(true);
  const [isNewsError, setIsNewsError] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [activeSummary, setActiveSummary] = useState<ActiveSummaryData | null>(null);
  const [isActiveSummaryLoading, setIsActiveSummaryLoading] = useState(false);
  const [isActiveSummaryError, setIsActiveSummaryError] = useState(false);
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
  const { completeWebSignIn, loading: isAuthLoading, signIn, signOut, user: authUser } = useAuth();
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

      void getUnreadNotificationCount().then((count) => {
        if (isActive) setUnreadCount(count);
      });

      setIsNewsLoading(true);
      void staffNewsFeed().then((items) => {
        if (!isActive) return;
        setNewsItems(items);
        setIsNewsError(false);
        setIsNewsLoading(false);
      }).catch(() => {
        if (!isActive) return;
        setNewsItems([]);
        setIsNewsError(true);
        setIsNewsLoading(false);
      });

      return () => { isActive = false; };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const staffId = String(authUser?.staffId ?? '').trim();
      const userId = String(authUser?.userId ?? authUser?.staffId ?? '').trim();
      if (!staffId) return;

      setIsActiveSummaryLoading(true);
      setIsActiveSummaryError(false);
      void getActiveSummary(staffId, userId).then((data) => {
        if (!isActive) return;
        setActiveSummary(data);
        setIsActiveSummaryError(false);
        setIsActiveSummaryLoading(false);
      }).catch(() => {
        if (!isActive) return;
        setActiveSummary(null);
        setIsActiveSummaryError(true);
        setIsActiveSummaryLoading(false);
      });

      const examParams = getCurrentExamParams();
      void listExamTasks({ staff_id: staffId, ...examParams }).then((tasks) => {
        if (isActive) setUpcomingExams(tasks.filter(isExamUpcoming));
      }).catch(() => {
        if (isActive) setUpcomingExams([]);
      });

      void approvingWaitingData(staffId).then((result) => {
        if (isActive) setAbsenceApproval({ show: result.show, count: result.data.length });
      }).catch(() => {
        if (isActive) setAbsenceApproval({ show: false, count: 0 });
      });

      void getForgetApprovalWaiting(staffId).then((result) => {
        if (isActive) setTimestampApproval({ show: result.show, count: result.data.length });
      }).catch(() => {
        if (isActive) setTimestampApproval({ show: false, count: 0 });
      });

      return () => { isActive = false; };
    }, [authUser]),
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
      getUnreadNotificationCount().then(setUnreadCount).catch(() => {}),
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

  // ─── Auth loading ───────────────────────────────────────────────────────────

  if (isAuthLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <LoadingAnimate title={TEXT.AUTH_SIGNING_IN_TITLE} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
      </View>
    );
  }

  // ─── Unauthenticated ────────────────────────────────────────────────────────

  if (!authUser) {
    return (
      <View style={styles.container}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.welcomeContent}>
          <View style={styles.welcomeTextGroup}>
            <Text style={styles.welcomeTitle}>{TEXT.HOME_TITLE}</Text>
            <Text style={styles.welcomeDesc}>{TEXT.HOME_WELCOME_DESCRIPTION}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={handleLogin}
            style={({ pressed }) => [styles.welcomeLoginButton, pressed && styles.pressed]}>
            <Text style={styles.welcomeLoginText}>{TEXT.AUTH_LOGIN}</Text>
          </Pressable>
        </View>

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

  // ─── Authenticated ──────────────────────────────────────────────────────────

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
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={m.onCanvasMuted} />}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + 28 }]}>
          <View style={styles.headerRow}>
            <View style={styles.greetRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View profile"
                onPress={() => navPush('/my-profile' as Parameters<typeof navPush>[0])}
                style={({ pressed }) => [styles.avatarBtn, pressed && styles.pressed]}>
                {avatarSource && !avatarFailed ? (
                  <Image
                    source={{ uri: avatarSource }}
                    style={styles.avatar}
                    contentFit="cover"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarText}>{getInitials(authUser)}</Text>
                  </View>
                )}
              </Pressable>
              <View style={styles.greetingWrap}>
                <Text numberOfLines={1} style={styles.greeting}>{getFirstName(authUser)}</Text>
                <Text numberOfLines={1} style={styles.date}>{getDateString()}</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Settings"
                onPress={() => navPush('/settings')}
                style={({ pressed }) => [styles.iconBtn, styles.iconBtnLight, pressed && styles.pressed]}>
                <IconSymbol name="gearshape.fill" size={20} color={m.icon} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                onPress={() => navPush('/notification')}
                style={({ pressed }) => [styles.iconBtn, styles.iconBtnLight, pressed && styles.pressed]}>
                <IconSymbol name="bell.fill" size={20} color={m.icon} />
                {unreadCount > 0 ? <View style={styles.bellBadge} /> : null}
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Padded content ──────────────────────────────────────────────── */}
        <View style={styles.innerContent}>

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
            {isNewsLoading ? (
              <View style={styles.newsLoadingWrap}>
                <ActivityIndicator color={m.textMuted} />
              </View>
            ) : displayedNews.length === 0 ? (
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
                    <Text numberOfLines={2} style={styles.newsTitle}>{item.title}</Text>
                    {item.pubDate ? (
                      <Text style={styles.newsDate}>{formatNewsDate(item.pubDate)}</Text>
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            )}
            </View>
          </View>

          {/* Upcoming Shift section */}
          <UpcomingShiftSection data={activeSummary} loading={isActiveSummaryLoading} error={isActiveSummaryError} onReload={reloadActiveSummary} upcomingExams={upcomingExams} absenceApproval={absenceApproval} timestampApproval={timestampApproval} />

          {/* Menu section — matches the upcoming band's vertical padding and sits
              flush beneath it. */}
          <View style={styles.menuSection}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{TEXT.HOME_MENU_SECTION_TITLE}</Text>
          </View>

          <View style={styles.menuGrid}>
            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.href}
                accessibilityRole="button"
                style={({ pressed }) => [styles.menuCard, { width: menuCardWidth }, pressed && styles.pressed]}
                onPress={() => navPush(item.href as Parameters<typeof navPush>[0])}>
                <IconSymbol name={item.icon} size={30} color={m.icon} />
                <Text numberOfLines={2} style={styles.menuLabel}>{item.title}</Text>
              </Pressable>
            ))}
          </View>
          </View>

        </View>
      </ScrollView>

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
    </View>
  );
}

const makeStyles = (m: M) => StyleSheet.create({
  container: { flex: 1, backgroundColor: m.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },

  scrollContent: { flexGrow: 1 },

  // Header — clean, on the page canvas (no colored bar)
  header: {
    paddingHorizontal: D.pad,
    paddingBottom: 8,
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
    shadowColor: m.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
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
  greetingWrap: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    fontFamily: F.semibold,
    fontSize: 23,
    lineHeight: 29,
    color: m.onCanvas,
  },
  date: {
    fontFamily: F.regular,
    fontSize: 13,
    lineHeight: 18,
    color: m.onCanvasMuted,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: m.card,
    shadowColor: m.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    backgroundColor: m.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: F.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: m.text,
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
  menuSection: {
    marginTop: -40,
    paddingTop: 32,
    paddingBottom: 38,
    gap: 40,
  },

  // Title + decorative rule as one unit. The negative margin keeps the larger
  // inter-section gap spacing sections apart, not the title from its content.
  sectionHead: {
    marginBottom: -26,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: F.semibold,
    fontSize: 16,
    lineHeight: 21,
    color: m.onCanvas,
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
  newsLoadingWrap: {
    flex: 1,
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsScrollContent: {
    paddingRight: 4,
    gap: 12,
  },
  newsCard: {
    backgroundColor: '#8A2626',
    borderRadius: 22,
    padding: 18,
    height: 112,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'flex-start',
    shadowColor: '#4A0F11',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 3,
  },
  newsTitle: {
    fontFamily: F.medium,
    fontSize: 15,
    lineHeight: 21,
    color: m.accentText,
  },
  newsDate: {
    fontFamily: F.regular,
    fontSize: 13,
    lineHeight: 17,
    color: '#F1C40F',
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
    shadowColor: m.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
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
    shadowColor: m.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
  menuLabel: {
    fontFamily: F.regular,
    fontSize: 13,
    lineHeight: 17,
    color: m.text,
    textAlign: 'center',
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
  welcomeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 40,
  },
  welcomeTextGroup: {
    alignItems: 'center',
    gap: 12,
  },
  welcomeTitle: {
    fontFamily: F.semibold,
    fontSize: 28,
    lineHeight: 34,
    color: m.onCanvas,
    textAlign: 'center',
  },
  welcomeDesc: {
    fontFamily: F.regular,
    fontSize: 15,
    lineHeight: 22,
    color: m.onCanvasMuted,
    textAlign: 'center',
  },
  welcomeLoginButton: {
    minHeight: 54,
    minWidth: 220,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: m.accent,
    paddingHorizontal: 32,
  },
  welcomeLoginText: {
    fontFamily: F.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: m.accentText,
  },
});
