import {PROCESS} from '../constants/domain';
import type {Result} from '../models/types';

const TIMEOUT_MS = 10000;
export const API_DELAY_MS = 500;

export function waitApiDelay() {
  return new Promise((resolve) => setTimeout(resolve, API_DELAY_MS));
}

export async function fetchWithApiDelay(input: RequestInfo | URL, init?: RequestInit) {
  await waitApiDelay();
  return fetch(input, init);
}

export function buildHttpsUrl(
  host: string,
  path: string,
  query?: Record<string, string | number | undefined | null>,
) {
  const url = new URL(`https://${host}${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetchWithApiDelay(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    const text = await response.text();

    if (!response.ok || !text) {
      throw new Error('Server request failed');
    }

    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function listRequest<T>(url: string): Promise<Result<T[]>> {
  try {
    const json = await requestJson<{data?: T[]; message?: string}>(url);
    const data = Array.isArray(json.data) ? json.data : [];
    return {
      processType: PROCESS.success,
      data,
      totalCount: data.length,
      message: json.message ?? '',
    };
  } catch (error) {
    return {
      processType: PROCESS.error,
      data: [],
      totalCount: 0,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function rowRequest<T>(url: string): Promise<Result<T>> {
  try {
    const json = await requestJson<{data?: T; message?: string; success?: boolean}>(
      url,
    );
    return {
      processType: PROCESS.success,
      data: json.data,
      success: json.success,
      message: json.message ?? '',
    };
  } catch (error) {
    return {
      processType: PROCESS.error,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function mutationRequest<T>(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: unknown,
): Promise<Result<T>> {
  try {
    const json = await requestJson<{data?: T; message?: string; success?: boolean}>(
      url,
      {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
      },
    );
    return {
      processType: PROCESS.success,
      data: json.data,
      success: json.success ?? true,
      message: json.message ?? '',
    };
  } catch (error) {
    return {
      processType: PROCESS.error,
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
