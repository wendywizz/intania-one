import {PROCESS} from '../constants/domain';
import { ENDPOINTS } from '../constants/endpoints';
import type {Result} from '../models/types';

const TIMEOUT_MS = 10000;
export const API_DELAY_MS = 500;
export const MESSAGE_CANNOT_CONNECT_TO_SERVER = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
export const MESSAGE_PROCESS_FAILED = 'ดำเนินการไม่สำเร็จ';
export const MESSAGE_SERVER_ERROR = 'เซิร์ฟเวอร์ขัดข้อง';

export type JsonMap = Record<string, unknown>;

export type UploadableFile =
  | Blob
  | {
      uri: string;
      name?: string;
      type?: string;
    };

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

export function createPhoenixUrl(path: string, query?: Record<string, string | number | undefined>) {
  return buildHttpsUrl(ENDPOINTS.phoenix, path, query);
}

export function createLocalUrl(path: string, query?: Record<string, string | number | undefined>) {
  const url = new URL(path, 'http://localhost');

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return `${url.pathname}${url.search}`;
}

export async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  await waitApiDelay();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(MESSAGE_CANNOT_CONNECT_TO_SERVER);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestJson<T = JsonMap>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithTimeout(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();

  if (!response.ok || !text) {
    throw new Error(MESSAGE_SERVER_ERROR);
  }

  return JSON.parse(text) as T;
}

export function toResultRow<T = unknown>(jsonData: JsonMap): Result<T> {
  const processType = String(jsonData.process_type ?? jsonData.processType ?? PROCESS.success);

  return {
    processType,
    data: jsonData.data as T | undefined,
    message: String(jsonData.message ?? ''),
    success: Boolean(jsonData.success ?? processType === PROCESS.success),
  };
}

export function toResultList<T = unknown>(jsonData: JsonMap): Result<T[]> {
  const processType = String(jsonData.process_type ?? jsonData.processType ?? PROCESS.success);
  const data = Array.isArray(jsonData.data) ? (jsonData.data as T[]) : [];

  return {
    processType,
    data,
    totalCount: Number(jsonData.total_count ?? jsonData.totalCount ?? data.length),
    message: String(jsonData.message ?? ''),
    success: Boolean(jsonData.success ?? processType === PROCESS.success),
  };
}

export function toErrorResult<T = unknown>(error: unknown): Result<T> {
  return {
    processType: PROCESS.error,
    message: error instanceof Error ? error.message : String(error),
    success: false,
  };
}

export function toErrorListResult<T = unknown>(error: unknown): Result<T[]> {
  return {
    ...toErrorResult<T[]>(error),
    data: [],
    totalCount: 0,
  };
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
    return toErrorListResult<T>(error);
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
