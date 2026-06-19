import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TEXT } from '@/constants/text';

import { LoadingAnimate } from '@/components/loading-animate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import type { AuthUser, News } from '@/models/types';
import { getUnreadNotificationCount } from '@/services/notificationService';
import { staffNewsFeed } from '@/services/newsService';
import { getActiveSummary, type ActiveSummaryData } from '@/services/activeSummaryService';
import { getPersonnelSuggestions } from '@/services/personService';
import { formatNewsDate } from '@/utils/date-format';
import { navPush } from '@/utils/navigation';
import { ENDPOINTS } from '@/constants/endpoints';

const D = {
  primary: '#922124',
  primaryContainer: '#B33939',
  onPrimary: '#ffffff',
  background: '#F8F9FD',
  surface: '#ffffff',
  onSurface: '#191C1F',
  onSurfaceVariant: '#584140',
  outlineVariant: '#EDEEF2',
  menuCard: '#F2F3F7',
  pad: 16,
  gap: 12,
} as const;

type IconName = Parameters<typeof IconSymbol>[0]['name'];

const MENU_ITEMS: ReadonlyArray<{ title: string; href: string; icon: IconName }> = [
  { title: TEXT.absence_TITLE, href: '/absence', icon: 'calendar-clock' },
  { title: TEXT.FORGOT_TIMESTAMP_TITLE, href: '/forgot-timestamp', icon: 'clock.fill' },
  { title: TEXT.MEETING_MENU_TITLE, href: '/meeting', icon: 'person.2.fill' },
  { title: TEXT.REPAIR_COMPUTER_MENU_TITLE, href: '/repair-computer', icon: 'laptop' },
  { title: TEXT.CALENDAR_TITLE, href: '/calendar', icon: 'calendar-range' },
  { title: TEXT.PERSON_SEARCH_TITLE, href: '/person-search', icon: 'user-round-search' },
  { title: TEXT.EXAMINER_MENU_TITLE, href: '/examiner', icon: 'checkmark.circle.fill' },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? TEXT.HOME_GREETING_MORNING : h < 17 ? TEXT.HOME_GREETING_AFTERNOON : TEXT.HOME_GREETING_EVENING;
}

function getDateString() {
  const n = new Date();
  return `${DAY_NAMES[n.getDay()]}, ${n.getDate()} ${MONTH_NAMES[n.getMonth()]} ${n.getFullYear()}`;
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

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// ─── Helpers for extracting display fields from unknown upstream shapes ──────

function getStr(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim() && v.trim() !== '0') return v.trim();
    if (typeof v === 'number' && v !== 0) return String(v);
  }
  return '';
}


// ─── Shift card component ─────────────────────────────────────────────────────

type ShiftCardProps = {
  icon: Parameters<typeof IconSymbol>[0]['name'];
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  badge?: number;
};

function ShiftCard({ icon, iconBg, iconColor, title, subtitle, onPress, badge }: ShiftCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [shiftStyles.card, pressed && shiftStyles.cardPressed]}>
      <View style={[shiftStyles.iconCircle, { backgroundColor: iconBg }]}>
        <IconSymbol name={icon} size={20} color={iconColor} />
      </View>
      <View style={shiftStyles.cardContent}>
        <ThemedText lightColor={D.onSurface} darkColor={D.onSurface} numberOfLines={1} style={shiftStyles.cardTitle}>
          {title}
        </ThemedText>
        {Boolean(subtitle) && (
          <ThemedText lightColor={D.onSurfaceVariant} darkColor={D.onSurfaceVariant} numberOfLines={2} style={shiftStyles.cardSubtitle}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {badge !== undefined && (
        <View style={shiftStyles.badge}>
          <ThemedText lightColor={D.onPrimary} darkColor={D.onPrimary} style={shiftStyles.badgeText}>
            {badge}
          </ThemedText>
        </View>
      )}
      {onPress && (
        <IconSymbol name="chevron.right" size={16} color={D.onSurfaceVariant} />
      )}
    </Pressable>
  );
}

type UpcomingShiftSectionProps = {
  data: ActiveSummaryData | null;
  loading: boolean;
};

