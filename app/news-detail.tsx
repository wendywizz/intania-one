import { Calendar } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import type { News } from '@/models/types';
import { staffNewsFeed } from '@/services/newsService';
import { formatNewsDateTime } from '@/utils/date-format';
import { boxShadow } from '@/constants/shadows';

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

// Pull <img src="…"> URLs out of the news HTML so they can be shown (stripHtml
// discards the tags). Protocol-relative URLs are upgraded to https.
function extractImages(html: string): string[] {
  const urls: string[] = [];
  const regex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    let src = match[1].trim();
    if (src.startsWith('//')) src = `https:${src}`;
    if ((/^https?:\/\//i.test(src) || src.startsWith('data:')) && !urls.includes(src)) {
      urls.push(src);
    }
  }
  return urls;
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

type NewsLink = { href: string; label: string };

// A sentinel that can't collide with real content and survives both the tag
// stripping and entity decoding done in stripHtml().
const LINK_SENTINEL = /\u0000LINK(\d+)\u0000/;
const LINK_SENTINEL_GLOBAL = /\u0000LINK(\d+)\u0000/g;

// Pull <a href="…">…</a> out of the news HTML before stripHtml() discards all
// tags, replacing each with a sentinel so its position survives paragraph
// splitting. Returns the rewritten html plus the extracted links.
function extractLinks(html: string): { html: string; links: NewsLink[] } {
  const links: NewsLink[] = [];
  const rewritten = html.replace(
    /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_match, href: string, inner: string) => {
      let url = href.trim();
      if (url.startsWith('//')) url = `https:${url}`;
      const label = decodeHtmlEntities(inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
      const index = links.length;
      links.push({ href: url, label: label || url });
      return `\u0000LINK${index}\u0000`;
    },
  );
  return { html: rewritten, links };
}

type ParagraphSegment = { type: 'text'; value: string } | { type: 'link'; link: NewsLink };

function parseParagraphSegments(paragraph: string, links: NewsLink[]): ParagraphSegment[] {
  if (!LINK_SENTINEL.test(paragraph)) {
    return paragraph ? [{ type: 'text', value: paragraph }] : [];
  }

  const segments: ParagraphSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  LINK_SENTINEL_GLOBAL.lastIndex = 0;

  while ((match = LINK_SENTINEL_GLOBAL.exec(paragraph)) !== null) {
    const text = paragraph.slice(lastIndex, match.index);
    if (text) segments.push({ type: 'text', value: text });

    const link = links[Number(match[1])];
    if (link) segments.push({ type: 'link', link });

    lastIndex = match.index + match[0].length;
  }

  const trailingText = paragraph.slice(lastIndex);
  if (trailingText) segments.push({ type: 'text', value: trailingText });

  return segments;
}

async function openNewsLink(url: string) {
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    Linking.openURL(url).catch(() => {});
  }
}

function sameNewsItem(news: News, selected: News) {
  const selectedKey = selected.guid || selected.link || selected.title;
  const newsKey = news.guid || news.link || news.title;

  return Boolean(selectedKey && newsKey && selectedKey === newsKey);
}

export default function NewsDetailScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
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

  const { paragraphs, links } = useMemo(() => {
    const { html, links: extractedLinks } = extractLinks(news.description ?? '');
    return { paragraphs: splitParagraphs(html), links: extractedLinks };
  }, [news.description]);
  const images = useMemo(() => extractImages(news.description ?? ''), [news.description]);
  const date = news.pubDate ? formatNewsDateTime(news.pubDate) : '';
  const metaItems = [news.category, date].filter(Boolean);

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar title={TEXT.NEWS_DETAIL_TITLE} showHomeButton tone="primary" />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LoadingAnimate fill={false} title={TEXT.HOME_LOADING_NEWS_TITLE} desc={TEXT.SHARED_LOADING_DESCRIPTION} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            {/* Date / category meta row */}
            <View style={styles.metaRow}>
              <Calendar size={14} color={c.textMuted} />
              <ThemedText style={styles.metaText}>{metaItems.join(' • ')}</ThemedText>
            </View>

            {/* Title */}
            {news.title ? (
              <ThemedText style={styles.title}>{news.title}</ThemedText>
            ) : null}

            {/* Accent line */}
            <View style={styles.accentLine} />

            {/* Images embedded in the news content */}
            {images.map((uri, index) => (
              <Image
                key={`${uri}-${index}`}
                source={{ uri }}
                style={styles.newsImage}
                contentFit="cover"
                transition={200}
              />
            ))}

            {/* Body paragraphs */}
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, index) => {
                const segments = parseParagraphSegments(paragraph, links);
                return (
                  <ThemedText key={`${paragraph.slice(0, 20)}-${index}`} style={styles.paragraph}>
                    {segments.map((segment, segmentIndex) =>
                      segment.type === 'link' ? (
                        <ThemedText
                          key={`link-${segmentIndex}`}
                          style={styles.linkChip}
                          onPress={() => openNewsLink(segment.link.href)}
                          suppressHighlighting
                        >
                          {segment.link.label}
                        </ThemedText>
                      ) : (
                        segment.value
                      ),
                    )}
                  </ThemedText>
                );
              })
            ) : (
              <ThemedText style={styles.emptyText}>{TEXT.HOME_NO_NEWS_MESSAGE}</ThemedText>
            )}
          </View>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
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
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 20,
    gap: 16,
    boxShadow: boxShadow(c.shadow, { y: 2, blur: 8, opacity: 0.05 }),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  accentLine: {
    height: 4,
    width: 48,
    borderRadius: 9999,
    backgroundColor: c.primary,
  },
  newsImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    backgroundColor: c.surfaceMuted,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  // Matches Bootstrap's .btn.btn-info look (solid info-teal fill, white text)
  // since that's the reference the news content's own site links are styled after.
  linkChip: {
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    fontFamily: AppFonts.psuBold,
    backgroundColor: '#17A2B8',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  emptyText: {
    color: c.textMuted,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: AppFonts.psuRegular,
  },
});
