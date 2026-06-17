import MaterialIcons from '@react-native-vector-icons/material-icons';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
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

  const paragraphs = splitParagraphs(news.description ?? '');
  const date = news.pubDate ? formatDateTime(news.pubDate) : '';
  const metaItems = [news.category, date].filter(Boolean);

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar title="News Detail" showHomeButton />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LoadingAnimate fill={false} title={TEXT.HOME_LOADING_NEWS_TITLE} desc={TEXT.SHARED_LOADING_DESCRIPTION} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            {/* Date / category meta row */}
            <View style={styles.metaRow}>
              <MaterialIcons name="calendar-today" size={14} color="#585E6D" />
              <ThemedText style={styles.metaText}>{metaItems.join(' • ')}</ThemedText>
            </View>

            {/* Title */}
            {news.title ? (
              <ThemedText style={styles.title}>{news.title}</ThemedText>
            ) : null}

            {/* Accent line */}
            <View style={styles.accentLine} />

            {/* Body paragraphs */}
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, index) => (
                <ThemedText key={`${paragraph.slice(0, 20)}-${index}`} style={styles.paragraph}>
                  {paragraph}
                </ThemedText>
              ))
            ) : (
              <ThemedText style={styles.emptyText}>{TEXT.HOME_NO_NEWS_MESSAGE}</ThemedText>
            )}
          </View>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E2E6',
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#585E6D',
    fontFamily: AppFonts.psuRegular,
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    color: '#191C1F',
    fontFamily: AppFonts.psuBold,
  },
  accentLine: {
    height: 4,
    width: 48,
    borderRadius: 9999,
    backgroundColor: '#B33939',
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#584140',
    fontFamily: AppFonts.psuRegular,
  },
  emptyText: {
    color: '#687076',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: AppFonts.psuRegular,
  },
});
