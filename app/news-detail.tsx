import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';
import type { News } from '@/models/types';
import { staffNewsFeed } from '@/services/newsService';
import { formatDateTime } from '@/utils/date-format';

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function decodeHtmlEntities(value: string) {
  const namedEntities: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    const normalizedCode = code.toLowerCase();

    if (normalizedCode.startsWith('#x')) {
      return String.fromCharCode(Number.parseInt(normalizedCode.slice(2), 16));
    }

    if (normalizedCode.startsWith('#')) {
      return String.fromCharCode(Number.parseInt(normalizedCode.slice(1), 10));
    }

    return namedEntities[normalizedCode] ?? entity;
  });
}

function stripHtml(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  );
}

function splitParagraphs(value: string) {
  return stripHtml(value)
    .split(/\n{2,}|\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function sameNewsItem(news: News, selected: News) {
  const selectedKey = selected.guid || selected.link || selected.title;
  const newsKey = news.guid || news.link || news.title;

  return Boolean(selectedKey && newsKey && selectedKey === newsKey);
}

export default function NewsDetailScreen() {
  const params = useLocalSearchParams<{
    title?: string;
    link?: string;
    guid?: string;
    description?: string;
    category?: string;
    pubDate?: string;
  }>();
  const initialNews = useMemo<News>(
    () => ({
      title: getParam(params.title),
      link: getParam(params.link),
      guid: getParam(params.guid),
      description: getParam(params.description),
      category: getParam(params.category),
      pubDate: getParam(params.pubDate),
    }),
    [params.category, params.description, params.guid, params.link, params.pubDate, params.title],
  );
  const [news, setNews] = useState(initialNews);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadNews() {
      setIsLoading(true);

      const items = await staffNewsFeed();
      const matchedNews = items.find((item) => sameNewsItem(item, initialNews));

      if (isMounted) {
        setNews(matchedNews ?? initialNews);
        setIsLoading(false);
      }
    }

    loadNews();

    return () => {
      isMounted = false;
    };
  }, [initialNews]);

  const paragraphs = splitParagraphs(news.description);
  const metaItems = [news.category, news.pubDate ? formatDateTime(news.pubDate) : ''].filter(Boolean);
  const hasNewsContent = Boolean(news.title || paragraphs.length || news.link);

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title="News" showHomeButton />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LoadingAnimate fill={false} title={TEXT.HOME_LOADING_NEWS_TITLE} desc={TEXT.SHARED_LOADING_DESCRIPTION} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {hasNewsContent ? (
            <>
              <ThemedView style={styles.hero} lightColor="#EAF6F2" darkColor="#162A2A">
                <View style={styles.metaRow}>
                  {metaItems.map((item) => (
                    <ThemedText key={item} style={styles.metaChip}>
                      {item}
                    </ThemedText>
                  ))}
                </View>
                <ThemedText type="title" style={styles.title}>
                  {news.title}
                </ThemedText>
              </ThemedView>

              <ThemedView style={styles.article} lightColor="#FFFFFF" darkColor="#151718">
                {paragraphs.length > 0 ? (
                  paragraphs.map((paragraph, index) => (
                    <ThemedText key={`${paragraph.slice(0, 20)}-${index}`} style={styles.paragraph}>
                      {paragraph}
                    </ThemedText>
                  ))
                ) : (
                  <ThemedText style={styles.emptyText}>{TEXT.HOME_NO_NEWS_MESSAGE}</ThemedText>
                )}
              </ThemedView>

            </>
          ) : (
            <ThemedView style={styles.article} lightColor="#FFFFFF" darkColor="#151718">
              <ThemedText style={styles.emptyText}>{TEXT.HOME_NO_NEWS_MESSAGE}</ThemedText>
            </ThemedView>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 32,
  },
  hero: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#B8DCD3',
    padding: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaChip: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#D8EFE8',
    color: '#0A6E5A',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  title: {
    color: '#102A2E',
    fontSize: 24,
    lineHeight: 32,
  },
  article: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
    padding: 18,
  },
  paragraph: {
    color: '#31474F',
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 14,
  },
  emptyText: {
    color: '#687076',
    fontSize: 15,
    lineHeight: 22,
  },
});
