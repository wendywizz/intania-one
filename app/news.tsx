import { ArrowRight } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { ErrorState } from '@/components/error-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import type { News } from '@/models/types';
import { staffNewsFeed } from '@/services/newsService';
import { formatDateTime } from '@/utils/date-format';
import { navPush } from '@/utils/navigation';

function getNewsKey(item: News, index: number) {
  return `${String(item.guid || item.link || item.title)}-${index}`;
}

function getExcerpt(html: string, maxLength = 140): string {
  const text = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}…`;
}

type NewsListItemProps = {
  item: News;
  onPress: (item: News) => void;
};

function NewsListItem({ item, onPress }: NewsListItemProps) {
  const date = item.pubDate ? formatDateTime(item.pubDate) : '';
  const excerpt = item.description ? getExcerpt(item.description) : '';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(item)}
      style={({ pressed }) => (pressed ? styles.cardPressed : undefined)}
    >
      <View style={styles.newsCard}>
        <View style={styles.cardMeta}>
          {item.category ? (
            <ThemedText style={styles.categoryTag}>
              {item.category.toUpperCase()}
            </ThemedText>
          ) : null}
          {date ? (
            <ThemedText style={styles.dateText}>{date}</ThemedText>
          ) : null}
        </View>
        <ThemedText style={styles.newsTitle} numberOfLines={2}>
          {item.title}
        </ThemedText>
        {excerpt ? (
          <ThemedText style={styles.newsExcerpt} numberOfLines={3}>
            {excerpt}
          </ThemedText>
        ) : null}
        <View style={styles.readMoreRow}>
          <ThemedText style={styles.readMoreText}>Read more</ThemedText>
          <ArrowRight size={14} color="#922124" />
        </View>
      </View>
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

  const listHeader = (
    <View style={styles.listHeader}>
      <ThemedText style={styles.listHeading}>Latest Updates</ThemedText>
      <ThemedText style={styles.listSubheading}>
        Stay informed about the latest happenings within HR Connect.
      </ThemedText>
    </View>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.stateContainer}>
          <LoadingAnimate
            title={TEXT.HOME_LOADING_NEWS_TITLE}
            desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT}
          />
        </View>
      );
    }

    if (error) {
      return (
        <ErrorState
          title={TEXT.SHARED_SOMETHING_WENT_WRONG}
          message={error}
          onRetry={() => loadNews()}
        />
      );
    }

    return (
      <FlatList
        style={styles.flatList}
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
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <ThemedText style={styles.emptyMessage}>{TEXT.HOME_NO_NEWS_MESSAGE}</ThemedText>
          </View>
        }
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar
        title={TEXT.HOME_NEWS_SECTION_TITLE}
        subtitle={TEXT.HOME_NEWS_SECTION_SUBTITLE}
        moduleIcon="doc.text.fill"
        showHomeButton
      />
      <View style={styles.content}>
        {renderContent()}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  content: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  listHeader: {
    gap: 6,
    paddingBottom: 8,
  },
  listHeading: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: '#191C1F',
    fontFamily: AppFonts.psuBold,
  },
  listSubheading: {
    fontSize: 14,
    lineHeight: 20,
    color: '#584140',
    fontFamily: AppFonts.psuRegular,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  newsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E2E6',
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.75,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.6,
    color: '#922124',
    fontFamily: AppFonts.psuBold,
  },
  dateText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#585E6D',
    fontFamily: AppFonts.psuRegular,
  },
  newsTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: '#191C1F',
    fontFamily: AppFonts.psuBold,
  },
  newsExcerpt: {
    fontSize: 14,
    lineHeight: 20,
    color: '#584140',
    fontFamily: AppFonts.psuRegular,
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#922124',
    fontFamily: AppFonts.psuBold,
  },
  stateContainer: {
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
    backgroundColor: '#B33939',
    marginTop: 24,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E1E2E6',
  },
  emptyMessage: {
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
