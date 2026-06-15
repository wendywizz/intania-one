import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';
import type { News } from '@/models/types';
import { staffNewsFeed } from '@/services/newsService';
import { formatDateTime } from '@/utils/date-format';
import { navPush } from '@/utils/navigation';

function getNewsKey(item: News, index: number) {
  return `${String(item.guid || item.link || item.title)}-${index}`;
}

type NewsListItemProps = {
  item: News;
  onPress: (item: News) => void;
};

function NewsListItem({ item, onPress }: NewsListItemProps) {
  const meta = [item.category, item.pubDate ? formatDateTime(item.pubDate) : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable accessibilityRole="button" onPress={() => onPress(item)}>
      <ThemedView style={styles.newsCard} lightColor="#FFFFFF" darkColor="#1F2B30">
        <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.newsTitle}>
          {item.title}
        </ThemedText>
        {meta ? (
          <ThemedText style={styles.newsMeta}>{meta}</ThemedText>
        ) : null}
      </ThemedView>
    </Pressable>
  );
}

export default function NewsScreen() {
  const [newsItems, setNewsItems] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadNews = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError('');

    try {
      const items = await staffNewsFeed();
      setNewsItems(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXT.HOME_NO_NEWS_MESSAGE);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNews();
    }, [loadNews]),
  );

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

  const renderContent = () => {
    if (isLoading) {
      return (
        <LoadingAnimate
          title={TEXT.HOME_LOADING_NEWS_TITLE}
          desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT}
        />
      );
    }

    if (error) {
      return (
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">{TEXT.SHARED_SOMETHING_WENT_WRONG}</ThemedText>
          <ThemedText style={[styles.stateMessage, styles.errorText]}>{error}</ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => loadNews()}
            style={styles.retryButton}
          >
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              {TEXT.SHARED_RETRY}
            </ThemedText>
          </Pressable>
        </View>
      );
    }

    return (
      <FlatList
        contentContainerStyle={styles.listContent}
        data={newsItems}
        keyExtractor={getNewsKey}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadNews(true)}
          />
        }
        renderItem={({ item }) => (
          <NewsListItem item={item} onPress={openNews} />
        )}
        ListEmptyComponent={
          <ThemedView style={styles.emptyCard} lightColor="#FFFFFF" darkColor="#1F2B30">
            <ThemedText style={styles.emptyMessage}>{TEXT.HOME_NO_NEWS_MESSAGE}</ThemedText>
          </ThemedView>
        }
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.HOME_NEWS_SECTION_TITLE} showHomeButton />
      <View style={styles.content}>
        {renderContent()}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    padding: 16,
  },
  newsCard: {
    borderRadius: 8,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
  },
  newsTitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  newsMeta: {
    marginTop: 4,
    color: '#687076',
    fontSize: 12,
    lineHeight: 18,
  },
  stateContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  stateMessage: {
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: 'center',
  },
  errorText: {
    color: '#B42318',
  },
  retryButton: {
    minHeight: 48,
    minWidth: 132,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0A6E8A',
    marginTop: 24,
  },
  emptyCard: {
    borderRadius: 8,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  emptyMessage: {
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