function UpcomingShiftSection({ data, loading }: UpcomingShiftSectionProps) {
  const cards: React.ReactElement[] = [];

  if (data) {
    // ── Repair computer: total count badge → navigate to repair-computer ────
    if (data.repairComputer.success && data.repairComputer.items.length > 0) {
      const count = data.repairComputer.items.length;
      cards.push(
        <ShiftCard
          key="repair-summary"
          icon="laptop"
          iconBg="#FFF3F3"
          iconColor={D.primaryContainer}
          title="Repair Jobs"
          subtitle={`${count} active job${count > 1 ? 's' : ''}`}
          onPress={() => navPush('/repair-computer' as Parameters<typeof navPush>[0])}
        />
      );
    }

    // ── Absence: total count badge → navigate to absence history ────────────
    if (data.absence.success && data.absence.pending.length > 0) {
      const count = data.absence.pending.length;
      cards.push(
        <ShiftCard
          key="absence-summary"
          icon="calendar-clock"
          iconBg="#FFFBEB"
          iconColor="#D97706"
          title="Leave Requests"
          subtitle={`${count} pending`}
          onPress={() => navPush('/absence/history' as Parameters<typeof navPush>[0])}
        />
      );
    }

    // ── Meeting: total count → navigate to meeting list ────────────────────
    if (data.meeting.success && data.meeting.items.length > 0) {
      const count = data.meeting.items.length;
      cards.push(
        <ShiftCard
          key="meeting-summary"
          icon="person.2.fill"
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          title="Today's Meetings"
          subtitle={`${count} meeting${count > 1 ? 's' : ''}`}
          onPress={() => navPush('/meeting' as Parameters<typeof navPush>[0])}
        />
      );
    }

    // ── Forgot timestamp: total count badge → navigate to forgot-timestamp list
    if (data.forgotTimestamp.success && data.forgotTimestamp.items.length > 0) {
      const count = data.forgotTimestamp.items.length;
      cards.push(
        <ShiftCard
          key="forgot-summary"
          icon="clock.fill"
          iconBg="#F5F3FF"
          iconColor="#7C3AED"
          title="Forgot Timestamp"
          subtitle=""
          badge={count}
          onPress={() => navPush('/forgot-timestamp' as Parameters<typeof navPush>[0])}
        />
      );
    }
  }

  return (
    <View style={shiftStyles.section}>
      <ThemedText lightColor={D.onSurface} darkColor={D.onSurface} style={styles.sectionTitle}>
        Upcoming Shift
      </ThemedText>

      <View style={shiftStyles.cardsContainer}>
        {loading && (
          <View style={shiftStyles.emptyCard}>
            <ActivityIndicator color={D.primaryContainer} />
          </View>
        )}
        {!loading && cards.length === 0 && (
          <View style={shiftStyles.emptyCard}>
            <IconSymbol name="checkmark.circle.fill" size={24} color="#22C55E" />
            <ThemedText lightColor={D.onSurfaceVariant} darkColor={D.onSurfaceVariant} style={shiftStyles.emptyText}>
              No active activities
            </ThemedText>
          </View>
        )}
        {!loading && cards}
      </View>
    </View>
  );
}

