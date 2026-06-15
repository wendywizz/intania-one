import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { TEXT } from '@/constants/text';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import type { AuthUser, News } from '@/models/types';
import { getUnreadNotificationCount } from '@/services/notificationService';
import { staffNewsFeed } from '@/services/newsService';
import { formatDateTime } from '@/utils/date-format';
import { acquireNavLock, navPush } from '@/utils/navigation';

const CONTENT_PADDING = 32;

const screens = [
  { title: TEXT.ABSENT_TITLE, href: '/absent' },
  { title: TEXT.FORGOT_TIMESTAMP_TITLE, href: '/forgot-timestamp' },
  { title: TEXT.MEETING_MENU_TITLE, href: '/meeting' },
  { title: TEXT.REPAIR_COMPUTER_MENU_TITLE, href: '/repair-computer' },
  { title: TEXT.CALENDAR_TITLE, href: '/calendar' },
  { title: TEXT.PERSON_SEARCH_TITLE, href: '/person-search' },
] as const;

function getNewsKey(item: News, index: number) {
  return `${String(item.guid || item.link || item.title)}-${index}`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAuthDisplayName(user: AuthUser | null) {
  if (!user) {
    return '';
  }

  const displayName = user.staffId || user.name || user.displayName || user.fullName;
  return typeof displayName === 'string' ? displayName : '';
}

export default function HomeScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
    state?: string;
  }>();
  const { width: screenWidth } = useWindowDimensions();
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [authCallbackErrorMessage, setAuthCallbackErrorMessage] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [newsItems, setNewsItems] = useState<News[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [newsCarouselIndex, setNewsCarouselIndex] = useState(0);
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
      if (callbackKey && processedCallbackRef.current === callbackKey) {
        return;
      }

      processedCallbackRef.current = callbackKey;

      try {
        await completeWebSignInRef.current({
          code: params.code,
          error: params.error,
          errorDescription: params.error_description,
          state: params.state,
        });

        if (isMounted) {
          router.replace('/');
        }
      } catch (error) {
        if (isMounted) {
          setAuthCallbackErrorMessage(error instanceof Error ? error.message : String(error));
        }
      }
    }

    if (callbackKey) {
      completeLogin();
    }

    return () => {
      isMounted = false;
    };
  }, [params.code, params.error, params.error_description, params.state]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      void getUnreadNotificationCount().then((count) => {
        if (isActive) {
          setUnreadNotificationCount(count);
        }
      });

      setIsNewsLoading(true);
      setNewsCarouselIndex(0);
      void staffNewsFeed().then((items) => {
        if (!isActive) return;
        setNewsItems(items);
        setIsNewsLoading(false);
      }).catch(() => {
        if (!isActive) return;
        setNewsItems([]);
        setIsNewsLoading(false);
      });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const handleLogin = async () => {
    try {
      await signIn();
    } catch (error) {
      setAuthCallbackErrorMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const handleLogout = async () => {
    setIsLogoutConfirmOpen(true);
  };

  const handleConfirmLogout = async () => {
    setIsLogoutConfirmOpen(false);
    setIsSigningOut(true);

    try {
      await wait(900);
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const openNews = useCallback((item: News) => {
    navPush({
      pathname: '/news-detail',
      params: {
        title: item.title,
        link: item.link,
        guid: item.guid,
        description: item.description,
        category: item.category,
        pubDate: item.pubDate,
      },
    } as Parameters<typeof navPush>[0]);
  }, []);

  const authDisplayName = getAuthDisplayName(authUser);

  if (isAuthLoading) {
    return (
      <ThemedView style={styles.container}>
        <LoadingAnimate title={TEXT.AUTH_SIGNING_IN_TITLE} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
      </ThemedView>
    );
  }

  if (!authUser) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.welcomeContent}>
          <View style={styles.welcomeTextGroup}>
            <ThemedText type="title" style={styles.welcomeTitle}>
              {TEXT.HOME_TITLE}
            </ThemedText>
            <ThemedText style={styles.welcomeDesc}>ระบบสำหรับบุคลากรมหาวิทยาลัยสงขลานครินทร์</ThemedText>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleLogin}
            style={styles.welcomeLoginButton}
          >
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              type="defaultSemiBold"
              style={styles.welcomeLoginText}
            >
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
            <Pressable accessibilityRole="none" onPress={(event) => event.stopPropagation()}>
              <ThemedView style={styles.confirmModal} lightColor="#FFFFFF" darkColor="#151718">
                <ThemedText type="subtitle">{TEXT.AUTH_LOGIN_FAILED}</ThemedText>
                <ThemedText style={styles.confirmMessage}>{authCallbackErrorMessage}</ThemedText>
                <View style={styles.confirmActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setAuthCallbackErrorMessage('')}
                    style={styles.confirmLogoutButton}>
                    <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                      OK
                    </ThemedText>
                  </Pressable>
                </View>
              </ThemedView>
            </Pressable>
          </Pressable>
        </Modal>
      </ThemedView>
    );
  }

  const displayedNews = newsItems.slice(0, 3);

  const openNotificationHistory = () => {
    navPush('/notification-history');
  };

  const renderAuthAction = () => {
    if (isAuthLoading) {
      return <ThemedText style={styles.authName}>...</ThemedText>;
    }

    if (authUser) {
      return (
        <View style={styles.authContainer}>
          <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.authName}>
            {authDisplayName}
          </ThemedText>
          <Pressable accessibilityRole="button" onPress={handleLogout} style={styles.logoutButton}>
            <ThemedText lightColor="#B42318" darkColor="#B42318" type="defaultSemiBold" style={styles.logoutButtonText}>
              Logout
            </ThemedText>
          </Pressable>
        </View>
      );
    }

    return (
      <Pressable accessibilityRole="button" onPress={handleLogin} style={styles.loginButton}>
        <ThemedText lightColor="#0A6E8A" darkColor="#0A6E8A" type="defaultSemiBold" style={styles.loginButtonText}>
          {TEXT.AUTH_LOGIN}</ThemedText>
      </Pressable>
    );
  };

  const renderHomeActions = () => (
    <View style={styles.headerActions}>
      <Pressable
        accessibilityLabel="Open notification history"
        accessibilityRole="button"
        onPress={openNotificationHistory}
        style={styles.notificationButton}>
        <IconSymbol name="bell.fill" size={23} color="#0A6E8A" />
        {unreadNotificationCount > 0 ? <View style={styles.notificationBadge} /> : null}
      </Pressable>
      {renderAuthAction()}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.HOME_TITLE}
        showBackButton={false}
        showHomeButton={false}
        rightContent={renderHomeActions()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.newsSectionHeader}>
          <ThemedText type="subtitle">{TEXT.HOME_NEWS_SECTION_TITLE}</ThemedText>
          <Pressable accessibilityRole="button" onPress={() => navPush('/news')} style={styles.viewAllButton}>
            <ThemedText lightColor="#0A6E8A" darkColor="#0A6E8A" type="defaultSemiBold" style={styles.viewAllText}>
              ดูทั้งหมด
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.newsCarouselWrapper}>
          {isNewsLoading ? (
            <View style={[styles.newsCarouselPage, { width: screenWidth }]}>
              <ThemedView style={styles.newsCarouselCard} lightColor="#E4F0F6" darkColor="#1D2B32">
                <ActivityIndicator color="#0A6E8A" />
              </ThemedView>
            </View>
          ) : displayedNews.length === 0 ? (
            <View style={[styles.newsCarouselPage, { width: screenWidth }]}>
              <ThemedView style={styles.newsCarouselCard} lightColor="#E4F0F6" darkColor="#1D2B32">
                <ThemedText style={styles.newsEmptyText}>{TEXT.HOME_NO_NEWS_MESSAGE}</ThemedText>
              </ThemedView>
            </View>
          ) : (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
                setNewsCarouselIndex(Math.max(0, Math.min(idx, displayedNews.length - 1)));
              }}
            >
              {displayedNews.map((item, index) => (
                <Pressable
                  key={getNewsKey(item, index)}
                  accessibilityRole="button"
                  style={[styles.newsCarouselPage, { width: screenWidth }]}
                  onPress={() => openNews(item)}
                >
                  <ThemedView style={styles.newsCarouselCard} lightColor="#E4F0F6" darkColor="#1D2B32">
                    <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.newsCarouselTitle}>
                      {item.title}
                    </ThemedText>
                    {(item.category || item.pubDate) ? (
                      <ThemedText style={styles.newsCarouselMeta}>
                        {[item.category, item.pubDate ? formatDateTime(item.pubDate) : ''].filter(Boolean).join(' · ')}
                      </ThemedText>
                    ) : null}
                  </ThemedView>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {displayedNews.length > 1 ? (
          <View style={styles.dotsRow}>
            {displayedNews.map((_, i) => (
              <View key={i} style={[styles.dot, i === newsCarouselIndex ? styles.dotActive : undefined]} />
            ))}
          </View>
        ) : null}

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">{TEXT.HOME_MENU_SECTION_TITLE}</ThemedText>
          <ThemedText style={styles.description}>{TEXT.HOME_MENU_SECTION_DESCRIPTION}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.grid}>
          {screens.map((screen, index) => (
            <Pressable key={`${String(screen.href)}-${index}`} style={styles.card} onPress={() => navPush(screen.href as Parameters<typeof navPush>[0])}>
              <ThemedText type="subtitle">{screen.title}</ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      </ScrollView>

      <Modal
        transparent
        visible={isLogoutConfirmOpen}
        animationType="fade"
        onRequestClose={() => setIsLogoutConfirmOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsLogoutConfirmOpen(false)}>
          <Pressable accessibilityRole="none" onPress={(event) => event.stopPropagation()}>
            <ThemedView style={styles.confirmModal} lightColor="#FFFFFF" darkColor="#151718">
              <ThemedText type="subtitle">Confirm logout</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                Do you want to sign out from this account?
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsLogoutConfirmOpen(false)}
                  style={styles.cancelButton}>
                  <ThemedText type="defaultSemiBold" style={styles.cancelButtonText}>
                    Cancel
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleConfirmLogout}
                  style={styles.confirmLogoutButton}>
                  <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                    Logout
                  </ThemedText>
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

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: 16,
    padding: CONTENT_PADDING,
  },
  section: {
    marginBottom: 16,
  },
  description: {
    marginTop: 8,
  },
  authName: {
    color: '#0A6E8A',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'right',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  notificationButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#D92D20',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  authContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  logoutButton: {
    minHeight: 26,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F4C7C3',
    backgroundColor: '#FFF4F2',
    paddingHorizontal: 8,
  },
  logoutButtonText: {
    fontSize: 12,
    lineHeight: 16,
  },
  loginButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#0A6E8A',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  loginButtonText: {
    fontSize: 13,
    lineHeight: 18,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 24, 28, 0.36)',
    padding: 24,
  },
  confirmModal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 8,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
    boxShadow: '0 18px 38px rgba(17, 24, 28, 0.2)',
  },
  confirmMessage: {
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  cancelButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#B9CDD6',
    paddingHorizontal: 14,
  },
  cancelButtonText: {
    color: '#52656D',
  },
  confirmLogoutButton: {
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
    borderRadius: 8,
    paddingHorizontal: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
  },
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
    color: '#687076',
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
    backgroundColor: '#0A6E8A',
    paddingHorizontal: 32,
  },
  welcomeLoginText: {
    fontSize: 16,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    width: '48%',
    minHeight: 96,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: '#E4F0F6',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
    elevation: 3,
    marginBottom: 12,
  },
  newsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewAllButton: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  viewAllText: {
    fontSize: 13,
    lineHeight: 18,
  },
  newsCarouselWrapper: {
    marginHorizontal: -CONTENT_PADDING,
  },
  newsCarouselPage: {
    paddingHorizontal: CONTENT_PADDING,
  },
  newsCarouselCard: {
    borderRadius: 16,
    padding: 16,
    minHeight: 110,
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
    elevation: 3,
  },
  newsCarouselTitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  newsCarouselMeta: {
    marginTop: 6,
    color: '#687076',
    fontSize: 12,
    lineHeight: 18,
  },
  newsEmptyText: {
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#B9CDD6',
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0A6E8A',
  },
});
