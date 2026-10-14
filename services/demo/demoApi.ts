/**
 * The demo-mode network: replaces global `fetch` while a demo session is
 * active (see demoMode.ts) and answers from the fixture routes.
 *
 * Every service reaches the network through global `fetch` — directly or via
 * services/api.ts — so swapping that one function covers the whole app.
 *
 * - A route in DEMO_ROUTES answers with its fixture.
 * - The public faculty news feed is the one thing passed through: it is public
 *   on the faculty website already, and real headlines read better than
 *   invented ones.
 * - Anything else on our gateway gets an empty success envelope — a list with
 *   nothing in it, or a write that "worked" — so a screen without a fixture
 *   shows its empty state, never an error.
 * - Any other host (PSU SSO, Microsoft Graph, ...) gets a 404 unless a route
 *   names it (the executive calendar's Google Calendar read).
 */
import { API_BASE_URL } from '../../constants/endpoints';
import { DEMO_ROUTES, type DemoRequest } from './fixtures';

/** Enough to show the screens' loaders for a moment, as a real network would. */
const LATENCY_MS = 250;

const PASS_THROUGH = [/\/api\/news$/];

let realFetch: typeof fetch | null = null;

export type DemoResult =
  | { status: number; body: unknown }
  | Record<string, unknown>
  | unknown[];

function isStatusResult(value: unknown): value is { status: number; body: unknown } {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { status?: unknown }).status === 'number' &&
    'body' in (value as object)
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return (input as Request).url ?? '';
}

function parseBody(body: unknown): Record<string, unknown> {
  if (typeof body !== 'string' || !body) return {};
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return Object.fromEntries(new URLSearchParams(body).entries());
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function demoFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const raw = requestUrl(input);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return jsonResponse({}, 404);
  }

  // The gateway may be mounted under a path (/scooba in production), so its
  // routes match the part after the base. Another host's match `//host/path`.
  const onGateway = raw.startsWith(API_BASE_URL);
  const basePath = new URL(API_BASE_URL).pathname.replace(/\/+$/, '');
  const path = onGateway
    ? url.pathname.slice(basePath.length)
    : `//${url.host}${url.pathname}`;

  if (onGateway && PASS_THROUGH.some((re) => re.test(path)) && realFetch) {
    return realFetch(input, init);
  }

  const method = (init?.method ?? 'GET').toUpperCase();
  const request: DemoRequest = {
    path,
    method,
    query: Object.fromEntries(url.searchParams.entries()),
    body: parseBody(init?.body),
  };

  await wait(LATENCY_MS);

  for (const [pattern, handler, routeMethod] of DEMO_ROUTES) {
    if (routeMethod && routeMethod !== method) continue;
    if (!pattern.test(path)) continue;
    const result = handler(request);
    if (result === undefined) continue;
    return isStatusResult(result) ? jsonResponse(result.body, result.status) : jsonResponse(result);
  }

  if (__DEV__) {
    // Read by a test run to find screens still running on the fallback.
    const seen = ((globalThis as { __demoUnhandled?: string[] }).__demoUnhandled ??= []);
    seen.push(`${method} ${path}`);
  }
  if (!onGateway) {
    return jsonResponse({}, 404);
  }
  if (method === 'GET' || method === 'HEAD') {
    return jsonResponse({ success: true, message: '', data: [], total_count: 0 });
  }
  return jsonResponse({ success: true, message: 'บันทึกข้อมูลเรียบร้อย', data: {} });
}

export function installDemoFetch() {
  if (realFetch) return;
  realFetch = globalThis.fetch;
  globalThis.fetch = demoFetch as typeof fetch;
}

export function uninstallDemoFetch() {
  if (!realFetch) return;
  globalThis.fetch = realFetch;
  realFetch = null;
}