const shiftStyles = StyleSheet.create({
  section: {
    gap: 12,
  },
  cardsContainer: {
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.surface,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: D.outlineVariant,
    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
    elevation: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  cardPressed: {
    opacity: 0.7,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: D.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: D.surface,
    borderRadius: 12,
    padding: 20,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: D.outlineVariant,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default function HomeScreen() {
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
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [personPhotoUri, setPersonPhotoUri] = useState<string | null>(null);
  const [activeSummary, setActiveSummary] = useState<ActiveSummaryData | null>(null);
  const [isActiveSummaryLoading, setIsActiveSummaryLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const processedCallbackRef = useRef('');
  const { completeWebSignIn, loading: isAuthLoading, signIn, signOut, user: authUser } = useAuth();
  const completeWebSignInRef = useRef(completeWebSignIn);

  useEffect(() => {
    completeWebSignInRef.current = completeWebSignIn;
  }, [completeWebSignIn]);

  useEffect(() => {
    setAvatarFailed(false);
    setPersonPhotoUri(null);
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
        setIsNewsLoading(false);
      }).catch(() => {
        if (!isActive) return;
        setNewsItems([]);
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
      void getActiveSummary(staffId, userId).then((data) => {
        if (!isActive) return;
        setActiveSummary(data);
        setIsActiveSummaryLoading(false);
      }).catch(() => {
        if (!isActive) return;
        setActiveSummary(null);
        setIsActiveSummaryLoading(false);
      });

      void getPersonnelSuggestions(staffId).then((persons) => {
        if (!isActive) return;
        const photo = (persons[0] as Record<string, unknown> | undefined)?.photo;
        if (typeof photo === 'string' && photo.trim()) {
          setPersonPhotoUri(`data:image/jpeg;base64,${photo.trim()}`);
        }
      }).catch(() => {});

      return () => { isActive = false; };
    }, [authUser]),
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const staffId = String(authUser?.staffId ?? '').trim();
    const userId = String(authUser?.userId ?? authUser?.staffId ?? '').trim();

    await Promise.allSettled([
      staffNewsFeed().then(setNewsItems).catch(() => setNewsItems([])),
      getUnreadNotificationCount().then(setUnreadCount).catch(() => {}),
      staffId
        ? getActiveSummary(staffId, userId).then(setActiveSummary).catch(() => setActiveSummary(null))
        : Promise.resolve(),
      staffId
        ? getPersonnelSuggestions(staffId).then((persons) => {
            const photo = (persons[0] as Record<string, unknown> | undefined)?.photo;
            if (typeof photo === 'string' && photo.trim()) {
              setPersonPhotoUri(`data:image/jpeg;base64,${photo.trim()}`);
            }
          }).catch(() => {})
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
      <ThemedView style={styles.container}>
        <LoadingAnimate title={TEXT.AUTH_SIGNING_IN_TITLE} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
      </ThemedView>
    );
  }

  // ─── Unauthenticated ────────────────────────────────────────────────────────

  if (!authUser) {
    return (
      <ThemedView style={styles.container} lightColor="#ffffff">
        <View style={styles.welcomeContent}>
          <View style={styles.welcomeTextGroup}>
            <ThemedText type="title" style={styles.welcomeTitle}>{TEXT.HOME_TITLE}</ThemedText>
            <ThemedText style={styles.welcomeDesc}>{TEXT.HOME_WELCOME_DESCRIPTION}</ThemedText>
          </View>
          <Pressable accessibilityRole="button" onPress={handleLogin} style={styles.welcomeLoginButton}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold" style={styles.welcomeLoginText}>
              {TEXT.AUTH_LOGIN}
            </ThemedText>
          </Pressable>
        </View>

        <Modal
          transparent
          visible={Boolean(authCallbackErrorMessage)}
          animationType="fade"
          onRequestClose={() => setAuthCallbackErrorMessage('')}>
          <Pressable style={styles.backdrop} onPress={() => setAuthCallbackErrorMessage('')}>
            <Pressable accessibilityRole="none" onPress={(e) => e.stopPropagation()}>
              <ThemedView style={styles.modal} lightColor="#FFFFFF" darkColor="#151718">
                <ThemedText type="subtitle">{TEXT.AUTH_LOGIN_FAILED}</ThemedText>
                <ThemedText style={styles.modalMessage}>{authCallbackErrorMessage}</ThemedText>
                <View style={styles.modalActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setAuthCallbackErrorMessage('')}
                    style={styles.btnPrimary}>
                    <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">{TEXT.SHARED_OK}</ThemedText>
                  </Pressable>
                </View>
              </ThemedView>
            </Pressable>
          </Pressable>
        </Modal>
      </ThemedView>
    );
  }

  // ─── Authenticated ──────────────────────────────────────────────────────────

  const displayedNews = newsItems;
  const menuCardWidth = Math.floor((screenWidth - D.pad * 2 - D.gap * 2) / 3);
  const newsCardWidth = Math.floor(screenWidth * 0.72);
  const authPhotoUrl = authUser?.staffId
    ? `${ENDPOINTS.photoBase}${encodeURIComponent(String(authUser.staffId))}.jpg`
    : null;
  const avatarSource = personPhotoUri || authPhotoUrl;

  return (
    <View style={[styles.container, { backgroundColor: D.background }]}>
      <StatusBar style="light" />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View profile"
          onPress={() => navPush('/my-profile' as Parameters<typeof navPush>[0])}
          style={styles.avatarBtn}>
          <View style={styles.avatarInner}>
            {avatarSource && !avatarFailed ? (
              <Image
                source={{ uri: avatarSource }}
                style={styles.avatar}
                contentFit="cover"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <ThemedText lightColor={D.onPrimary} darkColor={D.onPrimary} style={styles.avatarText}>
                  {getInitials(authUser)}
                </ThemedText>
              </View>
            )}
          </View>
        </Pressable>

        <ThemedText lightColor={D.onPrimary} darkColor={D.onPrimary} style={styles.headerTitle}>
          {TEXT.HOME_APP_NAME}
        </ThemedText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => navPush('/notification')}
          style={styles.bellBtn}>
          <IconSymbol name="bell.fill" size={22} color={D.onPrimary} />
          {unreadCount > 0 ? <View style={styles.bellBadge} /> : null}
        </Pressable>
      </View>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={D.onPrimary} />}>

        {/* Greeting — full-bleed red, visually extends the header */}
        <View style={styles.greetingCard}>
          <ThemedText lightColor={D.onPrimary} darkColor={D.onPrimary} style={styles.greetingTitle}>
            {getGreeting()}, {getFirstName(authUser)}
          </ThemedText>
          <ThemedText lightColor="rgba(255,255,255,0.6)" darkColor="rgba(255,255,255,0.6)" style={styles.greetingDate}>
            {getDateString()}
          </ThemedText>
        </View>

        {/* Padded sections below the greeting */}
        <View style={styles.innerContent}>

          {/* News section */}
          <View style={styles.sectionRow}>
            <ThemedText lightColor={D.onSurface} darkColor={D.onSurface} style={styles.sectionTitle}>
              {TEXT.HOME_NEWS_SECTION_TITLE}
            </ThemedText>
            <Pressable accessibilityRole="button" onPress={() => navPush('/news')}>
              <ThemedText lightColor={D.primary} darkColor={D.primary} style={styles.seeAll}>
                {TEXT.HOME_SEE_ALL_THAI}
              </ThemedText>
            </Pressable>
          </View>

          {/* News cards — horizontal scroll, break out of inner padding */}
          <View style={styles.newsScrollOuter}>
            {isNewsLoading ? (
              <View style={styles.newsLoadingWrap}>
                <ActivityIndicator color={D.primaryContainer} />
              </View>
            ) : displayedNews.length === 0 ? (
              <View style={[styles.newsCard, { width: newsCardWidth, alignItems: 'center', justifyContent: 'center' }]}>
                <ThemedText lightColor={D.onSurfaceVariant} darkColor={D.onSurfaceVariant} style={styles.newsEmpty}>
                  {TEXT.HOME_NO_NEWS_MESSAGE}
                </ThemedText>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.newsScrollContent}>
                {displayedNews.map((item, i) => (
                  <Pressable
                    key={getNewsKey(item, i)}
                    accessibilityRole="button"
                    style={[styles.newsCard, { width: newsCardWidth }]}
                    onPress={() => openNews(item)}>
                    <ThemedText lightColor={D.primary} darkColor={D.primary} numberOfLines={2} style={styles.newsTitle}>
                      {item.title}
                    </ThemedText>
                    {item.pubDate ? (
                      <ThemedText lightColor={D.onSurfaceVariant} darkColor={D.onSurfaceVariant} style={styles.newsDate}>
                        {formatNewsDate(item.pubDate)}
                      </ThemedText>
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Upcoming Shift section */}
          <UpcomingShiftSection data={activeSummary} loading={isActiveSummaryLoading} />

          {/* Menu section */}
          <ThemedText lightColor={D.onSurface} darkColor={D.onSurface} style={styles.sectionTitle}>
            {TEXT.HOME_MENU_SECTION_TITLE}
          </ThemedText>

          <View style={styles.menuGrid}>
            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.href}
                accessibilityRole="button"
                style={[styles.menuCard, { width: menuCardWidth }]}
                onPress={() => navPush(item.href as Parameters<typeof navPush>[0])}>
                <IconSymbol name={item.icon} size={28} color={D.primary} />
                <ThemedText lightColor={D.onSurface} darkColor={D.onSurface} numberOfLines={2} style={styles.menuLabel}>
                  {item.title}
                </ThemedText>
              </Pressable>
            ))}
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
            <ThemedView style={styles.modal} lightColor="#FFFFFF" darkColor="#151718">
              <ThemedText type="subtitle">{TEXT.HOME_CONFIRM_LOGOUT_TITLE}</ThemedText>
              <ThemedText style={styles.modalMessage}>{TEXT.HOME_CONFIRM_LOGOUT_MESSAGE}</ThemedText>
              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsLogoutConfirmOpen(false)}
                  style={styles.btnSecondary}>
                  <ThemedText type="defaultSemiBold" style={styles.btnSecondaryText}>{TEXT.CANCEL}</ThemedText>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={handleConfirmLogout} style={styles.btnDanger}>
                  <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">{TEXT.HOME_LOGOUT}</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={isSigningOut} animationType="fade">
        <View style={styles.backdrop}>
          <ThemedView style={styles.signingOutModal} lightColor="#FFFFFF" darkColor="#151718">
            <LoadingAnimate fill={false} title={TEXT.HOME_SIGNING_OUT_TITLE} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
          </ThemedView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header — red background with white content
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: D.pad,
    paddingBottom: 12,
    backgroundColor: D.primaryContainer,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFDAD7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatar: {
    width: 40,
    height: 40,
  },
  avatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  bellBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#BA1A1A',
    borderWidth: 1.5,
    borderColor: D.primaryContainer,
  },

  // Scroll — no outer padding so greeting is full-bleed
  scrollContent: {
    flexGrow: 1,
  },

  // Greeting — same red as header, no border-radius, full-width
  greetingCard: {
    backgroundColor: D.primaryContainer,
    paddingHorizontal: D.pad,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 4,
  },
  greetingTitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 19,
  },
  greetingDate: {
    fontSize: 12,
    lineHeight: 17,
  },

  // Inner padded content below greeting
  innerContent: {
    paddingHorizontal: D.pad,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 18,
  },

  // Section header row
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },

  // News — break out of innerContent horizontal padding
  newsScrollOuter: {
    marginHorizontal: -D.pad,
    minHeight: 100,
  },
  newsLoadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsScrollContent: {
    paddingHorizontal: D.pad,
    gap: 12,
  },
  newsCard: {
    backgroundColor: D.surface,
    borderRadius: 12,
    padding: 16,
    height: 100,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: D.outlineVariant,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    elevation: 1,
    justifyContent: 'flex-start',
  },
  newsDate: {
    fontSize: 12,
    lineHeight: 17,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  newsDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  newsEmpty: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Menu grid — grey cards, no shadow
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: D.gap,
  },
  menuCard: {
    backgroundColor: D.menuCard,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
    minHeight: 90,
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    textAlign: 'center',
  },

  // Modals
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 24, 28, 0.36)',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 12,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: D.outlineVariant,
    boxShadow: '0 8px 20px rgba(17, 24, 28, 0.08)',
  },
  modalMessage: {
    color: D.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  btnPrimary: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: D.primaryContainer,
    paddingHorizontal: 16,
  },
  btnSecondary: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: D.outlineVariant,
    paddingHorizontal: 14,
  },
  btnSecondaryText: { color: '#52656D' },
  btnDanger: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#B42318',
    paddingHorizontal: 16,
  },
  signingOutModal: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 12,
    paddingHorizontal: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: D.outlineVariant,
  },

  // Welcome (unauthenticated)
  welcomeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 36,
  },
  welcomeTextGroup: {
    alignItems: 'center',
    gap: 10,
  },
  welcomeTitle: {
    textAlign: 'center',
  },
  welcomeDesc: {
    color: D.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  welcomeLoginButton: {
    minHeight: 52,
    minWidth: 220,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: D.primaryContainer,
    paddingHorizontal: 32,
  },
  welcomeLoginText: {
    fontSize: 16,
    lineHeight: 22,
  },
});
