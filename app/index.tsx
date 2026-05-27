import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { TEXT } from '@/constants/text';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import type { AuthUser, News } from '@/models/types';
import { staffNewsFeed } from '@/services/newsService';
import { formatDateTime } from '@/utils/date-format';

const screens = [
  { title: TEXT.ABSENT_TITLE, href: '/absent' },
  { title: TEXT.FORGOT_TIMESTAMP_TITLE, href: '/forgot-timestamp' },
  { title: TEXT.MEETING_MENU_TITLE, href: '/meeting' },
  { title: TEXT.REPAIR_COMPUTER_MENU_TITLE, href: '/repair-computer/current-job' },
  { title: TEXT.CALENDAR_TITLE, href: '/calendar' },
  { title: TEXT.PERSON_SEARCH_TITLE, href: '/person-search' },
] as const;

function getAuthDisplayName(user: AuthUser | null) {
  if (!user) {
    return '';
  }

  const displayName = user.name || user.displayName || user.fullName || user.staffId;
  return typeof displayName === 'string' ? displayName : '';
}

export default function HomeScreen() {
  const [newsItems, setNewsItems] = useState<News[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(true);
  const { loading: isAuthLoading, signIn, user: authUser } = useAuth();

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

  const openNews = (link: string) => {
    if (link) {
      Linking.openURL(link);
    }
  };

  const handleLogin = async () => {
    await signIn();
  };

  const authDisplayName = getAuthDisplayName(authUser);

  const renderAuthAction = () => {
    if (isAuthLoading) {
      return <ThemedText style={styles.authName}>...</ThemedText>;
    }

    if (authUser) {
      return (
        <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.authName}>
          {authDisplayName}
        </ThemedText>
      );
    }

    return (
      <Pressable accessibilityRole="button" onPress={handleLogin} style={styles.loginButton}>
        <ThemedText lightColor="#0A6E8A" darkColor="#0A6E8A" type="defaultSemiBold" style={styles.loginButtonText}>
          {TEXT.AUTH_LOGIN}</ThemedText>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.HOME_TITLE}
        showBackButton={false}
        showHomeButton={false}
        rightContent={renderAuthAction()}
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
                <Pressable key={`${String(item.guid || item.link || item.title)}-${index}`} onPress={() => openNews(item.link)}>
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
      </ScrollView>
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
