import { ENDPOINTS } from '../constants/endpoints';
import type { News } from '../models/types';
import { fetchApi } from './api';

function getFeedText(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    return getFeedText(item['#text'] ?? item.text ?? item.value ?? '');
  }

  return '';
}

function normalizeNewsItem(item: Record<string, unknown>): News {
  return {
    title: getFeedText(item.title),
    link: getFeedText(item.link),
    guid: getFeedText(item.guid),
    description: getFeedText(item.description),
    category: getFeedText(item.category),
    pubDate: getFeedText(item.pubDate),
  };
}

export async function staffNewsFeed(): Promise<News[]> {
  try {
    const response = await fetchApi(ENDPOINTS.staffNewsFeed);

    if (!response.ok) {
      throw new Error(`Unable to load news feed (${response.status})`);
    }

    const json = await response.json();
    const items = Array.isArray(json?.data) ? json.data : [];
    return items.map((item: Record<string, unknown>) => normalizeNewsItem(item));
  } catch (error) {
    console.warn(error);
    return [];
  }
}
