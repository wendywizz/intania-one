import { ENV } from "../constants/config";
import {
  MODULE_DISABLED,
  isModuleDisabledText,
  moduleDisabledText,
} from "../constants/module-status";
import { API_BASE_URL, LOCAL_URL_BASE } from "../constants/endpoints";

const TIMEOUT_MS = 10000;

export { API_BASE_URL };
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

/**
 * A plain fetch on our own API, with the token attached and no timeout.
 *
 * For callers that need the Response itself — an upload, a stream, a body whose
 * 4xx text matters. Everything that just wants JSON should use requestJson.
 */
export async function fetchApi(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, withApiToken(input, init));
}

function createUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | undefined | null>,
) {
  // `new URL(path, base)` treats a leading "/" in `path` as absolute from the
  // origin, silently dropping any path segment already on `base` (e.g. the
  // production gateway's `/scooba`). Force base+path to join as a relative
  // path instead — this is a no-op for an already-absolute `path` (one of our
  // ENDPOINTS.* strings, which has no leading "/" to strip) and for a `base`
  // with no path of its own, so it doesn't change behavior anywhere else.
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const relativePath = path.replace(/^\/+/, '');
  const url = new URL(relativePath, base);

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
  host: string,
  path: string,
  query?: Record<string, string | number | undefined | null>,
) {
  return createUrl(host, path, query);
}

export function createLocalUrl(
  path: string,
  query?: Record<string, string | number | undefined>,
) {
  const url = new URL(path, LOCAL_URL_BASE);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return `${url.pathname}${url.search}`;
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return (input as Request).url ?? "";
}

/**
 * Attach the Strapi API token to calls on our own API.
 *
 * Almost every service reaches the network through fetchWithTimeout, so adding
 * the header here covers the whole app. It is exported for the few calls that
 * cannot go through fetchWithTimeout — booking-room's form submits, which need
 * their own timeout and the server's own 4xx wording — so that those still get
 * the token from one place rather than assembling the header themselves.
 *
 * Two rules keep it from doing harm: the token is only ever sent to
 * API_BASE_URL — never to PSU SSO, the news feed, or any other host — and a
 * caller that set its own Authorization header keeps it, which is what lets the
 * SSO calls carry a user token instead.
 */
export function withApiToken(input: RequestInfo | URL, init?: RequestInit): RequestInit | undefined {
  const token = ENV.scoobaApiKey.trim();
  if (!token || !requestUrl(input).startsWith(API_BASE_URL)) {
    return init;
  }

  const headers = { ...((init?.headers as Record<string, string> | undefined) ?? {}) };
  const hasAuth = Object.keys(headers).some(
    (key) => key.toLowerCase() === "authorization",
  );

  if (hasAuth) {
    return init;
  }

  return { ...init, headers: { ...headers, Authorization: `Bearer ${token}` } };
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...withApiToken(input, init),
      signal: controller.signal,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[api] request failed", String(input), error);
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(MESSAGE_CANNOT_CONNECT_TO_SERVER);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/** Whether a caught error is "this module is switched off" rather than a fault. */
export function isModuleDisabled(error: unknown) {
  return error instanceof Error && isModuleDisabledText(error.message);
}

/** The wording the server gave, without the marker the app matches on. */
export function moduleDisabledMessage(error: unknown) {
  return isModuleDisabled(error) ? moduleDisabledText((error as Error).message) : "";
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
    // A switched-off module has to survive as something the UI can tell apart:
    // collapsing it into "เซิร์ฟเวอร์ขัดข้อง" would show people a fault when
    // nothing is broken. The marker is carried in the message because every
    // screen here stores the error as a plain string.
    if (response.status === 503 && text) {
      try {
        const body = JSON.parse(text) as { error?: { name?: string; message?: string } };
        if (body?.error?.name === "ModuleDisabled") {
          throw new Error(`${MODULE_DISABLED} ${body.error.message ?? ""}`.trim());
        }
      } catch (error) {
        if (isModuleDisabled(error)) throw error;
        // Not our envelope — fall through to the generic message below.
      }
    }

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
