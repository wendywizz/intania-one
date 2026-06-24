import { ENDPOINTS } from '../constants/endpoints';
import type { ExamDetail, ExamTask } from '../models/types';
import { createApiUrl, requestJson } from './api';

function createExaminarUrl(
  base: string,
  query: Record<string, string | number | undefined | null>,
) {
  const url = new URL(base);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function extractArray<T>(json: unknown): T[] {
  if (Array.isArray(json)) return json as T[];
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as T[];
  }
  return [];
}

function extractObject<T>(json: unknown): T | null {
  if (!json || typeof json !== 'object') return null;
  const obj = json as Record<string, unknown>;
  if (obj.data && typeof obj.data === 'object') return obj.data as T;
  return json as T;
}

export async function listExamTasks(params: {
  staff_id: string;
  year: string;
  term: string;
  period: string;
}): Promise<ExamTask[]> {
  const url = createExaminarUrl(ENDPOINTS.examinar, params);
  const json = await requestJson(url);
  return extractArray<ExamTask>(json);
}

export async function getExamDetail(params: {
  year: string;
  term: string;
  period: string;
  date: string;
  time_from: string;
  room_id: string;
}): Promise<ExamDetail | null> {
  const url = createExaminarUrl(ENDPOINTS.examinarDetail, params);
  const json = await requestJson(url);
  return extractObject<ExamDetail>(json);
}
