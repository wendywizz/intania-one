import { API_BASE_URL } from "../constants/apiConfig";

const TIMEOUT_MS = 10000;

export { API_BASE_URL };
export const API_DELAY_MS = 500;
export const MESSAGE_CANNOT_CONNECT_TO_SERVER =
  "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้";
export const MESSAGE_PROCESS_FAILED = "ดำเนินการไม่สำเร็จ";
export const MESSAGE_SERVER_ERROR = "เซิร์ฟเวอร์ขัดข้อง";

export type JsonMap = Record<string, unknown>;

type ApiResponse<T = unknown> = {
  data?: T;
  message?: string;
  process_type?: unknown;
  processType?: unknown;
  success?: boolean | string;
  total_count?: number;
  totalCount?: number;
};

export type ListResponse<T> = {
  data: T[];
  totalCount: number;
  message: string;
};

export type MutationResponse<T = unknown> = {
  data?: T;
  message: string;
};

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

export async function fetchWithApiDelay(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  await waitApiDelay();
  return fetch(input, init);
}

function createUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | undefined | null>,
) {
  const url = new URL(path, baseUrl);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

export function createApiUrl(
  path: string,
  query?: Record<string, string | number | undefined | null>,
) {
  return createUrl(API_BASE_URL, path, query);
}

export function buildHttpsUrl(
  _host: string,
  path: string,
  query?: Record<string, string | number | undefined | null>,
) {
  return createApiUrl(path, query);
}

export function createLocalUrl(
  path: string,
  query?: Record<string, string | number | undefined>,
) {
  const url = new URL(path, "http://localhost");

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return `${url.pathname}${url.search}`;
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  await waitApiDelay();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(MESSAGE_CANNOT_CONNECT_TO_SERVER);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestJson<T = JsonMap>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetchWithTimeout(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();

  if (!response.ok || !text) {
    throw new Error(MESSAGE_SERVER_ERROR);
  }

  return JSON.parse(text) as T;
}

function isSuccessResponse(json: ApiResponse) {
  if (typeof json.success === "boolean") {
    return json.success;
  }

  if (typeof json.success === "string") {
    return ["true", "success", "successed", "ok"].includes(
      json.success.toLowerCase(),
    );
  }

  const processType = String(
    json.process_type ?? json.processType ?? "success",
  ).toLowerCase();

  return ["success", "successed", "ok"].includes(processType);
}

function getMessage(json: ApiResponse) {
  return String(json.message ?? "");
}

export function ensureSuccess(json: ApiResponse) {
  if (!isSuccessResponse(json)) {
    throw new Error(getMessage(json) || MESSAGE_PROCESS_FAILED);
  }
}

export async function listRequest<T>(url: string): Promise<ListResponse<T>> {
  const json = await requestJson<ApiResponse<T[]>>(url);
  ensureSuccess(json);

  const data = Array.isArray(json.data) ? json.data : [];
  return {
    data,
    totalCount: Number(json.total_count ?? json.totalCount ?? data.length),
    message: getMessage(json),
  };
}

export async function rowRequest<T>(url: string): Promise<T> {
  const json = await requestJson<ApiResponse<T>>(url);
  ensureSuccess(json);
  return json.data as T;
}

export async function mutationRequest<T>(
  url: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
): Promise<MutationResponse<T>> {
  const json = await requestJson<ApiResponse<T>>(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  ensureSuccess(json);

  return {
    data: json.data,
    message: getMessage(json),
  };
}
