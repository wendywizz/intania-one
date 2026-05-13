import {XMLParser} from 'fast-xml-parser';
import {ENDPOINTS} from '../constants/endpoints';
import type {News} from '../models/types';

const parser = new XMLParser({ignoreAttributes: false});

export async function staffNewsFeed(): Promise<News[]> {
  try {
    const response = await fetch(ENDPOINTS.staffNewsFeed, {
      headers: {'Content-Type': 'application/xml'},
    });
    const xml = await response.text();
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
  } catch (error) {
    console.warn(error);
    return [];
  }
}
