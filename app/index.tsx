import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
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
import { formatNewsDate } from '@/utils/date-format';
import { navPush } from '@/utils/navigation';
import { ENDPOINTS } from '@/constants/endpoints';

// Design tokens (DESIGN.md)
const D = {
  primary: '#922124',
  primaryContainer: '#b33939',
  onPrimary: '#ffffff',
  background: '#f8f9fd',
  surface: '#ffffff',
  onSurface: '#191c1f',
  onSurfaceVariant: '#687076',
  outlineVariant: '#dfbfbd',
  pad: 16,
  gap: 12,
} as const;

type IconName = Parameters<typeof IconSymbol>[0]['name'];

const MENU_ITEMS: ReadonlyArray<{
  title: string;
  href: string;
  icon: IconName;
}> = [
  { title: TEXT.absence_TITLE, href: '/absence', icon: 'calendar' },
  { title: TEXT.FORGOT_TIMESTAMP_TITLE, href: '/forgot-timestamp', icon: 'clock.fill' },
  { title: TEXT.MEETING_MENU_TITLE, href: '/meeting', icon: 'person.2.fill' },
  { title: TEXT.REPAIR_COMPUTER_MENU_TITLE, href: '/repair-computer', icon: 'wrench.fill' },
  { title: TEXT.CALENDAR_TITLE, href: '/calendar', icon: 'list.bullet' },
  { title: TEXT.PERSON_SEARCH_TITLE, href: '/person-search', icon: 'magnifyingglass' },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
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

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

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
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [newsIndex, setNewsIndex] = useState(0);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const processedCallbackRef = useRef('');
  const { completeWebSignIn, loading: isAuthLoading, signIn, signOut, user: authUser } = useAuth();
  const completeWebSignInRef = useRef(completeWebSignIn);

  useEffect(() => {
    completeWebSignInRef.current = completeWebSignIn;
  }, [completeWebSignIn]);

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
      setNewsIndex(0);
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

  // ─── Auth loading ────────────────────────────────────────────────────────────

  if (isAuthLoading) {
    return (
      <ThemedView style={styles.container}>
        <LoadingAnimate title={TEXT.AUTH_SIGNING_IN_TITLE} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
      </ThemedView>
    );
  }

  // ─── Unauthenticated (welcome) ───────────────────────────────────────────────

  if (!authUser) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.welcomeContent}>
          <View style={styles.welcomeTextGroup}>
            <ThemedText type="title" style={styles.welcomeTitle}>{TEXT.HOME_TITLE}</ThemedText>
            <ThemedText style={styles.welcomeDesc}>ระบบสำหรับบุคลากรมหาวิทยาลัยสงขลานครินทร์</ThemedText>
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
                    <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">OK</ThemedText>
                  </Pressable>
                </View>
              </ThemedView>
            </Pressable>
          </Pressable>
        </Modal>
      </ThemedView>
    );
  }

  // ─── Authenticated ───────────────────────────────────────────────────────────

  const displayedNews = newsItems.slice(0, 3);
  const menuCardWidth = Math.floor((screenWidth - D.pad * 2 - D.gap * 2) / 3);
  const authPhotoUrl = authUser?.staffId
    ? `${ENDPOINTS.photoBase}${encodeURIComponent(String(authUser.staffId))}.jpg`
    : null;

  return (
    <View style={[styles.container, { backgroundColor: D.background }]}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View profile"
          onPress={() => navPush('/my-profile' as Parameters<typeof navPush>[0])}
          style={styles.avatarBtn}>
          {authPhotoUrl && !avatarFailed ? (
            <Image
              source={{ uri: authPhotoUrl }}
              style={styles.avatar}
              contentFit="cover"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: D.primaryContainer }]}>
              <ThemedText lightColor={D.onPrimary} darkColor={D.onPrimary} style={styles.avatarText}>
                {getInitials(authUser)}
              </ThemedText>
            </View>
          )}
        </Pressable>

        <ThemedText lightColor={D.onSurface} darkColor={D.onSurface} style={styles.headerTitle}>
          Intania
        </ThemedText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => navPush('/notification-history')}
          style={styles.bellBtn}>
          <IconSymbol name="bell.fill" size={22} color={D.onSurface} />
          {unreadCount > 0 ? <View style={styles.bellBadge} /> : null}
        </Pressable>
      </View>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}>

        {/* Greeting card */}
        <View style={styles.greetingCard}>
          <ThemedText lightColor={D.onPrimary} darkColor={D.onPrimary} style={styles.greetingTitle}>
            {getGreeting()}, {getFirstName(authUser)}
          </ThemedText>
          <ThemedText lightColor="rgba(255,255,255,0.72)" darkColor="rgba(255,255,255,0.72)" style={styles.greetingDate}>
            {getDateString()}
          </ThemedText>
        </View>

        {/* News section header */}
        <View style={styles.sectionRow}>
          <ThemedText lightColor={D.onSurface} darkColor={D.onSurface} style={styles.sectionTitle}>
            {TEXT.HOME_NEWS_SECTION_TITLE}
          </ThemedText>
          <Pressable accessibilityRole="button" onPress={() => navPush('/news')}>
            <ThemedText lightColor={D.primary} darkColor={D.primary} style={styles.seeAll}>
              ดูทั้งหมด
            </ThemedText>
          </Pressable>
        </View>

        {/* News carousel */}
        <View style={{ marginHorizontal: -D.pad }}>
          {isNewsLoading ? (
            <View style={[styles.newsPage, { width: screenWidth }]}>
              <View style={styles.newsCard}>
                <ActivityIndicator color={D.primaryContainer} />
              </View>
            </View>
          ) : displayedNews.length === 0 ? (
            <View style={[styles.newsPage, { width: screenWidth }]}>
              <View style={styles.newsCard}>
                <ThemedText lightColor={D.onSurfaceVariant} darkColor={D.onSurfaceVariant} style={styles.newsEmpty}>
                  {TEXT.HOME_NO_NEWS_MESSAGE}
                </ThemedText>
              </View>
            </View>
          ) : (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
                setNewsIndex(Math.max(0, Math.min(idx, displayedNews.length - 1)));
              }}>
              {displayedNews.map((item, i) => (
                <Pressable
                  key={getNewsKey(item, i)}
                  accessibilityRole="button"
                  style={[styles.newsPage, { width: screenWidth }]}
                  onPress={() => openNews(item)}>
                  <View style={styles.newsCard}>
                    <ThemedText lightColor={D.primary} darkColor={D.primary} numberOfLines={2} style={styles.newsTitle}>
                      {item.title}
                    </ThemedText>
                    {item.pubDate ? (
                      <ThemedText lightColor={D.onSurfaceVariant} darkColor={D.onSurfaceVariant} style={styles.newsDate}>
                        {formatNewsDate(item.pubDate)}
                      </ThemedText>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {displayedNews.length > 1 ? (
          <View style={styles.dotsRow}>
            {displayedNews.map((_, i) => (
              <View key={i} style={[styles.dot, i === newsIndex ? styles.dotActive : null]} />
            ))}
          </View>
        ) : null}

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
              <View style={styles.menuIconWrap}>
                <IconSymbol name={item.icon} size={28} color={D.primary} />
              </View>
              <ThemedText lightColor={D.onSurface} darkColor={D.onSurface} numberOfLines={2} style={styles.menuLabel}>
                {item.title}
              </ThemedText>
            </Pressable>
          ))}
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
              <ThemedText type="subtitle">Confirm logout</ThemedText>
              <ThemedText style={styles.modalMessage}>Do you want to sign out from this account?</ThemedText>
              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsLogoutConfirmOpen(false)}
                  style={styles.btnSecondary}>
                  <ThemedText type="defaultSemiBold" style={styles.btnSecondaryText}>Cancel</ThemedText>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={handleConfirmLogout} style={styles.btnDanger}>
                  <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">Logout</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={isSigningOut} animationType="fade">
        <View style={styles.backdrop}>
          <ThemedView style={styles.signingOutModal} lightColor="#FFFFFF" darkColor="#151718">
            <LoadingAnimate fill={false} title="Signing out" desc="Please wait a moment" />
          </ThemedView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: D.pad,
    paddingBottom: 12,
    backgroundColor: D.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: D.outlineVariant,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
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
    backgroundColor: '#D92D20',
    borderWidth: 1.5,
    borderColor: D.surface,
  },

  // Scroll content
  scrollContent: {
    padding: D.pad,
    gap: 18,
  },

  // Greeting card
  greetingCard: {
    backgroundColor: D.primaryContainer,
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  greetingDate: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Section labels
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

  // News carousel
  newsPage: {
    paddingHorizontal: D.pad,
  },
  newsCard: {
    backgroundColor: D.surface,
    borderRadius: 12,
    padding: 14,
    gap: 6,
    minHeight: 110,
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  newsTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  newsDate: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  newsEmpty: {
    fontSize: 14,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: -6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: D.outlineVariant,
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: D.primary,
  },

  // Menu grid
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: D.gap,
  },
  menuCard: {
    backgroundColor: D.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 8,
    minHeight: 90,
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    elevation: 1,
  },
  menuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
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

  // Welcome screen
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
