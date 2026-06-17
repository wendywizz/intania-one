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
      <ThemedView style={styles.container}>
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

  const displayedNews = newsItems.slice(0, 5);
  const menuCardWidth = Math.floor((screenWidth - D.pad * 2 - D.gap * 2) / 3);
  const newsCardWidth = Math.floor(screenWidth * 0.72);
  const authPhotoUrl = authUser?.staffId
    ? `${ENDPOINTS.photoBase}${encodeURIComponent(String(authUser.staffId))}.jpg`
    : null;

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
            {authPhotoUrl && !avatarFailed ? (
              <Image
                source={{ uri: authPhotoUrl }}
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
        showsVerticalScrollIndicator={false}>

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
              <View style={[styles.newsCard, { width: newsCardWidth, alignItems: 'center', justifyContent: 'center' }]}>
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
                    {item.pubDate ? (
                      <ThemedText lightColor={D.onSurfaceVariant} darkColor={D.onSurfaceVariant} style={styles.newsDate}>
                        {formatNewsDate(item.pubDate)}
                      </ThemedText>
                    ) : null}
                    <ThemedText lightColor={D.onSurface} darkColor={D.onSurface} numberOfLines={2} style={styles.newsTitle}>
                      {item.title}
                    </ThemedText>
                    {item.description ? (
                      <ThemedText lightColor={D.onSurfaceVariant} darkColor={D.onSurfaceVariant} numberOfLines={2} style={styles.newsDesc}>
                        {stripHtml(item.description)}
                      </ThemedText>
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>

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
    paddingTop: 4,
    paddingBottom: 20,
    gap: 4,
  },
  greetingTitle: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  greetingDate: {
    fontSize: 16,
    lineHeight: 24,
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
  },
  newsScrollContent: {
    paddingHorizontal: D.pad,
    gap: 12,
  },
  newsCard: {
    backgroundColor: D.surface,
    borderRadius: 12,
    padding: 16,
    height: 138,
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
