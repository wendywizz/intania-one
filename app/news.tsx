import { ArrowRight, Calendar, Newspaper } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { ErrorState } from '@/components/error-state';
import { EmptyState } from '@/components/empty-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PillButton } from '@/components/ui';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import type { News } from '@/models/types';
import { staffNewsFeed } from '@/services/newsService';
import { formatNewsDateTime } from '@/utils/date-format';
import { navPush } from '@/utils/navigation';

// The feed returns every item at once (no server paging), so we reveal it in
// pages client-side as the user scrolls to the end.
const PAGE_SIZE = 8;

function getNewsKey(item: News, index: number) {
  return `${String(item.guid || item.link || item.title)}-${index}`;
}

type NewsListItemProps = {
  item: News;
  onPress: (item: News) => void;
};

function NewsListItem({ item, onPress }: NewsListItemProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const date = item.pubDate ? formatNewsDateTime(item.pubDate) : '';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(item)}
      style={({ pressed }) => (pressed ? styles.cardPressed : undefined)}
    >
      <View style={styles.newsCard}>
        {item.category ? (
          <ThemedText style={styles.categoryTag}>
            {item.category.toUpperCase()}
          </ThemedText>
        ) : null}
        <ThemedText style={styles.newsTitle} numberOfLines={2}>
          {item.title}
        </ThemedText>
        {date ? (
          <View style={styles.dateRow}>
            <Calendar size={13} color={c.textMuted} />
            <ThemedText style={styles.dateText}>{date}</ThemedText>
          </View>
        ) : null}
        <PillButton
          style={styles.readMoreButton}
          label={TEXT.NEWS_READ_MORE}
          onPress={() => onPress(item)}
          variant="soft"
          trailing={<ArrowRight size={14} color={c.primary} />}
        />
      </View>
    </Pressable>
  );
}

export default function NewsScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [newsItems, setNewsItems] = useState<News[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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
      // Start each (re)load at the first page.
      setVisibleCount(PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXT.HOME_NO_NEWS_MESSAGE);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const visibleNews = useMemo(
    () => newsItems.slice(0, visibleCount),
    [newsItems, visibleCount],
  );
  const hasMore = visibleCount < newsItems.length;

  const handleEndReached = useCallback(() => {
    if (isLoadingMore || visibleCount >= newsItems.length) return;
    // Brief delay so the footer spinner is visible and it reads as "loading
    // more", even though the next page is already in memory.
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((count) => Math.min(count + PAGE_SIZE, newsItems.length));
      setIsLoadingMore(false);
    }, 250);
  }, [isLoadingMore, visibleCount, newsItems.length]);

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
        <View style={styles.stateContainer}>
          <LoadingAnimate title="" desc="" />
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
        data={visibleNews}
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
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={c.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={<EmptyState icon={Newspaper} message={TEXT.HOME_NO_NEWS_MESSAGE} />}
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={TEXT.HOME_NEWS_SECTION_TITLE}
        titleInNavBar
        tone="primary"
        showHomeButton={false}
      />
      <View style={styles.content}>
        {renderContent()}
      </View>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    padding: 16,
    gap: 16,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 10,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.75,
  },
  categoryTag: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.6,
    color: c.primary,
    fontFamily: AppFonts.psuBold,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    lineHeight: 16,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  readMoreButton: {
    alignSelf: 'flex-end',
  },
  newsTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  stateMessage: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: 'center',
  },
  errorText: {
    color: c.danger,
  },
  retryButton: {
    minHeight: 48,
    minWidth: 132,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: c.pomegranate,
    marginTop: 24,
  },
  emptyCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    borderWidth: 1,
    borderColor: c.border,
  },
  emptyMessage: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
