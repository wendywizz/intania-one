import { Link, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { TEXT } from '@/constants/text';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import type { AuthUser, News } from '@/models/types';
import { staffNewsFeed } from '@/services/newsService';
import { getUnreadNotificationCount } from '@/services/notificationService';
import { formatDateTime } from '@/utils/date-format';

const screens = [
  { title: TEXT.ABSENT_TITLE, href: '/absent' },
  { title: TEXT.FORGOT_TIMESTAMP_TITLE, href: '/forgot-timestamp' },
  { title: TEXT.MEETING_MENU_TITLE, href: '/meeting' },
  { title: TEXT.REPAIR_COMPUTER_MENU_TITLE, href: '/repair-computer/current-job' },
  { title: TEXT.CALENDAR_TITLE, href: '/calendar' },
  { title: TEXT.PERSON_SEARCH_TITLE, href: '/person-search' },
] as const;

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
  const [newsItems, setNewsItems] = useState<News[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(true);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [authCallbackErrorMessage, setAuthCallbackErrorMessage] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
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

  useEffect(() => {
    let isMounted = true;

    async function loadNews() {
      setIsNewsLoading(true);
      const feedItems = await staffNewsFeed();

      if (isMounted) {
        setNewsItems(feedItems.slice(0, 3));
        setIsNewsLoading(false);
      }
    }

    loadNews();

    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      void getUnreadNotificationCount().then((count) => {
        if (isActive) {
          setUnreadNotificationCount(count);
        }
      });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const openNews = (item: News) => {
    router.push({
      pathname: '/news-detail',
      params: {
        title: item.title,
        link: item.link,
        guid: item.guid,
        description: item.description,
        category: item.category,
        pubDate: item.pubDate,
      },
    });
  };

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

  const authDisplayName = getAuthDisplayName(authUser);

  const openNotificationHistory = () => {
    router.push('/notification-history');
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
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">{TEXT.HOME_NEWS_SECTION_TITLE}</ThemedText>
          <ThemedView style={styles.newsList}>
            {isNewsLoading ? (
              <ThemedView style={styles.newsCard} lightColor="#FFFFFF" darkColor="#1F2B30">
                <LoadingAnimate fill={false} title={TEXT.HOME_LOADING_NEWS_TITLE} desc={TEXT.SHARED_LOADING_DESCRIPTION} />
              </ThemedView>
            ) : newsItems.length > 0 ? (
              newsItems.map((item, index) => (
                <Pressable key={`${String(item.guid || item.link || item.title)}-${index}`} onPress={() => openNews(item)}>
                  <ThemedView style={styles.newsCard} lightColor="#FFFFFF" darkColor="#1F2B30">
                    <ThemedText type="defaultSemiBold" numberOfLines={2}>
                      {item.title}
                    </ThemedText>
                    <ThemedText style={styles.newsMeta}>
                      {[item.category, item.pubDate ? formatDateTime(item.pubDate) : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              ))
            ) : (
              <ThemedView style={styles.newsCard} lightColor="#FFFFFF" darkColor="#1F2B30">
                <ThemedText>{TEXT.HOME_NO_NEWS_MESSAGE}</ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        </ThemedView>

        {authUser ? (
          <>
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle">{TEXT.HOME_MENU_SECTION_TITLE}</ThemedText>
              <ThemedText style={styles.description}>{TEXT.HOME_MENU_SECTION_DESCRIPTION}</ThemedText>
            </ThemedView>
            <ThemedView style={styles.grid}>
              {screens.map((screen, index) => (
                <Link key={`${String(screen.href)}-${index}`} href={screen.href as Parameters<typeof Link>[0]['href']} asChild>
                  <TouchableOpacity style={styles.card}>
                    <ThemedText type="subtitle">{screen.title}</ThemedText>
                  </TouchableOpacity>
                </Link>
              ))}
            </ThemedView>
          </>
        ) : null}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 32,
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
  newsList: {
    gap: 10,
    marginTop: 12,
  },
  newsCard: {
    borderRadius: 8,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
  },
  newsMeta: {
    marginTop: 4,
    color: '#687076',
    fontSize: 12,
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
});
