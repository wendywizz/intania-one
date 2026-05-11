import { XMLParser } from 'fast-xml-parser';
import { Platform } from 'react-native';
import { ENDPOINTS } from '../constants/endpoints';
import type { News } from '../models/types';

const parser = new XMLParser({ignoreAttributes: false});
const WEB_NEWS_PROXY = '/api/staff-news-feed';

function parseNewsFeed(xml: string): News[] {
  const parsed = parser.parse(xml);
  const items = parsed?.rss?.channel?.item;
  const list = Array.isArray(items) ? items : items ? [items] : [];

  return list.map((item: any) => ({
    title: item.title ?? '',
    link: item.link ?? '',
    guid: item.guid ?? '',
    description: item.description ?? '',
    category: item.category ?? '',
    pubDate: item.pubDate ?? '',
  }));
}

export async function staffNewsFeed(): Promise<News[]> {
  try {
    if (Platform.OS === 'web') {
      const response = await fetch(WEB_NEWS_PROXY);
      const news = await response.json();
      return Array.isArray(news) ? news : [];
    }

    const response = await fetch(ENDPOINTS.staffNewsFeed);
    const xml = await response.text();
    return parseNewsFeed(xml);
  } catch (error) {
    console.warn(error);
    return [];
  }
}
